import mongoose, { Schema, type Document } from 'mongoose';

export interface IUserAccount extends Document {
  user: mongoose.Types.ObjectId;
  employee_master: mongoose.Types.ObjectId;
  employee_code: string;
  created_at: Date;
  updated_at: Date;
}

const userAccountSchema = new Schema<IUserAccount>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employee_master: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeMaster',
      required: true,
      index: true,
    },
    employee_code: {
      type: String,
      required: true,
      trim: true,
      index: true,
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

userAccountSchema.index({ user: 1, employee_master: 1 }, { unique: true });

userAccountSchema.pre('save', function () {
  this.updated_at = new Date() as unknown as Date;
});

export const UserAccount = mongoose.model<IUserAccount>('UserAccount', userAccountSchema);
