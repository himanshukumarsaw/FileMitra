import mongoose, { Schema, type Document } from 'mongoose';

export interface IDispatch extends Document {
  alertId: mongoose.Types.ObjectId;
  /** Alerts correlated into the same incident share this id */
  incidentId?: string;
  alertType: 'human' | 'animal' | 'vehicle' | 'fire';
  severity: 'low' | 'medium' | 'high' | 'critical';
  soundType?: string;
  team: string;
  rangerPhone: string;
  zone: string;
  status: 'dispatched' | 'enroute' | 'onscene' | 'resolved';
  etaMinutes: number;
  coordinates: [number, number]; // [longitude, latitude]
  timeline: Array<{ at: Date; label: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const dispatchSchema = new Schema<IDispatch>(
  {
    alertId: { type: Schema.Types.ObjectId, ref: 'Alert', required: true },
    incidentId: { type: String, index: true },
    alertType: { type: String, enum: ['human', 'animal', 'vehicle', 'fire'], required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    soundType: String,
    team: { type: String, required: true },
    rangerPhone: String,
    zone: String,
    status: {
      type: String,
      enum: ['dispatched', 'enroute', 'onscene', 'resolved'],
      default: 'dispatched',
    },
    etaMinutes: Number,
    coordinates: { type: [Number], required: true },
    timeline: [{ at: Date, label: String }],
  },
  { timestamps: true }
);

dispatchSchema.index({ createdAt: -1 });

export const Dispatch = mongoose.model<IDispatch>('Dispatch', dispatchSchema);
