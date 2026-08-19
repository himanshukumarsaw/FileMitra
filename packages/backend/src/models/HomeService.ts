import mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

export interface IHomeService extends Document {
  icon: string;
  title: string;
  description: string;
  price: string;
  popular: boolean;
  features: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const homeServiceSchema = new Schema<IHomeService>(
  {
    icon: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: String, required: true },
    popular: { type: Boolean, default: false },
    features: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

homeServiceSchema.index({ active: 1, createdAt: -1 });
export const HomeService = mongoose.model<IHomeService>('HomeService', homeServiceSchema);