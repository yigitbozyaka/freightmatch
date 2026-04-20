import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  },
});

export const bidRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for bid submissions
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many bid submissions, please try again later',
    timestamp: new Date().toISOString(),
  },
});
