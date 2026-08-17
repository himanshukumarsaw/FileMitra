import { Dispatch } from '../models/Dispatch.js';
import { Alert, type IAlert } from '../models/Alert.js';
import { Node } from '../models/Node.js';
import { emitDispatchNew, emitDispatchUpdated } from './realtime.js';

/** Ranger teams available for automated dispatch (demo roster) */
const TEAMS = [
  'Ranger Team Alpha',
  'Ranger Team Bravo',
  'Quick Response Unit 2',
  'Anti-Poaching Squad Delta',
];

const RANGER_PHONES = ['+91 98··· ··431', '+91 97··· ··208', '+91 96··· ··774'];

/**
 * Automated response engine.
 *
 * Critical/high alerts trigger a ranger dispatch: one response per incident
 * (correlated alerts do not re-dispatch). The response auto-progresses
 * through an SOP timeline so judges can watch the full lifecycle live.
 */
export async function maybeDispatchResponse(alert: IAlert, zone?: string): Promise<void> {
  if (alert.severity !== 'critical' && alert.severity !== 'high') return;

  // One response per incident — a second correlated alert must not re-dispatch
  if (alert.incidentId) {
    const existing = await Dispatch.findOne({ incidentId: alert.incidentId });
    if (existing) return;
  }

  const seed = Date.now();
  const team = TEAMS[seed % TEAMS.length];
  const rangerPhone = RANGER_PHONES[seed % RANGER_PHONES.length];
  const etaMinutes = 6 + Math.floor(Math.random() * 9);
  const incidentZone = zone || 'Unknown Sector';

  const dispatch = await Dispatch.create({
    alertId: alert._id,
    incidentId: alert.incidentId,
    alertType: alert.type,
    severity: alert.severity,
    soundType: alert.soundType,
    team,
    rangerPhone,
    zone: incidentZone,
    status: 'dispatched',
    etaMinutes,
    coordinates: alert.location.coordinates,
    timeline: [{ at: new Date(), label: `SMS sent to ${team} (${rangerPhone}) — ${incidentZone} incident` }],
  });

  console.log(`[dispatch] 🚨 ${team} dispatched for ${alert.type} alert (${dispatch._id})`);
  emitDispatchNew(dispatch);
  scheduleProgression(dispatch._id.toString(), etaMinutes);
}

/** Demo-paced SOP progression: enroute → onscene → resolved */
function scheduleProgression(dispatchId: string, etaMinutes: number): void {
  const steps: Array<{ afterMs: number; status: 'enroute' | 'onscene' | 'resolved'; label: string }> = [
    { afterMs: 12_000, status: 'enroute', label: `Team en route — ETA ${etaMinutes} min to coordinates` },
    { afterMs: 35_000, status: 'onscene', label: 'Team arrived on scene — sweeping the area' },
    { afterMs: 80_000, status: 'resolved', label: 'Scene secured — response closed' },
  ];

  for (const step of steps) {
    setTimeout(() => {
      void advance(dispatchId, step.status, step.label);
    }, step.afterMs);
  }
}

async function advance(dispatchId: string, status: 'enroute' | 'onscene' | 'resolved', label: string): Promise<void> {
  try {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch || dispatch.status === status) return;

    dispatch.status = status;
    dispatch.timeline.push({ at: new Date(), label });
    await dispatch.save();

    console.log(`[dispatch] ${status} — ${label}`);
    emitDispatchUpdated(dispatch);
  } catch (err) {
    console.error('[dispatch] progression failed:', err);
  }
}

/**
 * Officer-initiated dispatch (command-center action).
 * Deduplicates against any active response for the same incident/alert and
 * returns the existing one instead of double-dispatching.
 */
export async function manualDispatch(
  alertId: string
): Promise<{ dispatch: InstanceType<typeof Dispatch>; created: boolean }> {
  const alert = await Alert.findById(alertId);
  if (!alert) {
    const err = new Error('Alert not found') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const existing = alert.incidentId
    ? await Dispatch.findOne({ incidentId: alert.incidentId, status: { $ne: 'resolved' } })
    : await Dispatch.findOne({ alertId: alert._id, status: { $ne: 'resolved' } });
  if (existing) return { dispatch: existing, created: false };

  const node = await Node.findById(alert.nodeId);
  const zone = node?.zone || 'Unknown Sector';
  const seed = Date.now();
  const team = TEAMS[seed % TEAMS.length];
  const rangerPhone = RANGER_PHONES[seed % RANGER_PHONES.length];
  const etaMinutes = 6 + Math.floor(Math.random() * 9);

  const dispatch = await Dispatch.create({
    alertId: alert._id,
    incidentId: alert.incidentId,
    alertType: alert.type,
    severity: alert.severity,
    soundType: alert.soundType,
    team,
    rangerPhone,
    zone,
    status: 'dispatched',
    etaMinutes,
    coordinates: alert.location.coordinates,
    timeline: [
      { at: new Date(), label: `Manual dispatch by officer — SMS sent to ${team} (${rangerPhone})` },
    ],
  });

  console.log(`[dispatch] 🚨 ${team} manually dispatched for ${alert.type} alert (${dispatch._id})`);
  emitDispatchNew(dispatch);
  scheduleProgression(dispatch._id.toString(), etaMinutes);
  return { dispatch, created: true };
}

/**
 * Officer-initiated resolution (command-center action).
 * Marks the response resolved, records it on the timeline and broadcasts
 * the update so every dashboard reflects the closure instantly.
 */
export async function resolveDispatch(
  dispatchId: string
): Promise<{ dispatch: InstanceType<typeof Dispatch>; alreadyResolved: boolean }> {
  const dispatch = await Dispatch.findById(dispatchId);
  if (!dispatch) {
    const err = new Error('Dispatch not found') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (dispatch.status === 'resolved') return { dispatch, alreadyResolved: true };

  dispatch.status = 'resolved';
  dispatch.timeline.push({ at: new Date(), label: 'Officer resolved the incident from the command center' });
  await dispatch.save();

  console.log(`[dispatch] ✅ ${dispatch.team} resolved by officer (${dispatch._id})`);
  emitDispatchUpdated(dispatch);
  return { dispatch, alreadyResolved: false };
}
