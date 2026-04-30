import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { chatRateLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post(
  '/',
  chatRateLimiter,
  authenticate,
  chatController.sendMessage,
);

export const chatRouter: Router = router;
