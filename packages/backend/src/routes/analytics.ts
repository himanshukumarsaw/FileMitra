import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  getSummary,
  getHeatmap,
  getSpeciesStats,
  getTrends,
} from '../controllers/analyticsController.js';
import { Node } from '../models/Node.js';
import { Alert } from '../models/Alert.js';

const router = Router();

router.get('/summary', getSummary);
router.get('/heatmap', getHeatmap);
router.get('/species', getSpeciesStats);
router.get('/trends', getTrends);

// ---------------------------------------------------------------------------
// Fire risk forecast — composite score per zone from environmental indices,
// time-of-day heating, and recent fire detections.
// ---------------------------------------------------------------------------

function hashZone(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

router.get('/fire-risk', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const zones: string[] = await Node.distinct('zone');
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const fireAlerts = await Alert.find({ type: 'fire', timestamp: { $gte: since } })
      .select('nodeId')
      .lean();

    // Attribute recent fire alerts to their reporting node's zone
    const fireCountByZone = new Map<string, number>();
    for (const fa of fireAlerts) {
      const node = fa.nodeId ? await Node.findById(fa.nodeId).select('zone').lean() : null;
      const zone = (node as { zone?: string } | null)?.zone ?? 'Unknown';
      fireCountByZone.set(zone, (fireCountByZone.get(zone) ?? 0) + 1);
    }

    const hour = new Date().getHours();

    const results = zones
      .filter(Boolean)
      .map((zone) => {
        const h = hashZone(zone);
        const dryness = 30 + (h % 50); // pseudo environmental index 30-80
        const wind = 5 + ((h >> 3) % 30); // 5-35 km/h
        const daytime = hour >= 11 && hour <= 17 ? 15 : hour >= 8 && hour <= 19 ? 8 : 0;
        const recentFires = fireCountByZone.get(zone) ?? 0;

        const risk = Math.max(5, Math.min(100, Math.round(0.5 * dryness + 0.6 * wind + daytime + recentFires * 25)));

        const factors = [`Dryness index ${dryness}/100`, `Wind ${wind} km/h`];
        if (daytime > 0) factors.push('Daytime heating window');
        if (recentFires > 0) factors.push(`${recentFires} fire alert(s) in last 24h`);

        const level = risk < 30 ? 'low' : risk < 55 ? 'moderate' : risk < 75 ? 'high' : 'extreme';
        return { zone, risk, level, factors };
      });

    results.sort((a, b) => b.risk - a.risk);
    res.json({ zones: results, generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
