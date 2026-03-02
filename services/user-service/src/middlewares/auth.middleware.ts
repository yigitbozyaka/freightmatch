// Copy this file to other services as-is for JWT validation
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, ErrorCode, TokenPayload } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: ErrorCode.UNAUTHORIZED,
      message: 'Missing or invalid authorization header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: ErrorCode.UNAUTHORIZED,
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
    });
  }
}

export function authorize(...allowedRoles: Array<'Shipper' | 'Carrier'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: ErrorCode.FORBIDDEN,
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
