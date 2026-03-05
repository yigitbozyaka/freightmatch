import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { userService } from '../services/user.service';
import { Request } from 'express';

export class CarrierController {
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await userService.upsertCarrierProfile(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const carriers = await userService.getAllCarriers();
      res.status(200).json(carriers);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const carrier = await userService.getCarrierById(id);
      res.status(200).json(carrier);
    } catch (error) {
      next(error);
    }
  }
}

export const carrierController = new CarrierController();
