import mongoose, { Document, Schema } from 'mongoose';

export interface ICarrierRecommendation {
  carrierId: string;
  score: number;
  reason: string;
}

export interface IRecommendation extends Document {
  _id: mongoose.Types.ObjectId;
  loadId: string;
  recommendations: ICarrierRecommendation[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const carrierRecommendationSchema = new Schema<ICarrierRecommendation>(
  {
    carrierId: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, required: true },
  },
  { _id: false },
);

const recommendationSchema = new Schema<IRecommendation>(
  {
    loadId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    recommendations: {
      type: [carrierRecommendationSchema],
      default: [],
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Recommendation = mongoose.model<IRecommendation>('Recommendation', recommendationSchema);
