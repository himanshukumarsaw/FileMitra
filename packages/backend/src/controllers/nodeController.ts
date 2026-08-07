import { type Response, type NextFunction } from 'express';
import { Node } from '../models/Node.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { emitNodeStatusChanged } from '../services/realtime.js';

/** GET /api/nodes — list nodes (optional zone/status filter) */
export async function listNodes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.zone) filter.zone = req.query.zone;
    if (req.query.status) filter.status = req.query.status;

    const nodes = await Node.find(filter).sort({ name: 1 }).lean();
    res.json(nodes);
  } catch (err) {
    next(err);
  }
}

/** GET /api/nodes/:id — single node */
export async function getNodeById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) throw new AppError('Node not found', 404);
    res.json(node);
  } catch (err) {
    next(err);
  }
}

/** POST /api/nodes — create node (admin only) */
export async function createNode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = await Node.create(req.body);
    res.status(201).json(node);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/nodes/:id — update node */
export async function updateNode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = await Node.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!node) throw new AppError('Node not found', 404);
    res.json(node);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/nodes/:id/status — update node status + lastSeen */
export async function updateNodeStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    const allowed = ['online', 'offline', 'warning'];
    if (!allowed.includes(status)) {
      throw new AppError(`Status must be one of: ${allowed.join(', ')}`, 400);
    }

    const node = await Node.findByIdAndUpdate(
      req.params.id,
      { status, lastSeen: new Date() },
      { new: true }
    );
    if (!node) throw new AppError('Node not found', 404);

    emitNodeStatusChanged(node._id.toString(), node.status);
    res.json(node);
  } catch (err) {
    next(err);
  }
}
