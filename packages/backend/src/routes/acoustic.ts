import { Router, type Request, type Response, type NextFunction } from 'express';
import { analyzeAcoustic } from '../services/mlClient.js';
import { processAlert, type IncomingAlert } from '../services/alertProcessor.js';
import { AppError } from '../middleware/error.js';

const router = Router();

/**
 * POST /api/acoustic/analyze
 *
 * Accepts an audio clip (base64 or URL) from a sensor node, forwards it to the
 * ML acoustic threat detection service, and — when a high-confidence threat
 * is returned — creates an alert via the normal processing pipeline.
 *
 * This is the bridge between the ML service (ml/) and the backend alert store.
 */
router.post('/analyze', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sensor_id, audio_base64, audio_url, location, clip_duration_sec } = req.body;

    if (!sensor_id) {
      throw new AppError('sensor_id is required', 400);
    }
    if (!audio_base64 && !audio_url) {
      throw new AppError('Provide audio_base64 or audio_url', 400);
    }

    const result = await analyzeAcoustic({
      sensor_id,
      audio_base64,
      audio_url,
      clip_duration_sec: clip_duration_sec ?? 5,
    });

    if (!result) {
      throw new AppError('ML acoustic analysis service unavailable', 503);
    }

    res.json(result);

    // If the ML service detected a threat, feed it through the alert pipeline
    if (result.status === 'ALERT' && result.confidence_score >= 0.85) {
      let threatType: IncomingAlert['type'] = 'human';
      if (result.threat_type === 'Wildfire') threatType = 'fire';
      else if (result.threat_type === 'Poaching') threatType = 'human';

      const incoming: IncomingAlert = {
        type: threatType,
        confidence: result.confidence_score,
        location: location ?? { lat: 0, lng: 0 },
        nodeId: sensor_id,
        soundType: mapDetectedSoundToSoundType(result.detected_sound),
        description: `ML Acoustic Detection: ${result.detected_sound}`,
        audioUrl: result.audio_snippet_url ?? undefined,
      };

      try {
        await processAlert(incoming);
      } catch (alertErr) {
        console.error('[acoustic] processAlert failed:', alertErr);
      }
    }
  } catch (err) {
    next(err);
  }
});

function mapDetectedSoundToSoundType(sound: string | null): IncomingAlert['soundType'] {
  if (!sound) return 'unknown';
  const map: Record<string, IncomingAlert['soundType']> = {
    'Chainsaw': 'chainsaw',
    'Mechanical Saw': 'engine',
    'Falling Timber': 'chainsaw',
    'Heavy Machinery': 'engine',
    'Fire Crackle': 'fire_crackle',
    'Fire Flare-up': 'fire_crackle',
    'Explosive Burn': 'fire_crackle',
    'Gunshot': 'gunshot',
    'Rifle Crack': 'gunshot',
    'Animal Distress Call': 'animal_call',
    'Metallic Trap Snap': 'tamper',
    'Human Shouting': 'unknown',
  };
  return map[sound] ?? 'unknown';
}

export default router;
