import io
import base64
import os
import uuid
from typing import Tuple, Optional
import numpy as np
import librosa
import soundfile as sf
from loguru import logger

from ml.src.config import settings


class AudioProcessor:
    def __init__(self):
        self.sample_rate = settings.SAMPLE_RATE
        self.n_fft = settings.N_FFT
        self.hop_length = settings.HOP_LENGTH
        self.n_mfcc = settings.N_MFCC
        self.clip_duration = settings.AUDIO_CLIP_DURATION_SEC
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def load_audio_from_base64(self, b64_data: str) -> Tuple[np.ndarray, int]:
        raw = base64.b64decode(b64_data)
        return self._decode_buffer(raw)

    def load_audio_from_url(self, url: str) -> Tuple[np.ndarray, int]:
        import requests

        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return self._decode_buffer(resp.content)

    def _decode_buffer(self, data: bytes) -> Tuple[np.ndarray, int]:
        with sf.SoundFile(io.BytesIO(data)) as f:
            audio = f.read(dtype="float32")
            sr = f.samplerate
        if sr != self.sample_rate:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)
        return audio, self.sample_rate

    def save_clip(self, audio: np.ndarray) -> str:
        filename = f"{uuid.uuid4().hex}.wav"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        sf.write(filepath, audio, self.sample_rate)
        return filepath

    def extract_features(self, audio: np.ndarray) -> dict:
        try:
            mfcc = librosa.feature.mfcc(
                y=audio,
                sr=self.sample_rate,
                n_mfcc=self.n_mfcc,
                n_fft=self.n_fft,
                hop_length=self.hop_length,
            )
            chroma = librosa.feature.chroma_stft(
                y=audio, sr=self.sample_rate, n_fft=self.n_fft, hop_length=self.hop_length
            )
            spectral_contrast = librosa.feature.spectral_contrast(
                y=audio, sr=self.sample_rate, n_fft=self.n_fft, hop_length=self.hop_length
            )
            zcr = librosa.feature.zero_crossing_rate(
                y=audio, frame_length=self.n_fft, hop_length=self.hop_length
            )
            rms = librosa.feature.rms(y=audio, frame_length=self.n_fft, hop_length=self.hop_length)
            spectral_centroid = librosa.feature.spectral_centroid(
                y=audio, sr=self.sample_rate, n_fft=self.n_fft, hop_length=self.hop_length
            )
            bandwidth = librosa.feature.spectral_bandwidth(
                y=audio, sr=self.sample_rate, n_fft=self.n_fft, hop_length=self.hop_length
            )
            rolloff = librosa.feature.spectral_rolloff(
                y=audio, sr=self.sample_rate, n_fft=self.n_fft, hop_length=self.hop_length
            )

            return {
                "mfcc_mean": np.mean(mfcc, axis=1).tolist(),
                "mfcc_std": np.std(mfcc, axis=1).tolist(),
                "chroma_mean": np.mean(chroma, axis=1).tolist(),
                "spectral_contrast_mean": np.mean(spectral_contrast, axis=1).tolist(),
                "zcr_mean": float(np.mean(zcr)),
                "zcr_std": float(np.std(zcr)),
                "rms_mean": float(np.mean(rms)),
                "rms_std": float(np.std(rms)),
                "spectral_centroid_mean": float(np.mean(spectral_centroid)),
                "bandwidth_mean": float(np.mean(bandwidth)),
                "rolloff_mean": float(np.mean(rolloff)),
                "duration_sec": float(len(audio) / self.sample_rate),
            }
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            raise

    def normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        if np.max(np.abs(audio)) > 0:
            audio = audio / np.max(np.abs(audio))
        return audio

    def trim_silence(self, audio: np.ndarray, top_db: int = 30) -> np.ndarray:
        trimmed, _ = librosa.effects.trim(audio, top_db=top_db)
        return trimmed if len(trimmed) > 0 else audio

    def preprocess(self, audio: np.ndarray) -> np.ndarray:
        audio = self.normalize_audio(audio)
        audio = self.trim_silence(audio)
        return audio
