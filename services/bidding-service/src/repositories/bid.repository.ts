import { ClientSession } from 'mongoose';
import { Bid, IBid, BidStatus } from '../models/bid.model';

export class BidRepository {
  async create(data: {
    loadId: string;
    carrierId: string;
    priceUSD: number;
    estimatedDeliveryHours: number;
    status?: BidStatus;
  }): Promise<IBid> {
    return Bid.create(data);
  }

  async findById(id: string): Promise<IBid | null> {
    return Bid.findById(id);
  }

  async findByLoadId(loadId: string): Promise<IBid[]> {
    return Bid.find({ loadId }).sort({ createdAt: -1 });
  }

  async findByCarrierId(carrierId: string): Promise<IBid[]> {
    return Bid.find({ carrierId }).sort({ createdAt: -1 });
  }

  async findByLoadAndCarrier(loadId: string, carrierId: string): Promise<IBid | null> {
    return Bid.findOne({ loadId, carrierId });
  }

  async updateStatus(id: string, status: BidStatus, session?: ClientSession): Promise<IBid | null> {
    return Bid.findByIdAndUpdate(id, { status }, { new: true, session });
  }

  async rejectAllExcept(loadId: string, acceptedBidId: string, session?: ClientSession): Promise<void> {
    await Bid.updateMany(
      { loadId, _id: { $ne: acceptedBidId }, status: 'Pending' },
      { status: 'Rejected' },
      { session },
    );
  }
}

export const bidRepository = new BidRepository();
