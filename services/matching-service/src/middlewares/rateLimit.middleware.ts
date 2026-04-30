import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  },
});

export const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for AI chat (costly API calls)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many chat requests, please try again later',
    timestamp: new Date().toISOString(),
  },
});
