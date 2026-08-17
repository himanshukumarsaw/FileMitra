import { Router, type Request, type Response, type NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  listAlerts,
  getAlertStats,
  getAlertById,
  createAlert,
  updateAlertStatus,
  bulkAction,
} from '../controllers/alertController.js';
import { Alert } from '../models/Alert.js';
import { emitAlertUpdated } from '../services/realtime.js';
import { manualDispatch } from '../services/dispatch.js';

const router = Router();

// Public routes
router.get('/', listAlerts);
router.get('/stats', getAlertStats);

/** Response-tracking stats: false-alarm rate + average officer response time */
router.get('/response-stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [withFeedback, acknowledged] = await Promise.all([
      Alert.find({ feedback: { $exists: true } }).select('feedback').lean(),
      Alert.find({ acknowledgedAt: { $exists: true, $ne: null } })
        .select('timestamp acknowledgedAt')
        .lean(),
    ]);
    const falseAlarms = withFeedback.filter((a) => a.feedback === 'false_alarm').length;
    const responseSeconds = acknowledged
      .map((a) => (new Date(a.acknowledgedAt as Date).getTime() - new Date(a.timestamp).getTime()) / 1000)
      .filter((s) => s >= 0);
    res.json({
      totalFeedback: withFeedback.length,
      falseAlarms,
      genuine: withFeedback.length - falseAlarms,
      falseAlarmRate: withFeedback.length ? falseAlarms / withFeedback.length : 0,
      avgResponseSeconds: responseSeconds.length
        ? responseSeconds.reduce((s, v) => s + v, 0) / responseSeconds.length
        : null,
      acknowledgedCount: acknowledged.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', getAlertById);

/** Officer acknowledges an alert (demo route — public) */
router.post('/:id/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    await alert.save();
    emitAlertUpdated(alert);
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

/** Human-in-the-loop feedback: officer marks genuine / false alarm */
router.post('/:id/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { feedback } = req.body as { feedback?: string };
    if (feedback !== 'genuine' && feedback !== 'false_alarm') {
      return res.status(400).json({ error: "feedback must be 'genuine' or 'false_alarm'" });
    }
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    alert.feedback = feedback;
    if (feedback === 'false_alarm') alert.status = 'dismissed';
    await alert.save();
    emitAlertUpdated(alert);
    res.json(alert);
  } catch (err) {
    next(err);
  }
});

/** Officer escalates an alert to critical + confirmed, then dispatches a team */
router.post('/:id/escalate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    alert.severity = 'critical';
    alert.verificationStatus = 'confirmed';
    if (!alert.acknowledgedAt) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
    }
    await alert.save();
    emitAlertUpdated(alert);
    const { dispatch, created } = await manualDispatch(alert._id.toString());
    res.json({ alert, dispatch, created });
  } catch (err) {
    next(err);
  }
});

/** Create (or return) the incident grouping this alert belongs to */
router.post('/:id/incident', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    let created = false;
    if (!alert.incidentId) {
      alert.incidentId = `INC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      created = true;
      await alert.save();
      emitAlertUpdated(alert);
    }
    res.json({ alert, incidentId: alert.incidentId, created });
  } catch (err) {
    next(err);
  }
});

// Protected routes
router.post('/', verifyToken, requireRole('admin', 'officer'), createAlert);
router.patch('/:id/status', verifyToken, requireRole('admin', 'officer'), updateAlertStatus);
router.post('/bulk-action', verifyToken, requireRole('admin', 'officer'), bulkAction);

export default router;
