import { env } from '../config/env.js';

const TIMEOUT_MS = 15000;

interface MLResponse<T> {
  success: boolean;
  data?: T;
}

async function mlPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${env.ML_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[mlClient] ${endpoint} returned ${res.status}`);
      return null;
    }

    const json = (await res.json()) as MLResponse<T>;
    return json.success ? (json.data ?? null) : null;
  } catch (err) {
    console.warn(`[mlClient] ${endpoint} failed:`, (err as Error).message);
    return null;
  }
}

/** Species classification from an image URL */
export async function classifySpecies(imageUrl: string): Promise<{
  species: string;
  confidence: number;
} | null> {
  return mlPost<{ species: string; confidence: number }>('/api/classify', { imageUrl });
}

/** Risk score prediction for a location and time */
export async function getRiskScore(
  location: { lat: number; lng: number },
  time: Date
): Promise<{ riskScore: number; level: string } | null> {
  return mlPost<{ riskScore: number; level: string }>('/api/risk', {
    lat: location.lat,
    lng: location.lng,
    timestamp: time.toISOString(),
  });
}

/** AI explanation for a specific alert */
export async function getExplanation(alertId: string): Promise<{
  summary: string;
  factors: Array<{ name: string; description: string; weight: number }>;
} | null> {
  return mlPost<{
    summary: string;
    factors: Array<{ name: string; description: string; weight: number }>;
  }>('/api/explain', { alertId });
}

export interface AcousticAnalysisResult {
  status: 'ALERT' | 'NORMAL';
  threat_type: 'Deforestation' | 'Wildfire' | 'Poaching' | null;
  detected_sound: string | null;
  confidence_score: number;
  timestamp: string;
  sensor_id: string;
  audio_snippet_url: string | null;
  action_required: 'Immediate dispatch' | 'Verification' | null;
  noise_profile: string | null;
  processing_ms: number;
}

/** Analyze a base64 audio clip through the ML acoustic threat detection service */
export async function analyzeAcoustic(params: {
  sensor_id: string;
  audio_base64?: string;
  audio_url?: string;
  clip_duration_sec?: number;
}): Promise<AcousticAnalysisResult | null> {
  return mlPost<AcousticAnalysisResult>('/analyze', {
    sensor_id: params.sensor_id,
    audio_base64: params.audio_base64,
    audio_url: params.audio_url,
    clip_duration_sec: params.clip_duration_sec ?? 5,
    metadata: {},
  });
}
