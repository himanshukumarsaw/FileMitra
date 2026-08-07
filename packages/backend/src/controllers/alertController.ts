import { type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Alert } from '../models/Alert.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { processAlert, type IncomingAlert } from '../services/alertProcessor.js';
import { emitAlertUpdated } from '../services/realtime.js';

/** GET /api/alerts — list alerts with filters and pagination */
export async function listAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      severity,
      type,
      status,
      nodeId,
      startDate,
      endDate,
      page = '1',
      limit = '20',
      sort = '-timestamp',
    } = req.query;

    const filter: Record<string, unknown> = {};
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (nodeId && mongoose.Types.ObjectId.isValid(nodeId as string)) {
      filter.nodeId = nodeId;
    }
    if (startDate || endDate) {
      const ts: Record<string, Date> = {};
      if (startDate) ts.$gte = new Date(startDate as string);
      if (endDate) ts.$lte = new Date(endDate as string);
      filter.timestamp = ts;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort(sort as string).skip(skip).limit(limitNum).lean(),
      Alert.countDocuments(filter),
    ]);

    res.json({
      alerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/alerts/stats — alert statistics summary */
export async function getAlertStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [bySeverity, byType, totalToday, totalAll] = await Promise.all([
      Alert.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Alert.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Alert.countDocuments({ timestamp: { $gte: today } }),
      Alert.countDocuments({}),
    ]);

    const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of bySeverity) severityCounts[row._id] = row.count;

    const typeCounts: Record<string, number> = { human: 0, animal: 0, vehicle: 0 };
    for (const row of byType) typeCounts[row._id] = row.count;

    res.json({
      bySeverity: severityCounts,
      byType: typeCounts,
      totalToday,
      totalAll,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/alerts/:id — single alert */
export async function getAlertById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await Alert.findById(req.params.id).populate('nodeId');
    if (!alert) throw new AppError('Alert not found', 404);
    res.json(alert);
  } catch (err) {
    next(err);
  }
}

/** POST /api/alerts — create alert (admin/officer only) */
export async function createAlert(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, severity, confidence, location, nodeId, species, description, imageUrl, audioUrl } = req.body;

    if (!type || !confidence || !location || !nodeId) {
      throw new AppError('Missing required fields: type, confidence, location, nodeId', 400);
    }

    // If severity is supplied use processAlert (classifier), else fall through
    const incoming: IncomingAlert = {
      type,
      confidence,
      location: { lat: location.lat ?? location.coordinates?.[1], lng: location.lng ?? location.coordinates?.[0] },
      nodeId,
      species,
      description,
      imageUrl,
      audioUrl,
    };

    const alert = await processAlert(incoming);
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/alerts/:id/status — update alert status */
export async function updateAlertStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    const allowed = ['acknowledged', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) {
      throw new AppError(`Status must be one of: ${allowed.join(', ')}`, 400);
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!alert) throw new AppError('Alert not found', 404);

    emitAlertUpdated(alert);
    res.json(alert);
  } catch (err) {
    next(err);
  }
}

/** POST /api/alerts/bulk-action — bulk status update */
export async function bulkAction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { alertIds, status } = req.body;
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      throw new AppError('alertIds must be a non-empty array', 400);
    }
    const allowed = ['acknowledged', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) {
      throw new AppError(`Status must be one of: ${allowed.join(', ')}`, 400);
    }

    const result = await Alert.updateMany(
      { _id: { $in: alertIds } },
      { $set: { status } }
    );

    res.json({ modified: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}
