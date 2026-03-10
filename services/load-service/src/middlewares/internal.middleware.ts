import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const internalHeader = req.headers['x-internal-request'];

  if (!internalHeader) {
    res.status(403).json({
      error: ErrorCode.FORBIDDEN,
      message: 'Internal access only',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
