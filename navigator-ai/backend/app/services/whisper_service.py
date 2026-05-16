"""Локальная транскрипция Whisper на VPS (без OpenRouter)."""
import logging

import httpx

from backend.app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class WhisperService:
    async def transcribe(self, audio_bytes: bytes, filename: str = "voice.ogg") -> str | None:
        if not settings.whisper_enabled:
            return None
        base = settings.whisper_url.rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                # OpenAI-совместимый API (faster-whisper-server)
                resp = await client.post(
                    f"{base}/v1/audio/transcriptions",
                    files={"file": (filename, audio_bytes, "application/octet-stream")},
                    data={"model": settings.whisper_model, "language": "ru"},
                )
                if resp.status_code != 200:
                    logger.warning("Whisper HTTP %s: %s", resp.status_code, resp.text[:200])
                    return None
                data = resp.json()
                text = (data.get("text") or "").strip()
                return text or None
        except Exception as exc:
            logger.warning("Whisper unavailable: %s", exc)
            return None


whisper_service = WhisperService()
