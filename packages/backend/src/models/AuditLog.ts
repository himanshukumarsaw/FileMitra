import mongoose, { Schema, type Document } from 'mongoose';

export interface IAuditLog extends Document {
  user_id: string | null;
  employee_code: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  success: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user_id: {
      type: String,
      default: null,
    },
    employee_code: {
      type: String,
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      required: true,
      index: true,
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    success: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
