import mongoose, { Document, Schema } from 'mongoose';

export type LoadStatus = 'Draft' | 'Posted' | 'Matched' | 'InTransit' | 'Delivered' | 'Cancelled';

export const VALID_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  Draft: ['Posted', 'Cancelled'],
  Posted: ['Matched', 'Cancelled'],
  Matched: ['InTransit', 'Cancelled'],
  InTransit: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export interface IStatusHistoryEntry {
  from: LoadStatus | null;
  to: LoadStatus;
  timestamp: Date;
}

export interface ILoad extends Document {
  _id: mongoose.Types.ObjectId;
  shipperId: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  status: LoadStatus;
  statusHistory: IStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

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
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Load = mongoose.model<ILoad>('Load', loadSchema);
