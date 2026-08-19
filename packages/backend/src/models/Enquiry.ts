import mongoose, { Schema, type Document } from 'mongoose';

export interface IEnquiry extends Document {
  name: string;
  email: string;
  phone: string;
  service: string;
  message?: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

enquirySchema.index({ email: 1, createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
