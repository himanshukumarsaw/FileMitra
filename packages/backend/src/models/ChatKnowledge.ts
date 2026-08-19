import mongoose, { Schema, type Document } from 'mongoose';

export interface IChatKnowledge extends Document {
  category: 'project' | 'services' | 'tech' | 'contact' | 'demo' | 'pricing';
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const chatKnowledgeSchema = new Schema<IChatKnowledge>(
  {
    category: {
      type: String,
      enum: ['project', 'services', 'tech', 'contact', 'demo', 'pricing'],
      required: true,
    },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

chatKnowledgeSchema.index({ active: 1, priority: -1 });
chatKnowledgeSchema.index({ keywords: 1 });

export const ChatKnowledge = mongoose.model<IChatKnowledge>('ChatKnowledge', chatKnowledgeSchema);
