/**
 * ML service client — talks to the Python FastAPI ML service
 * for acoustic threat detection analysis.
 */

const ML_SERVICE_URL = 'http://localhost:8000'
const TIMEOUT_MS = 15000

export interface AcousticAnalysisResult {
  status: 'ALERT' | 'NORMAL'
  threat_type: 'Deforestation' | 'Wildfire' | 'Poaching' | null
  detected_sound: string | null
  confidence_score: number
  timestamp: string
  sensor_id: string
  audio_snippet_url: string | null
  action_required: 'Immediate dispatch' | 'Verification' | null
  noise_profile: string | null
  processing_ms: number
}

export async function analyzeAcoustic(params: {
  sensor_id: string
  audio_base64?: string
  audio_url?: string
  clip_duration_sec?: number
}): Promise<AcousticAnalysisResult | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(`${ML_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sensor_id: params.sensor_id,
        audio_base64: params.audio_base64,
        audio_url: params.audio_url,
        clip_duration_sec: params.clip_duration_sec ?? 5,
        metadata: {},
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[mlClient] /analyze returned ${res.status}`)
      return null
    }

    const data = await res.json()
    return data.data ?? null
  } catch (err) {
    console.warn('[mlClient] /analyze failed:', (err as Error).message)
    return null
  }
}
