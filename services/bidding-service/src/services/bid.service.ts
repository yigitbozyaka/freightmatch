import mongoose from 'mongoose';
import axios from 'axios';
import { KAFKA_TOPICS } from '@freightmatch/contracts';
import { bidRepository } from '../repositories/bid.repository';
import { ErrorCode } from '../types';
import { env } from '../config/env';
import { publishEvent } from '../kafka/producer';

export class BidService {
  async createBid(carrierId: string, data: {
    loadId: string;
    priceUSD: number;
    estimatedDeliveryHours: number;
  }) {
    const existingBid = await bidRepository.findByLoadAndCarrier(data.loadId, carrierId);
    if (existingBid) {
      const error = new Error('You have already placed a bid on this load') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 409;
      error.errorCode = ErrorCode.CONFLICT;
      throw error;
    }

    const load = await this.fetchLoad(data.loadId);

    if (load.status !== 'Posted') {
      const error = new Error('Bids can only be placed on Posted loads') as Error & {
        statusCode: number;
        errorCode: string;
      };
      error.statusCode = 400;
      error.errorCode = ErrorCode.VALIDATION_ERROR;
      throw error;
    }

    return bidRepository.create({
      ...data,
      carrierId,
      status: 'Pending',
    });
  }

  async getBidsByLoad(loadId: string) {
    return bidRepository.findByLoadId(loadId);
  }

  async getMyBids(carrierId: string) {
    return bidRepository.findByCarrierId(carrierId);
  }

  async acceptBid(bidId: string, shipperId: string) {
    const bid = await bidRepository.findById(bidId);
    if (!bid) {
      const error = new Error('Bid not found') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 404;
      error.errorCode = ErrorCode.NOT_FOUND;
      throw error;
    }

    if (bid.status !== 'Pending') {
      const error = new Error('Only pending bids can be accepted') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 400;
      error.errorCode = ErrorCode.VALIDATION_ERROR;
      throw error;
    }

    const load = await this.fetchLoad(bid.loadId);

    if (load.shipperId !== shipperId) {
      const error = new Error('Only the load owner can accept bids') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 403;
      error.errorCode = ErrorCode.FORBIDDEN;
      throw error;
    }

    const session = await mongoose.startSession();
    let acceptedBid;

    try {
      await session.withTransaction(async () => {
        acceptedBid = await bidRepository.updateStatus(bidId, 'Accepted', session);
        await bidRepository.rejectAllExcept(bid.loadId, bidId, session);

        await publishEvent(KAFKA_TOPICS.BID_ACCEPTED, {
          eventType: KAFKA_TOPICS.BID_ACCEPTED,
          bidId: bid._id.toString(),
          loadId: bid.loadId,
          carrierId: bid.carrierId,
          priceUSD: bid.priceUSD,
          timestamp: new Date().toISOString(),
        });
      });
    } finally {
      await session.endSession();
    }

    return acceptedBid;
  }

  private async fetchLoad(loadId: string): Promise<{ shipperId: string; status: string }> {
    try {
      const response = await axios.get(`${env.LOAD_SERVICE_URL}/api/loads/${loadId}`, {
        headers: { 'x-internal-request': 'true' },
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        const error = new Error('Load not found') as Error & { statusCode: number; errorCode: string };
        error.statusCode = 404;
        error.errorCode = ErrorCode.NOT_FOUND;
        throw error;
      }
      const error = new Error('Failed to fetch load from load-service') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 502;
      error.errorCode = ErrorCode.INTERNAL_ERROR;
      throw error;
    }
  }
}

export const bidService = new BidService();
