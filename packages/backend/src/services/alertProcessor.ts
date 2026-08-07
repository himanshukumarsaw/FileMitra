import { Alert, type IAlert } from '../models/Alert.js';
import { Node } from '../models/Node.js';
import { classifyAlert, type DetectionInput } from './alertClassifier.js';
import { emitNewAlert } from './realtime.js';

export interface IncomingAlert {
  type: 'human' | 'animal' | 'vehicle';
  confidence: number;
  location: { lat: number; lng: number };
  nodeId: string;
  timestamp?: string;
  imageUrl?: string;
  audioUrl?: string;
  species?: string;
  description?: string;
  soundType?: 'chainsaw' | 'gunshot' | 'vehicle' | 'unknown';
}

/**
 * Process an incoming alert from MQTT or the REST API.
 *
 * 1. Validates the payload
 * 2. Runs the rule-based classifier
 * 3. Persists to MongoDB
 * 4. Emits via Socket.IO
 * 5. Returns the saved alert document
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

  // --- Build explanation ---
  const explanation = {
    summary: classification.reasoning.join('; '),
    factors: classification.reasoning.map((r, i) => ({
      name: `factor_${i + 1}`,
      description: r,
      weight: Math.round(classification.score / classification.reasoning.length),
    })),
    confidenceBreakdown: {
      visual: data.confidence,
      audio: data.soundType && data.soundType !== 'unknown' ? 0.85 : 0.3,
      motion: data.confidence * 0.9,
      contextual: classification.score / 100,
    },
  };

  // --- Save to DB ---
  const alert = await Alert.create({
    type: data.type,
    severity: classification.severity,
    confidence: data.confidence,
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
    status: 'new',
  });

  // --- Emit realtime event ---
  emitNewAlert(alert);

  return alert;
}
