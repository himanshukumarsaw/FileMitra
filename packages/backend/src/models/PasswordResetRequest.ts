import mongoose, { Schema, type Document } from 'mongoose';

export interface IPasswordResetRequest extends Document {
  employee_code: string;
  full_name: string;
  otp_hash: string;
  otp_sent_at: Date;
  otp_expires_at: Date;
  otp_attempts: number;
  max_otp_attempts: number;
  is_locked: boolean;
  locked_at: Date;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  updated_at: Date;
}

const passwordResetRequestSchema = new Schema<IPasswordResetRequest>(
  {
    employee_code: {
      type: String,
      required: true,
      index: true,
    },
    full_name: {
      type: String,
      required: true,
    },
    otp_hash: {
      type: String,
      select: false,
    },
    otp_sent_at: {
      type: Date,
    },
    otp_expires_at: {
      type: Date,
    },
    otp_attempts: {
      type: Number,
      default: 0,
    },
    max_otp_attempts: {
      type: Number,
      default: 3,
    },
    is_locked: {
      type: Boolean,
      default: false,
    },
    locked_at: {
      type: Date,
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

passwordResetRequestSchema.index({ employee_code: 1, created_at: -1 });

passwordResetRequestSchema.pre('save', function () {
  this.updated_at = new Date() as unknown as Date;
});

passwordResetRequestSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp_hash;
  return obj;
};

export const PasswordResetRequest = mongoose.model<IPasswordResetRequest>(
  'PasswordResetRequest',
  passwordResetRequestSchema
);
