import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { ErrorCode, TokenPayload } from '../types';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthService {
  async register(email: string, password: string, role: 'Shipper' | 'Carrier') {
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 401;
      error.errorCode = ErrorCode.UNAUTHORIZED;
      throw error;
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
}

export const authService = new AuthService();
