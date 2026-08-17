import mongoose, { Schema, type Document } from 'mongoose';

export interface IAlert extends Document {
  type: 'human' | 'animal' | 'vehicle' | 'fire';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  imageUrl?: string;
  audioUrl?: string;
  explanation: {
    summary: string;
    factors: Array<{
      name: string;
      description: string;
      weight: number;
    }>;
    confidenceBreakdown: {
      visual: number;
      audio: number;
      motion: number;
      contextual: number;
    };
  };
  nodeId: mongoose.Types.ObjectId;
  timestamp: Date;
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  species?: string;
  description?: string;
  soundType?: 'chainsaw' | 'engine' | 'gunshot' | 'vehicle' | 'animal_call' | 'fire_crackle' | 'ambient' | 'tamper' | 'unknown';
  /** Alerts correlated into one incident (multi-node triangulation) share this id */
  incidentId?: string;
  /** Threat-confidence engine: suspicious until corroborated by a second node/camera */
  verificationStatus?: 'suspicious' | 'confirmed';
  /** Node ids that corroborated this incident */
  confirmingNodes?: string[];
  /** Objects identified by visual AI on the captured frame */
  visualLabels?: string[];
  /** Human-in-the-loop officer feedback */
  feedback?: 'genuine' | 'false_alarm';
  /** When an officer acknowledged the alert */
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    type: { type: String, enum: ['human', 'animal', 'vehicle', 'fire'], required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    imageUrl: String,
    audioUrl: String,
    explanation: {
      summary: String,
      factors: [{ name: String, description: String, weight: Number }],
      confidenceBreakdown: {
        visual: Number,
        audio: Number,
        motion: Number,
        contextual: Number,
      },
    },
    nodeId: { type: Schema.Types.ObjectId, ref: 'Node', required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'resolved', 'dismissed'],
      default: 'new',
    },
    species: String,
    description: String,
    soundType: {
      type: String,
      enum: ['chainsaw', 'engine', 'gunshot', 'vehicle', 'animal_call', 'fire_crackle', 'ambient', 'tamper', 'unknown'],
    },
    incidentId: { type: String, index: true },
    verificationStatus: { type: String, enum: ['suspicious', 'confirmed'], default: 'suspicious' },
    confirmingNodes: [{ type: String }],
    visualLabels: [{ type: String }],
    feedback: { type: String, enum: ['genuine', 'false_alarm'] },
    acknowledgedAt: Date,
  },
  { timestamps: true }
);

// Indexes for common queries
alertSchema.index({ severity: 1, timestamp: -1 });
alertSchema.index({ type: 1, timestamp: -1 });
alertSchema.index({ nodeId: 1, timestamp: -1 });
alertSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ location: '2dsphere' });

export const Alert = mongoose.model<IAlert>('Alert', alertSchema);
