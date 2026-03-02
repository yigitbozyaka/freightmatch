import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { userService } from '../services/user.service';

export class UserController {
  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await userService.getById(id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
