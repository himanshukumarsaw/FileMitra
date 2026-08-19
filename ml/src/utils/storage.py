import os
import uuid
from pathlib import Path
from loguru import logger

from ml.src.config import settings


class ClipStorage:
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, content: bytes) -> str:
        path = self.base_dir / filename
        path.write_bytes(content)
        logger.info(f"Saved clip: {path}")
        return str(path)

    def get_public_url(self, filename: str, base_url: str = "http://localhost:8000") -> str:
        return f"{base_url}/clips/{filename}"

    def generate_filename(self, sensor_id: str, timestamp: str) -> str:
        safe_ts = timestamp.replace(":", "-").replace(".", "-")
        return f"{sensor_id}_{safe_ts}_{uuid.uuid4().hex[:8]}.wav"
