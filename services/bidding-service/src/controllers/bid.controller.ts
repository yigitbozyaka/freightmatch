import { Response, NextFunction } from 'express';
import { bidService } from '../services/bid.service';
import { AuthRequest } from '../types';

export class BidController {
  async createBid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const bid = await bidService.createBid(req.user.userId, req.body);
      res.status(201).json(bid);
    } catch (error) {
      next(error);
    }
  }

  async getBidsByLoad(req: AuthRequest & { params: { loadId: string } }, res: Response, next: NextFunction): Promise<void> {
    try {
      const bids = await bidService.getBidsByLoad(req.params.loadId);
      res.status(200).json(bids);
    } catch (error) {
      next(error);
    }
  }

  async acceptBid(req: AuthRequest & { params: { bidId: string } }, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const bid = await bidService.acceptBid(req.params.bidId, req.user.userId);
      res.status(200).json(bid);
    } catch (error) {
      next(error);
    }
  }

  async getMyBids(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new Error('Unauthorized');

      const bids = await bidService.getMyBids(req.user.userId);
      res.status(200).json(bids);
    } catch (error) {
      next(error);
    }
  }
}

export const bidController = new BidController();
