import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ErrorCode } from '../types';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const internalSecret = req.headers['x-internal-secret'];

  if (!internalSecret || internalSecret !== env.INTERNAL_SERVICE_SECRET) {
    res.status(403).json({
      error: ErrorCode.FORBIDDEN,
      message: 'Internal access only',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
