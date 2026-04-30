import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { ErrorCode, TokenPayload } from '../types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory token blacklist (use Redis in production for multi-instance)
const tokenBlacklist = new Set<string>();

function validatePasswordComplexity(password: string): void {
  const errors: string[] = [];

  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('at least one special character');

  if (errors.length > 0) {
    const error = new Error(`Password must contain: ${errors.join(', ')}`) as Error & {
      statusCode: number;
      errorCode: string;
    };
    error.statusCode = 400;
    error.errorCode = ErrorCode.VALIDATION_ERROR;
    throw error;
  }
}

export class AuthService {
  async register(email: string, password: string, role: 'Shipper' | 'Carrier') {
    validatePasswordComplexity(password);

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const error = new Error('Email already registered') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 409;
      error.errorCode = ErrorCode.CONFLICT;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({ email: email.toLowerCase(), passwordHash, role });

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 401;
      error.errorCode = ErrorCode.UNAUTHORIZED;
      throw error;
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      const error = new Error(
        `Account locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`,
      ) as Error & { statusCode: number; errorCode: string };
      error.statusCode = 423;
      error.errorCode = ErrorCode.TOO_MANY_REQUESTS;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update: { failedLoginAttempts: number; lockUntil?: Date } = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }

      await userRepository.updateLoginAttempts(user._id.toString(), update);

      const error = new Error('Invalid email or password') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 401;
      error.errorCode = ErrorCode.UNAUTHORIZED;
      throw error;
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await userRepository.updateLoginAttempts(user._id.toString(), {
        failedLoginAttempts: 0,
        lockUntil: undefined,
      });
    }

    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (tokenBlacklist.has(refreshToken)) {
      const error = new Error('Token has been revoked') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 401;
      error.errorCode = ErrorCode.UNAUTHORIZED;
      throw error;
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;

      const payload: TokenPayload = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

      return { accessToken };
    } catch {
      const error = new Error('Invalid or expired refresh token') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 401;
      error.errorCode = ErrorCode.UNAUTHORIZED;
      throw error;
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    tokenBlacklist.add(accessToken);
    if (refreshToken) {
      tokenBlacklist.add(refreshToken);
    }
    return { message: 'Logged out successfully' };
  }

  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }
}

export const authService = new AuthService();
