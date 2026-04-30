import { Request } from 'express';

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'Shipper' | 'Carrier';
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export interface ErrorResponse {
  error: ErrorCode;
  message: string;
  timestamp: string;
}

export interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
}
