import mongoose, { Document, Schema } from 'mongoose';

export type BidStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface IBid extends Document {
  _id: mongoose.Types.ObjectId;
  loadId: string;
  carrierId: string;
  priceUSD: number;
  estimatedDeliveryHours: number;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bidSchema = new Schema<IBid>(
  {
    loadId: {
      type: String,
      required: true,
      index: true,
    },
    carrierId: {
      type: String,
      required: true,
      index: true,
    },
    priceUSD: {
      type: Number,
      required: true,
    },
    estimatedDeliveryHours: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  },
);

bidSchema.index({ loadId: 1, carrierId: 1 }, { unique: true });

export const Bid = mongoose.model<IBid>('Bid', bidSchema);
