import mongoose, { Schema, type Document } from 'mongoose';

export interface ICaptchaChallenge extends Document {
  challenge_id: string;
  challenge_text: string;
  solution: string;
  ip_address: string;
  created_at: Date;
  expires_at: Date;
  attempts: number;
}

const captchaChallengeSchema = new Schema<ICaptchaChallenge>(
  {
    challenge_id: {
      type: String,
      required: true,
      unique: true,
    },
    challenge_text: {
      type: String,
      required: true,
    },
    solution: {
      type: String,
      required: true,
    },
    ip_address: {
      type: String,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
  }
);

export const CaptchaChallenge = mongoose.model<ICaptchaChallenge>('CaptchaChallenge', captchaChallengeSchema);
