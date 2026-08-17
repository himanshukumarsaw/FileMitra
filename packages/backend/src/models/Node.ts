import mongoose, { Schema, type Document } from 'mongoose';

export interface INode extends Document {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  batteryLevel: number;
  solarCharging: boolean;
  status: 'online' | 'offline' | 'warning';
  lastSeen: Date;
  signalStrength: number;
  firmwareVersion: string;
  zone: string;
  hardwareModel: string;
  /** Intelligent power management duty cycle */
  powerMode: 'normal' | 'suspicious' | 'critical';
  /** Instantaneous solar panel input (watts) */
  solarInputW: number;
  createdAt: Date;
  updatedAt: Date;
}

const nodeSchema = new Schema<INode>(
  {
    name: { type: String, required: true, unique: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    batteryLevel: { type: Number, min: 0, max: 100, default: 100 },
    solarCharging: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['online', 'offline', 'warning'],
      default: 'online',
    },
    lastSeen: { type: Date, default: Date.now },
    signalStrength: { type: Number, default: -70 },
    firmwareVersion: { type: String, default: '1.0.0' },
    zone: { type: String, required: true },
    hardwareModel: { type: String, default: 'ESP32-CAM' },
    powerMode: { type: String, enum: ['normal', 'suspicious', 'critical'], default: 'normal' },
    solarInputW: { type: Number, default: 0 },
  },
  { timestamps: true }
);

nodeSchema.index({ location: '2dsphere' });
nodeSchema.index({ zone: 1 });
nodeSchema.index({ status: 1 });

export const Node = mongoose.model<INode>('Node', nodeSchema);
