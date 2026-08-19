from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


ThreatType = Literal["Deforestation", "Wildfire", "Poaching"]
DetectedSound = Literal[
    "Chainsaw",
    "Mechanical Saw",
    "Falling Timber",
    "Heavy Machinery",
    "Fire Crackle",
    "Fire Flare-up",
    "Explosive Burn",
    "Gunshot",
    "Rifle Crack",
    "Animal Distress Call",
    "Metallic Trap Snap",
    "Human Shouting",
]
SoundCategory = Literal["threat", "ambient"]
AlertStatus = Literal["ALERT", "NORMAL"]


class ThreatDetectionPayload(BaseModel):
    status: AlertStatus
    threat_type: Optional[ThreatType] = None
    detected_sound: Optional[DetectedSound] = None
    confidence_score: float
    timestamp: str
    sensor_id: Optional[str] = None
    audio_snippet_url: Optional[str] = None
    action_required: Optional[Literal["Immediate dispatch", "Verification"]] = None
    noise_profile: Optional[str] = None


class AudioAnalysisRequest(BaseModel):
    sensor_id: str
    audio_base64: Optional[str] = None
    audio_url: Optional[str] = None
    clip_duration_sec: Optional[int] = 5
    metadata: Optional[dict] = None


class AudioAnalysisResponse(BaseModel):
    status: AlertStatus
    threat_type: Optional[ThreatType]
    detected_sound: Optional[DetectedSound]
    confidence_score: float
    timestamp: str
    sensor_id: str
    audio_snippet_url: Optional[str]
    action_required: Optional[str]
    noise_profile: Optional[str]
    processing_ms: float
