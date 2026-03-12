import mongoose, { Document, Schema } from 'mongoose';

export type TruckType = 'flatbed' | 'refrigerated' | 'dry-van' | 'tanker';

export interface ICarrierProfile {
  truckType: TruckType;
  capacityKg: number;
  homeCity: string;
  rating: number;
  completedShipments: number;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: 'Shipper' | 'Carrier';
  carrierProfile?: ICarrierProfile;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['Shipper', 'Carrier'],
    },
    carrierProfile: {
      type: {
        truckType: {
          type: String,
          required: true,
          enum: ['flatbed', 'refrigerated', 'dry-van', 'tanker'],
        },
        capacityKg: {
          type: Number,
          required: true,
        },
        homeCity: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        completedShipments: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      required: false,
      _id: false,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>('User', userSchema);
