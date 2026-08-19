import mongoose, { Schema, type Document } from 'mongoose';

export interface IEmployeeMaster extends Document {
  employee_code: string;
  full_name: string;
  dob: Date;
  designation: string;
  department: string;
  office: string;
  circle: string;
  division: string;
  range: string;
  district: string;
  registered_mobile: string;
  official_email: string;
  employment_status: 'ACTIVE' | 'RETIRED' | 'SUSPENDED' | 'TRANSFERRED' | 'INACTIVE' | 'DEACTIVATED';
  registration_status: 'NOT_REGISTERED' | 'PENDING' | 'REGISTERED' | 'REJECTED';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const employeeMasterSchema = new Schema<IEmployeeMaster>(
  {
    employee_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    office: {
      type: String,
      trim: true,
    },
    circle: {
      type: String,
      trim: true,
    },
    division: {
      type: String,
      trim: true,
    },
    range: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    registered_mobile: {
      type: String,
      required: true,
      trim: true,
    },
    official_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    employment_status: {
      type: String,
      enum: ['ACTIVE', 'RETIRED', 'SUSPENDED', 'TRANSFERRED', 'INACTIVE', 'DEACTIVATED'],
      default: 'ACTIVE',
    },
    registration_status: {
      type: String,
      enum: ['NOT_REGISTERED', 'PENDING', 'REGISTERED', 'REJECTED'],
      default: 'NOT_REGISTERED',
    },
    is_active: {
      type: Boolean,
      default: true,
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

employeeMasterSchema.pre('save', function () {
  this.updated_at = new Date() as unknown as Date;
});

employeeMasterSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.registered_mobile && String(obj.registered_mobile).length > 4) {
    obj.registered_mobile = '****' + String(obj.registered_mobile).slice(-4);
  } else {
    obj.registered_mobile = undefined;
  }
  return obj;
};

export const EmployeeMaster = mongoose.model<IEmployeeMaster>('EmployeeMaster', employeeMasterSchema);
