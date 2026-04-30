import { Request, Response, NextFunction } from 'express';
import { loadService } from '../services/load.service';
import { AuthRequest } from '../types';

export class LoadController {
  async createLoad(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');
      
      const load = await loadService.createLoad(req.user.userId, req.body);
      res.status(201).json(load);
    } catch (error) {
      next(error);
    }
  }

  async getLoadById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const load = await loadService.getLoadById(req.params.id);
      res.status(200).json(load);
    } catch (error) {
      next(error);
    }
  }

  async updateLoad(req: AuthRequest & { params: { id: string } }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const load = await loadService.updateLoad(req.params.id, req.user.userId, req.body);
      res.status(200).json(load);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest & { params: { id: string } }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const { status } = req.body;
      const load = await loadService.updateStatus(req.params.id, req.user.userId, status);
      res.status(200).json(load);
    } catch (error) {
      next(error);
    }
  }

  async deleteLoad(req: AuthRequest & { params: { id: string } }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      await loadService.deleteLoad(req.params.id, req.user.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getAvailableLoads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as { origin?: string; destination?: string; cargoType?: string };
      const loads = await loadService.getAvailableLoads(filters);
      res.status(200).json(loads);
    } catch (error) {
      next(error);
    }
  }

  async getMyLoads(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const loads = await loadService.getLoadsByShipper(req.user.userId);
      res.status(200).json(loads);
    } catch (error) {
      next(error);
    }
  }
}

export const loadController = new LoadController();
