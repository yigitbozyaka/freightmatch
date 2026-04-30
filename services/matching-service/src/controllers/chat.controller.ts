import { Request, Response, NextFunction } from 'express';
import { chat } from '../services/chat.service';

export class ChatController {
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, conversationHistory } = req.body;
      const result = await chat(message, conversationHistory);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
