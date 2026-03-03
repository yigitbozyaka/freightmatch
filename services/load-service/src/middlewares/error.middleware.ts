import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorCode.INTERNAL_ERROR;
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: errorCode,
    message,
    timestamp: new Date().toISOString(),
  });
}
