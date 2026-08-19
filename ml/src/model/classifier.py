import hashlib
import os
import random
from typing import Optional
import numpy as np
import librosa
from loguru import logger

from ml.src.model.threats import (
    THREAT_CLASSES,
    AMBIENT_CLASSES,
    DetectedSound,
    ThreatType,
)
from ml.src.config import settings


class ThreatClassifier:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.MODEL_PATH
        self._model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                import onnxruntime as ort

                self._model = ort.InferenceSession(self.model_path)
                logger.info(f"Loaded ONNX model from {self.model_path}")
            except Exception as e:
                logger.warning(f"Failed to load ONNX model: {e}. Using heuristic classifier.")
        else:
            logger.info("No ONNX model found. Using heuristic feature-based classifier.")

    def classify(self, features: dict, audio: np.ndarray, sr: int) -> dict:
        if self._model is not None:
            return self._classify_onnx(features)
        return self._classify_heuristic(features, audio, sr)

    def _classify_onnx(self, features: dict) -> dict:
        try:
            input_name = self._model.get_inputs()[0].name
            feature_vector = self._build_feature_vector(features)
            outputs = self._model.run(None, {input_name: feature_vector.astype(np.float32).reshape(1, -1)})
            logits = outputs[0][0]
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / exp_logits.sum()
            class_names = list(THREAT_CLASSES.keys()) + list(AMBIENT_CLASSES)
            best_idx = int(np.argmax(probs))
            best_class = class_names[best_idx] if best_idx < len(class_names) else "unknown"
            confidence = float(probs[best_idx])
            return self._map_class_to_result(best_class, confidence)
        except Exception as e:
            logger.error(f"ONNX inference failed: {e}. Falling back to heuristic.")
            return self._classify_heuristic({}, np.array([]), 0)

    def _classify_heuristic(self, features: dict, audio: np.ndarray, sr: int) -> dict:
        rms = features.get("rms_mean", 0.0)
        zcr = features.get("zcr_mean", 0.0)
        centroid = features.get("spectral_centroid_mean", 0.0)
        bandwidth = features.get("bandwidth_mean", 0.0)
        duration = features.get("duration_sec", 0.0)
        rolloff = features.get("rolloff_mean", 0.0)
        mfcc_std = np.array(features.get("mfcc_std", [0] * 40))

        if rms < 0.005 and zcr < 0.02:
            return self._ambient_result("Low energy ambient", 0.97)

        onset_env = librosa.onset.onset_strength(y=audio, sr=sr) if len(audio) > 0 else np.array([0])
        onset_peak = float(np.max(onset_env)) if len(onset_env) > 0 else 0.0

        if onset_peak > 0.6 and rms > 0.05 and bandwidth > 2000:
            if duration < 0.8:
                confidence = min(0.95, 0.7 + onset_peak * 0.3)
                if zcr > 0.3:
                    return self._threat_result("rifle_crack", confidence)
                return self._threat_result("gunshot", confidence)

        if rms > 0.04 and zcr > 0.15 and 3000 < centroid < 8000 and duration > 0.8:
            harmonic, percussive = librosa.effects.hpss(audio, margin=0.4)
            harmonic_rms = float(np.sqrt(np.mean(harmonic**2)))
            percussive_rms = float(np.sqrt(np.mean(percussive**2)))
            if harmonic_rms > 0.02 and percussive_rms > 0.01:
                noise_ratio = percussive_rms / (harmonic_rms + 1e-10)
                confidence = min(0.96, 0.6 + noise_ratio * 0.3)
                if noise_ratio > 0.6:
                    return self._threat_result("chainsaw", confidence)
                return self._threat_result("mechanical_saw", confidence)

        if rms > 0.03 and zcr > 0.25 and duration > 0.5:
            if np.mean(mfcc_std[:5]) > 40:
                confidence = min(0.94, 0.65 + np.mean(mfcc_std[:5]) * 0.005)
                if rms > 0.06:
                    return self._threat_result("fire_crackle", confidence)
                return self._threat_result("animal_distress", confidence)

        if rms > 0.02 and 100 < centroid < 2000 and duration > 1.0:
            if 0.03 < zcr < 0.2:
                confidence = min(0.93, 0.6 + rms * 2)
                if rms > 0.05:
                    return self._threat_result("heavy_machinery", confidence)
                return self._threat_result("human_shouting", confidence)

        if onset_peak > 0.4 and 500 < centroid < 3000 and duration < 1.5:
            confidence = min(0.91, 0.55 + onset_peak * 0.3)
            return self._threat_result("trap_snap", confidence)

        if rms > 0.02 and zcr > 0.1 and centroid > 3000:
            confidence = min(0.90, 0.55 + zcr * 0.5)
            return self._threat_result("fire_flare_up", confidence)

        return self._ambient_result("Ambient Jungle Noise", 0.96)

    def _threat_result(self, class_name: str, confidence: float) -> dict:
        mapping = THREAT_CLASSES.get(class_name, {})
        threat_type = mapping.get("threat_type", ThreatType.Poaching)
        sound = mapping.get("sound", DetectedSound.Human_Shouting)
        return {
            "is_threat": True,
            "class_name": class_name,
            "threat_type": threat_type,
            "detected_sound": sound,
            "confidence": round(confidence, 4),
        }

    def _ambient_result(self, noise_profile: str, confidence: float) -> dict:
        return {
            "is_threat": False,
            "class_name": "ambient",
            "threat_type": None,
            "detected_sound": None,
            "confidence": round(confidence, 4),
            "noise_profile": noise_profile,
        }

    def _map_class_to_result(self, class_name: str, confidence: float) -> dict:
        if class_name in THREAT_CLASSES:
            return self._threat_result(class_name, confidence)
        if class_name in AMBIENT_CLASSES or class_name == "ambient":
            return self._ambient_result("Ambient Jungle Noise", confidence)
        return self._ambient_result("Ambient Jungle Noise", 0.5)

    def _build_feature_vector(self, features: dict) -> np.ndarray:
        vec = []
        vec.extend(features.get("mfcc_mean", [0] * 40))
        vec.extend(features.get("mfcc_std", [0] * 40))
        vec.extend(features.get("chroma_mean", [0] * 12))
        vec.extend(features.get("spectral_contrast_mean", [0] * 7))
        vec.append(features.get("zcr_mean", 0.0))
        vec.append(features.get("zcr_std", 0.0))
        vec.append(features.get("rms_mean", 0.0))
        vec.append(features.get("rms_std", 0.0))
        vec.append(features.get("spectral_centroid_mean", 0.0))
        vec.append(features.get("bandwidth_mean", 0.0))
        vec.append(features.get("rolloff_mean", 0.0))
        vec.append(features.get("duration_sec", 0.0))
        return np.array(vec, dtype=np.float32)
