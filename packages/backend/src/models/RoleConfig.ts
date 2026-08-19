import mongoose, { Schema, type Document } from 'mongoose';

export interface IRoleConfig extends Document {
  role: 'admin' | 'forest_officer' | 'ranger' | 'analyst';
  label: string;
  description: string;
  permissions: string[];
  dashboardCards: string[];
  menuItems: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleConfigSchema = new Schema<IRoleConfig>(
  {
    role: {
      type: String,
      enum: ['admin', 'forest_officer', 'ranger', 'analyst'],
      required: true,
      unique: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    permissions: [{ type: String, trim: true }],
    dashboardCards: [{ type: String, trim: true }],
    menuItems: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const RoleConfig = mongoose.model<IRoleConfig>('RoleConfig', roleConfigSchema);
