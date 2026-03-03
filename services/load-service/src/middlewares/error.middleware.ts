import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '../types';

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorCode.INTERNAL_ERROR;

  res.status(statusCode).json({
    error: errorCode,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
}
