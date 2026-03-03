import mongoose, { Document, Schema } from 'mongoose';

export interface ILoad extends Document {
  _id: mongoose.Types.ObjectId;
  shipperId: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  status: 'Draft' | 'Posted' | 'Matched' | 'InTransit' | 'Delivered' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const loadSchema = new Schema<ILoad>(
  {
    shipperId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    cargoType: {
      type: String,
      required: true,
    },
    weightKg: {
      type: Number,
      required: true,
    },
    deadlineHours: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Posted', 'Matched', 'InTransit', 'Delivered', 'Cancelled'],
      default: 'Draft',
    },
  },
  {
    timestamps: true,
  },
);

export const Load = mongoose.model<ILoad>('Load', loadSchema);
