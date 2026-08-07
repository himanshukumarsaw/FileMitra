import mongoose, { Schema, type Document } from 'mongoose';

export interface ISensorData extends Document {
  nodeId: mongoose.Types.ObjectId;
  type: 'temperature' | 'humidity' | 'sound_level' | 'motion' | 'battery' | 'signal';
  value: number;
  unit: string;
  timestamp: Date;
}

const sensorDataSchema = new Schema<ISensorData>({
  nodeId: { type: Schema.Types.ObjectId, ref: 'Node', required: true },
  type: {
    type: String,
    enum: ['temperature', 'humidity', 'sound_level', 'motion', 'battery', 'signal'],
    required: true,
  },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

sensorDataSchema.index({ nodeId: 1, timestamp: -1 });
sensorDataSchema.index({ type: 1, timestamp: -1 });

export const SensorData = mongoose.model<ISensorData>('SensorData', sensorDataSchema);
