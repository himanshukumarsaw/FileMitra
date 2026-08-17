import { SensorData } from '../models/SensorData.js';
import { Node } from '../models/Node.js';
import { processAlert } from './alertProcessor.js';

/**
 * Multi-sensor fire fusion (spec #5).
 *
 * Fire detection must not rely on acoustics alone. Every time an
 * environmental reading arrives we re-evaluate the node's recent window:
 *
 *   smoke ≥ 40% AND temperature ≥ 38°C AND humidity ≤ 40%  →  FIRE (fused)
 *
 * A per-node cooldown prevents duplicate fusion alerts while the event
 * is still unfolding.
 */

const FUSION_WINDOW_MS = 10 * 60_000;
const FUSION_COOLDOWN_MS = 8 * 60_000;

const SMOKE_THRESHOLD = 40; // %
const TEMP_THRESHOLD = 38; // °C
const HUMIDITY_MAX = 40; // %

const lastFusion = new Map<string, number>();

interface LatestReadings {
  temperature?: number;
  humidity?: number;
  smoke?: number;
}

async function latestReadings(nodeId: string): Promise<LatestReadings> {
  const since = new Date(Date.now() - FUSION_WINDOW_MS);
  const rows = await SensorData.find({
    nodeId,
    type: { $in: ['temperature', 'humidity', 'smoke'] },
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .limit(30);

  const out: LatestReadings = {};
  for (const row of rows) {
    if (out[row.type as keyof LatestReadings] === undefined) {
      out[row.type as keyof LatestReadings] = row.value;
    }
  }
  return out;
}

/** Evaluate the fire-fusion rule for a node after a new sensor reading. */
export async function checkFireFusion(nodeId: string): Promise<void> {
  const last = lastFusion.get(nodeId) ?? 0;
  if (Date.now() - last < FUSION_COOLDOWN_MS) return;

  const readings = await latestReadings(nodeId);
  if (
    readings.smoke === undefined ||
    readings.temperature === undefined ||
    readings.humidity === undefined
  ) {
    return;
  }

  const fireCondition =
    readings.smoke >= SMOKE_THRESHOLD &&
    readings.temperature >= TEMP_THRESHOLD &&
    readings.humidity <= HUMIDITY_MAX;
  if (!fireCondition) return;

  const node = await Node.findById(nodeId);
  if (!node) return;

  lastFusion.set(nodeId, Date.now());
  const [lng, lat] = node.location.coordinates;

  console.log(
    `[fire-fusion] 🔥 Multi-sensor fire signature at ${node.name} ` +
      `(smoke ${readings.smoke}%, temp ${readings.temperature}°C, humidity ${readings.humidity}%)`
  );

  await processAlert({
    type: 'fire',
    confidence: 0.96,
    location: { lat, lng },
    nodeId,
    soundType: 'fire_crackle',
    description:
      `Multi-sensor fire fusion: smoke ${readings.smoke}%, ` +
      `temp ${readings.temperature}°C, humidity ${readings.humidity}%`,
  });
}
