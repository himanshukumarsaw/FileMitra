from datetime import datetime, timezone
import os
import time
from typing import Optional
import io
import base64
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from loguru import logger

from ml.src.config import settings
from ml.src.schemas.payloads import AudioAnalysisRequest, AudioAnalysisResponse
from ml.src.preprocessing.audio_processor import AudioProcessor
from ml.src.model.classifier import ThreatClassifier
from ml.src.model.threats import ACTION_MAP
from ml.src.utils.storage import ClipStorage

app = FastAPI(title="JungleSathi ML Acoustic Threat Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = AudioProcessor()
classifier = ThreatClassifier()
storage = ClipStorage()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "JungleSathi ML Acoustic Threat Detection",
        "model_loaded": classifier._model is not None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/settings")
def get_settings():
    return {
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "sample_rate": settings.SAMPLE_RATE,
        "clip_duration_sec": settings.AUDIO_CLIP_DURATION_SEC,
        "model_loaded": classifier._model is not None,
    }


@app.post("/settings")
def update_settings(confidence_threshold: Optional[float] = Query(None, ge=0.0, le=1.0)):
    if confidence_threshold is not None:
        settings.CONFIDENCE_THRESHOLD = confidence_threshold
        logger.info(f"Confidence threshold updated to {confidence_threshold}")
    return {
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "sample_rate": settings.SAMPLE_RATE,
        "clip_duration_sec": settings.AUDIO_CLIP_DURATION_SEC,
    }


@app.post("/analyze")
def analyze_audio(request: AudioAnalysisRequest):
    start = time.time()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        if request.audio_base64:
            audio, sr = processor.load_audio_from_base64(request.audio_base64)
        elif request.audio_url:
            audio, sr = processor.load_audio_from_url(request.audio_url)
        else:
            raise HTTPException(status_code=400, detail="Provide audio_base64 or audio_url")

        if len(audio) == 0:
            raise HTTPException(status_code=400, detail="Empty audio data")

        audio = processor.preprocess(audio)
        features = processor.extract_features(audio)

        result = classifier.classify(features, audio, sr)
        is_threat = result.get("is_threat", False)

        clip_path = processor.save_clip(audio)
        clip_filename = os.path.basename(clip_path)
        clip_url = storage.get_public_url(clip_filename)

        if is_threat and result.get("confidence", 0) >= settings.CONFIDENCE_THRESHOLD:
            threat_type = result["threat_type"]
            payload = AudioAnalysisResponse(
                status="ALERT",
                threat_type=threat_type.value,
                detected_sound=result["detected_sound"].value if result.get("detected_sound") else None,
                confidence_score=result["confidence"],
                timestamp=timestamp,
                sensor_id=request.sensor_id,
                audio_snippet_url=clip_url,
                action_required=ACTION_MAP.get(threat_type, "Verification"),
                noise_profile=None,
                processing_ms=round((time.time() - start) * 1000, 2),
            )
        else:
            payload = AudioAnalysisResponse(
                status="NORMAL",
                threat_type=None,
                detected_sound=None,
                confidence_score=result.get("confidence", 0.95),
                timestamp=timestamp,
                sensor_id=request.sensor_id,
                audio_snippet_url=clip_url,
                action_required=None,
                noise_profile=result.get("noise_profile", "Ambient Jungle Noise"),
                processing_ms=round((time.time() - start) * 1000, 2),
            )

        logger.info(
            f"[{request.sensor_id}] {payload.status} "
            f"sound={payload.detected_sound} conf={payload.confidence_score}"
        )
        return {"success": True, "data": payload}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/clips/{filename}")
def serve_clip(filename: str):
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Clip not found")
    return FileResponse(filepath, media_type="audio/wav")


@app.post("/batch-analyze")
def batch_analyze(requests: list[AudioAnalysisRequest]):
    results = []
    for req in requests:
        try:
            res = analyze_audio(req)
            results.append(res)
        except Exception as e:
            results.append({"sensor_id": req.sensor_id, "error": str(e), "success": False})
    return {"success": True, "data": {"results": results, "count": len(results)}}
