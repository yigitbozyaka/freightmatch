import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { authRateLimiter } from '../middlewares/rateLimit.middleware';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Shipper', 'Carrier'], { errorMap: () => ({ message: 'Role must be Shipper or Carrier' }) }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);

export default router;
