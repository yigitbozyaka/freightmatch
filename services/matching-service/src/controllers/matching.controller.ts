import { Request, Response, NextFunction } from 'express';
import { matchingService } from '../services/matching.service';

export class MatchingController {
  async getByLoadId(req: Request<{ loadId: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchingService.getByLoadId(req.params.loadId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async manualRecommend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { loadId, origin, destination, cargoType, weightKg, deadlineHours, shipperId } = req.body;

      const result = await matchingService.manualRecommend({
        eventType: 'load.created',
        loadId,
        origin,
        destination,
        cargoType,
        weightKg,
        deadlineHours,
        shipperId,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const matchingController = new MatchingController();
