import { type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { SensorData } from '../models/SensorData.js';
import type { AuthRequest } from '../middleware/auth.js';

/** GET /api/sensor-data — list sensor readings with filters */
export async function listSensorData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nodeId, type, startDate, endDate, limit = '100' } = req.query;
    const filter: Record<string, unknown> = {};

    if (nodeId && mongoose.Types.ObjectId.isValid(nodeId as string)) {
      filter.nodeId = nodeId;
    }
    if (type) filter.type = type;
    if (startDate || endDate) {
      const ts: Record<string, Date> = {};
      if (startDate) ts.$gte = new Date(startDate as string);
      if (endDate) ts.$lte = new Date(endDate as string);
      filter.timestamp = ts;
    }

    const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10)));
    const data = await SensorData.find(filter)
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .lean();

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/** GET /api/sensor-data/aggregate — aggregated sensor data with time buckets */
export async function aggregateSensorData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bucketMinutes = '60', days = '7' } = req.query;
    const bucketMin = parseInt(bucketMinutes as string, 10) || 60;
    const numDays = parseInt(days as string, 10) || 7;

    const since = new Date();
    since.setDate(since.getDate() - numDays);

    const bucketMs = bucketMin * 60 * 1000;

    const results = await SensorData.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            nodeId: '$nodeId',
            type: '$type',
            bucket: {
              $toDate: {
                $subtract: [
                  { $toLong: '$timestamp' },
                  { $mod: [{ $toLong: '$timestamp' }, bucketMs] },
                ],
              },
            },
          },
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.bucket': 1 } },
    ]);

    res.json(results);
  } catch (err) {
    next(err);
  }
}
