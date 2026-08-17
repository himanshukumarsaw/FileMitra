import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Node } from '../models/Node.js';
import { AppError } from '../middleware/error.js';
import { emitNodeHeartbeat } from '../services/realtime.js';

const router = Router();

// npm workspace scripts run with the package directory as cwd
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': '.webm',
  'audio/mp4': '.mp4',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** POST /api/node-ingest/register — self-registration for mobile/sim nodes */
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, location, hardwareModel, zone } = req.body;

    const lat = location?.lat;
    const lng = location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new AppError('location.lat and location.lng (numbers) are required', 400);
    }

    // Unique name suffix so re-registrations never collide
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const nodeName = name || `Field Node ${suffix}`;

    // Upsert by name so node restarts re-register instead of failing on uniqueness
    const node = await Node.findOneAndUpdate(
      { name: nodeName },
      {
        location: { type: 'Point', coordinates: [lng, lat] },
        batteryLevel: req.body.batteryLevel ?? 100,
        solarCharging: req.body.solarCharging ?? false,
        status: 'online',
        lastSeen: new Date(),
        signalStrength: req.body.signalStrength ?? -70,
        firmwareVersion: req.body.firmwareVersion ?? '1.0.0',
        zone: zone || 'Mobile Patrol',
        hardwareModel: hardwareModel || 'Mobile-Node',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(node);
  } catch (err) {
    next(err);
  }
});

/** POST /api/node-ingest/:id/heartbeat — keep-alive from nodes in the field */
router.post('/:id/heartbeat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nodeId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(nodeId)) {
      throw new AppError('Invalid node id', 400);
    }

    const { batteryLevel, signalStrength } = req.body;

    const update: Record<string, unknown> = { lastSeen: new Date(), status: 'online' };
    if (typeof batteryLevel === 'number') update.batteryLevel = batteryLevel;
    if (typeof signalStrength === 'number') update.signalStrength = signalStrength;

    const node = await Node.findByIdAndUpdate(nodeId, update, { new: true });
    if (!node) throw new AppError('Node not found', 404);

    emitNodeHeartbeat(node._id.toString(), {
      batteryLevel: node.batteryLevel,
      signalStrength: node.signalStrength,
      timestamp: node.lastSeen,
    });

    res.json({ ok: true, status: node.status, lastSeen: node.lastSeen });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/node-ingest/:id/evidence — upload an audio clip or photo captured
 * on the node at detection time. Sent out-of-band (REST) because the LoRa
 * uplink only carries small JSON payloads; the returned URL travels inside the
 * alert packet so the dashboard can play the evidence back.
 */
router.post('/:id/evidence', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nodeId = req.params.id as string;
    const { kind, data } = req.body as { kind?: string; data?: string };

    if ((kind !== 'audio' && kind !== 'image') || typeof data !== 'string' || data.length === 0) {
      throw new AppError('kind (audio|image) and base64/dataURL data are required', 400);
    }

    // Accept a dataURL ("data:audio/webm;base64,...") or raw base64
    const match = /^data:([\w/+.-]+);base64,(.*)$/.exec(data);
    const mime = match ? match[1] : kind === 'audio' ? 'audio/webm' : 'image/jpeg';
    const base64 = match ? match[2] : data;
    const ext = EXT_BY_MIME[mime] ?? (kind === 'audio' ? '.webm' : '.jpg');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${kind}-${nodeId}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'));

    res.status(201).json({ url: `/uploads/${filename}`, mime });
  } catch (err) {
    next(err);
  }
});

export default router;
