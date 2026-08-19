import mongoose, { Schema, type Document } from 'mongoose';

export interface IRegistrationRequest extends Document {
  employee_code: string;
  full_name: string;
  dob: Date;
  registered_mobile_last4: string;
  otp_code: string;
  otp_sent_at: Date;
  otp_expires_at: Date;
  otp_attempts: number;
  max_otp_attempts: number;
  status: 'PENDING' | 'OTP_VERIFIED' | 'ACCOUNT_CREATED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  ip_address: string;
  user_agent: string;
  captcha_token: string;
  verification_attempts: number;
  max_verification_attempts: number;
  is_locked: boolean;
  locked_at: Date;
  created_at: Date;
  updated_at: Date;
}

const registrationRequestSchema = new Schema<IRegistrationRequest>(
  {
    employee_code: {
      type: String,
      required: true,
      ref: 'EmployeeMaster',
      index: true,
    },
    full_name: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    registered_mobile_last4: {
      type: String,
      required: true,
    },
    otp_code: {
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
    status: {
      type: String,
      enum: ['PENDING', 'OTP_VERIFIED', 'ACCOUNT_CREATED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
    captcha_token: {
      type: String,
    },
    verification_attempts: {
      type: Number,
      default: 0,
    },
    max_verification_attempts: {
      type: Number,
      default: 5,
    },
    is_locked: {
      type: Boolean,
      default: false,
    },
    locked_at: {
      type: Date,
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

registrationRequestSchema.index({ employee_code: 1, status: 1 });

registrationRequestSchema.pre('save', function () {
  this.updated_at = new Date() as unknown as Date;
});

registrationRequestSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp_code;
  return obj;
};

export const RegistrationRequest = mongoose.model<IRegistrationRequest>('RegistrationRequest', registrationRequestSchema);
