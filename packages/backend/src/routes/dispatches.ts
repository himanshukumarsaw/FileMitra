import { Router, type Request, type Response, type NextFunction } from 'express';
import { Dispatch } from '../models/Dispatch.js';
import { manualDispatch, resolveDispatch } from '../services/dispatch.js';

const router = Router();

/** GET /api/dispatches — recent automated ranger responses (newest first) */
router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dispatches = await Dispatch.find().sort({ createdAt: -1 }).limit(20);
    res.json({ dispatches });
  } catch (err) {
    next(err);
  }
});

/** POST /api/dispatches — officer-initiated dispatch for a given alert */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { alertId } = req.body as { alertId?: string };
    if (!alertId) {
      res.status(400).json({ error: 'alertId is required' });
      return;
    }
    const { dispatch, created } = await manualDispatch(alertId);
    res.status(created ? 201 : 200).json({ dispatch, created });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      res.status(404).json({ error: (err as Error).message });
      return;
    }
    next(err);
  }
});

/** POST /api/dispatches/:id/resolve — officer closes an active response */
router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dispatchId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!dispatchId) {
      res.status(400).json({ error: 'dispatch id is required' });
      return;
    }
    const { dispatch, alreadyResolved } = await resolveDispatch(dispatchId);
    res.json({ dispatch, alreadyResolved });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      res.status(404).json({ error: (err as Error).message });
      return;
    }
    next(err);
  }
});

export default router;
