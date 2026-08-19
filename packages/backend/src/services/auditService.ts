import { AuditLog } from '../models/AuditLog.js';

export async function log(eventType: string, options: {
  userId?: string;
  employeeCode?: string;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const entry = await AuditLog.create({
    user_id: options.userId || null,
    employee_code: options.employeeCode || 'system',
    event_type: eventType,
    ip_address: options.ipAddress || '',
    user_agent: options.userAgent || '',
    timestamp: new Date(),
    success: options.success ?? false,
    metadata: options.metadata || {},
  });

  return entry;
}

export async function getLogs(filters: {
  eventType?: string;
  employeeCode?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const query: Record<string, unknown> = {};

  if (filters.eventType) {
    query.event_type = filters.eventType;
  }

  if (filters.employeeCode) {
    query.employee_code = filters.employeeCode;
  }

  if (filters.startDate || filters.endDate) {
    query.timestamp = {} as Record<string, Date>;
    if (filters.startDate) {
      (query.timestamp as Record<string, Date>).$gte = filters.startDate;
    }
    if (filters.endDate) {
      (query.timestamp as Record<string, Date>).$lte = filters.endDate;
    }
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).limit(limit).skip(offset),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
  };
}
