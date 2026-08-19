import mongoose, { Schema, type Document } from 'mongoose';

export interface IHomeNews extends Document {
  tag: string;
  title: string;
  time: string;
  icon: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const homeNewsSchema = new Schema<IHomeNews>(
  {
    tag: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

homeNewsSchema.index({ active: 1, createdAt: -1 });

export const HomeNews = mongoose.model<IHomeNews>('HomeNews', homeNewsSchema);
