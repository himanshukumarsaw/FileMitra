from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ML_SERVICE_PORT: int = 8000
    ML_SERVICE_HOST: str = "0.0.0.0"
    UPLOAD_DIR: str = "./uploads"
    MAX_AUDIO_SIZE_MB: int = 25
    CONFIDENCE_THRESHOLD: float = 0.85
    MODEL_PATH: str = "./models/threat_classifier.onnx"
    SAMPLE_RATE: int = 22050
    N_FFT: int = 2048
    HOP_LENGTH: int = 512
    N_MFCC: int = 40
    AUDIO_CLIP_DURATION_SEC: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
