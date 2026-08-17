import { Alert, type IAlert } from '../models/Alert.js';
import { Node } from '../models/Node.js';
import { classifyAlert, type DetectionInput } from './alertClassifier.js';
import { emitNewAlert, emitAlertUpdated } from './realtime.js';
import { maybeDispatchResponse } from './dispatch.js';

export interface IncomingAlert {
  type: 'human' | 'animal' | 'vehicle' | 'fire';
  confidence: number;
  location: { lat: number; lng: number };
  nodeId: string;
  timestamp?: string;
  imageUrl?: string;
  audioUrl?: string;
  species?: string;
  description?: string;
  soundType?:
    | 'chainsaw'
    | 'engine'
    | 'gunshot'
    | 'vehicle'
    | 'animal_call'
    | 'fire_crackle'
    | 'ambient'
    | 'tamper'
    | 'unknown';
}

// ---------------------------------------------------------------------------
// Incident correlation — multiple nodes hearing the same acoustic event are
// merged into one incident (mesh triangulation story for the demo).
// ---------------------------------------------------------------------------

const CORRELATION_WINDOW_MS = 90_000; // same sound within 90 s
const CORRELATION_RADIUS_KM = 8; // ...and within 8 km
const CONFLICT_WINDOW_MS = 180_000; // wildlife + human within 3 min
const CONFLICT_COOLDOWN_MS = 5 * 60_000; // one conflict warning per zone per 5 min

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface CorrelationResult {
  incidentId: string | undefined;
  /** true when another node already reported the same event */
  corroboratedByMesh: boolean;
}

