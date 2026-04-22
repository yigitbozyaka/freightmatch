import rateLimit from 'express-rate-limit';
import { ErrorCode } from '../types';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: ErrorCode.TOO_MANY_REQUESTS,
    message: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  },
});
