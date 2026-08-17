import { type Response, type NextFunction } from 'express';
import { Alert } from '../models/Alert.js';
import { Node } from '../models/Node.js';
import type { AuthRequest } from '../middleware/auth.js';

/** GET /api/analytics/summary — dashboard summary stats */
export async function getSummary(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAlerts,
      alertsToday,
      activeNodes,
      totalNodes,
      bySeverity,
      byType,
      speciesAgg,
    ] = await Promise.all([
      Alert.countDocuments({}),
      Alert.countDocuments({ timestamp: { $gte: today } }),
      Node.countDocuments({ status: 'online' }),
      Node.countDocuments({}),
      Alert.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Alert.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Alert.aggregate([
        { $match: { species: { $exists: true, $ne: null } } },
        { $group: { _id: '$species' } },
      ]),
    ]);

    const severityBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of bySeverity) severityBreakdown[row._id] = row.count;

    const typeBreakdown: Record<string, number> = { human: 0, animal: 0, vehicle: 0 };
    for (const row of byType) typeBreakdown[row._id] = row.count;

    const uptimePercentage = totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 100) : 0;

    res.json({
      totalAlerts,
      alertsToday,
      activeNodes,
      totalNodes,
      speciesCount: speciesAgg.length,
      uptimePercentage,
      severityBreakdown,
      typeBreakdown,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/heatmap — heatmap data for map page */
export async function getHeatmap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const filter: Record<string, unknown> = { timestamp: { $gte: since } };

    // Optional bounding box: bbox=swLng,swLat,neLng,neLat
    if (req.query.bbox) {
      const parts = (req.query.bbox as string).split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [swLng, swLat, neLng, neLat] = parts;
        filter['location.coordinates'] = {
          $geoWithin: {
            $box: [
              [swLng, swLat],
              [neLng, neLat],
            ],
          },
        };
      }
    }

    const alerts = await Alert.find(filter)
      .select({ location: 1, severity: 1, timestamp: 1 })
      .lean();

    const points = alerts.map((a) => ({
      lng: a.location.coordinates[0],
      lat: a.location.coordinates[1],
      severity: a.severity,
      timestamp: a.timestamp,
      intensity:
        a.severity === 'critical' ? 4 :
        a.severity === 'high' ? 3 :
        a.severity === 'medium' ? 2 : 1,
    }));

    res.json({ points, count: points.length });
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/species — species detection counts */
export async function getSpeciesStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await Alert.aggregate([
      { $match: { species: { $exists: true, $ne: null } } },
      { $group: { _id: '$species', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json(results.map((r) => ({ species: r._id, count: r.count })));
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/trends — daily alert counts for the past N days */
export async function getTrends(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const results = await Alert.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const trends = results.map((r) => ({
      date: r._id,
      count: r.count,
      bySeverity: { critical: r.critical, high: r.high, medium: r.medium, low: r.low },
    }));

    res.json(trends);
  } catch (err) {
    next(err);
  }
}