async function correlateIncident(
  data: IncomingAlert,
  coords: [number, number]
): Promise<CorrelationResult> {
  if (!data.soundType || data.soundType === 'unknown' || data.soundType === 'ambient') {
    return { incidentId: undefined, corroboratedByMesh: false };
  }

  const since = new Date(Date.now() - CORRELATION_WINDOW_MS);
  const candidates = await Alert.find({
    soundType: data.soundType,
    // Corroboration requires a *different* node — a node re-reporting itself
    // (retries, queued replays, chattering detector) must not self-confirm.
    nodeId: { $ne: data.nodeId },
    incidentId: { $exists: true },
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .limit(10);

  for (const candidate of candidates) {
    if (haversineKm(coords, candidate.location.coordinates as [number, number]) <= CORRELATION_RADIUS_KM) {
      return { incidentId: candidate.incidentId, corroboratedByMesh: true };
    }
  }

  // New incident
  return { incidentId: `INC-${Date.now().toString(36).toUpperCase()}`, corroboratedByMesh: false };
}

// ---------------------------------------------------------------------------
// Visual AI verification (simulated) — a captured frame is "analysed" and the
// resulting labels corroborate the acoustic detection (spec #12).
// ---------------------------------------------------------------------------

const VISUAL_LABELS: Record<string, string[]> = {
  chainsaw: ['person', 'chainsaw'],
  gunshot: ['person', 'weapon-like object'],
  fire_crackle: ['smoke', 'open flame'],
  vehicle: ['vehicle'],
  engine: ['vehicle'],
  animal_call: ['animal'],
  tamper: ['motion near enclosure'],
};

function simulateVisualAI(data: IncomingAlert): string[] {
  if (!data.imageUrl) return [];
  const labels = VISUAL_LABELS[data.soundType ?? ''] ?? [];
  if (labels.length === 0 && data.type === 'animal') return [data.species?.toLowerCase() ?? 'animal'];
  if (labels.length === 0) return ['unclear object'];
  return labels;
}

// ---------------------------------------------------------------------------
// Human–wildlife conflict detection (spec #15): wildlife + human activity in
// the same zone within a short window raises a conflict warning.
// ---------------------------------------------------------------------------

const conflictCooldown = new Map<string, number>();

async function maybeConflictWarning(alert: IAlert, zone: string | undefined): Promise<void> {
  if (!zone) return;
  if (alert.type !== 'human' && alert.type !== 'animal') return;

  const key = `${zone}`;
  const last = conflictCooldown.get(key) ?? 0;
  if (Date.now() - last < CONFLICT_COOLDOWN_MS) return;

  // Claim the cooldown before the await so concurrent alerts can't both pass
  conflictCooldown.set(key, Date.now());

  const opposite = alert.type === 'human' ? 'animal' : 'human';
  const since = new Date(Date.now() - CONFLICT_WINDOW_MS);
  const neighbour = await Alert.findOne({
    type: opposite,
    nodeId: { $ne: alert.nodeId },
    timestamp: { $gte: since },
  }).sort({ timestamp: -1 });
  if (!neighbour) {
    conflictCooldown.delete(key);
    return;
  }

  const species = alert.species ?? neighbour.species ?? 'wildlife';
  const conflict = await Alert.create({
    type: 'animal',
    severity: 'high',
    confidence: 0.85,
    location: alert.location,
    explanation: {
      summary: `Possible human–wildlife conflict: ${species} activity overlaps with human activity in ${zone}.`,
      factors: [
        { name: 'wildlife', description: `${species} detected in ${zone}`, weight: 0.4 },
        { name: 'human', description: 'Human activity detected nearby within 3 minutes', weight: 0.4 },
        { name: 'boundary', description: 'Zone overlaps village/boundary corridor', weight: 0.2 },
      ],
      confidenceBreakdown: { visual: 0.2, audio: 0.7, motion: 0.4, contextual: 0.85 },
    },
    nodeId: alert.nodeId,
    timestamp: new Date(),
    species: alert.species ?? neighbour.species,
    description: `⚠️ Human–wildlife conflict risk: ${species} near human activity in ${zone}`,
    soundType: 'animal_call',
    verificationStatus: 'confirmed',
    confirmingNodes: [String(alert.nodeId), String(neighbour.nodeId)],
    status: 'new',
  });

  emitNewAlert(conflict);
  void maybeDispatchResponse(conflict, zone).catch((e) => console.error('[dispatch] conflict dispatch failed:', e));
}

/**
 * Process an incoming alert from MQTT or the REST API.
 *
 * 1. Validates the payload
 * 2. Runs the rule-based classifier
 * 3. Threat-confidence engine: visual AI + multi-node corroboration decide
 *    suspicious vs confirmed (false-alarm suppression, spec #6/#7)
 * 4. Persists to MongoDB, upgrades earlier alerts of the same incident
 * 5. Emits via Socket.IO, triggers dispatch only for confirmed events
 */
export async function processAlert(data: IncomingAlert): Promise<IAlert> {
  // --- Validate required fields ---
  if (!data.type || !data.confidence || !data.location || !data.nodeId) {
    throw new Error('Missing required alert fields: type, confidence, location, nodeId');
  }

  const node = await Node.findById(data.nodeId);
  const zone = node?.zone;
  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

  // --- Classify severity ---
  const input: DetectionInput = {
    type: data.type,
    confidence: data.confidence,
    timestamp,
    location: data.location,
    species: data.species,
    zone,
    soundType: data.soundType,
  };

  const classification = classifyAlert(input);

  // --- Correlate with nearby recent detections of the same sound ---
  const coords: [number, number] = [data.location.lng, data.location.lat];
  const correlation = await correlateIncident(data, coords);

  // --- Visual AI verification (camera frame analysis) ---
  const visualLabels = simulateVisualAI(data);
  const cameraCorroborates = visualLabels.length > 0 && !visualLabels.includes('unclear object');
  const combinedConfidence = Math.min(
    0.99,
    data.confidence + (cameraCorroborates ? 0.06 : 0) + (correlation.corroboratedByMesh ? 0.05 : 0)
  );

  // --- Threat-confidence engine: detection ≠ confirmation ---
  const verificationStatus: 'suspicious' | 'confirmed' =
    correlation.corroboratedByMesh || cameraCorroborates ? 'confirmed' : 'suspicious';

  const reasoning = [...classification.reasoning];
  if (correlation.corroboratedByMesh) reasoning.push('Second node confirmed the same acoustic event (mesh corroboration)');
  if (cameraCorroborates) reasoning.push(`Visual AI corroborated: ${visualLabels.join(', ')} on captured frame`);
  if (verificationStatus === 'suspicious') reasoning.push('Single-node detection — held as suspicious until corroborated');

  // --- Build explanation ---
  const explanation = {
    summary: reasoning.join('; '),
    factors: reasoning.map((r, i) => ({
      name: `factor_${i + 1}`,
      description: r,
      weight: Math.round(classification.score / reasoning.length) / 100,
    })),
    confidenceBreakdown: {
      visual: cameraCorroborates ? 0.9 : data.confidence * 0.6,
      audio: data.soundType && data.soundType !== 'unknown' ? 0.85 : 0.3,
      motion: data.confidence * 0.9,
      contextual: classification.score / 100,
    },
  };

  // --- Save to DB ---
  const alert = await Alert.create({
    type: data.type,
    severity: classification.severity,
    confidence: combinedConfidence,
    location: {
      type: 'Point' as const,
      coordinates: [data.location.lng, data.location.lat],
    },
    imageUrl: data.imageUrl,
    audioUrl: data.audioUrl,
    explanation,
    nodeId: data.nodeId,
    timestamp,
    species: data.species,
    description: data.description,
    soundType: data.soundType,
    incidentId: correlation.incidentId,
    verificationStatus,
    confirmingNodes: [String(data.nodeId)],
    visualLabels,
    status: 'new',
  });

  // --- Upgrade earlier alerts of the same incident to confirmed ---
  if (correlation.corroboratedByMesh && correlation.incidentId) {
    const peers = await Alert.find({
      incidentId: correlation.incidentId,
      _id: { $ne: alert._id },
      verificationStatus: { $ne: 'confirmed' },
    });
    for (const peer of peers) {
      peer.verificationStatus = 'confirmed';
      peer.confirmingNodes = Array.from(new Set([...(peer.confirmingNodes ?? []), String(data.nodeId)]));
      await peer.save();
      emitAlertUpdated(peer);
    }
  }

  // --- Emit realtime event ---
  emitNewAlert(alert);

  // --- Automated response — only for CONFIRMED critical/high events ---
  if (verificationStatus === 'confirmed') {
    void maybeDispatchResponse(alert, zone).catch((e) => console.error('[dispatch] failed:', e));
  }

  // --- Human–wildlife conflict check (fire-and-forget) ---
  void maybeConflictWarning(alert, zone).catch((e) => console.error('[conflict] check failed:', e));

  return alert;
}
