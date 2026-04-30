import mongoose, { Document, Schema } from 'mongoose';

export type TruckType = 'flatbed' | 'refrigerated' | 'dry-van' | 'tanker';

export interface ICarrierProfile {
  truckType: TruckType;
  capacityKg: number;
  homeCity: string;
  rating: number;
  completedShipments: number;
  profilePhotoUrl: string | null;
  avgEtaHours: number;
  trustScore: number;
  bio: string | null;
}

export interface IShipperProfile {
  companyName: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  completedLoads: number;
  avgTimeToAcceptHours: number;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: 'Shipper' | 'Carrier';
  carrierProfile?: ICarrierProfile;
  shipperProfile?: IShipperProfile;
  failedLoginAttempts: number;
  lockUntil: Date | null;
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
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
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
        profilePhotoUrl: {
          type: String,
          default: null,
        },
        avgEtaHours: {
          type: Number,
          default: 0,
          min: 0,
        },
        trustScore: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        bio: {
          type: String,
          default: null,
        },
      },
      required: false,
      _id: false,
    },
    shipperProfile: {
      type: {
        companyName: {
          type: String,
          default: null,
        },
        profilePhotoUrl: {
          type: String,
          default: null,
        },
        bio: {
          type: String,
          default: null,
        },
        completedLoads: {
          type: Number,
          default: 0,
          min: 0,
        },
        avgTimeToAcceptHours: {
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
