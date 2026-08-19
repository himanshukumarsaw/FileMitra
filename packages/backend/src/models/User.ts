import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'officer' | 'viewer' | 'employee';
  employee_code?: string;
  employee_master?: mongoose.Types.ObjectId;
  is_employee_portal?: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
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
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['admin', 'super_admin', 'department_admin', 'office_admin', 'officer', 'viewer', 'employee'],
      default: 'viewer',
    },
    employee_code: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      index: true,
    },
    employee_master: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeMaster',
      index: true,
    },
    is_employee_portal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>('User', userSchema);
