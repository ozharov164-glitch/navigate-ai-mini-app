"""Валидация загружаемых файлов (фото, голос)."""
import logging

from fastapi import HTTPException, UploadFile

from backend.app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024

ALLOWED_IMAGE = {b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a", b"RIFF"}
ALLOWED_AUDIO_PREFIXES = (b"OggS", b"RIFF", b"\x1a\x45\xdf\xa3", b"ID3", b"\xff\xfb", b"\xff\xf3")

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_AUDIO_EXT = {".ogg", ".oga", ".webm", ".mp3", ".m4a", ".wav", ".opus"}


def _ext(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


async def read_upload_limited(file: UploadFile, *, kind: str) -> tuple[bytes, str]:
    """Читает файл с лимитом размера и проверкой типа."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 64)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_BYTES:
            raise HTTPException(413, f"Файл больше {settings.max_upload_size_mb} МБ")
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise HTTPException(400, "Пустой файл")

    ext = _ext(file.filename)
    if kind == "image":
        if ext and ext not in ALLOWED_IMAGE_EXT:
            raise HTTPException(400, "Допустимы изображения: jpg, png, gif, webp")
        if not any(data.startswith(sig) for sig in ALLOWED_IMAGE):
            logger.warning("Image magic bytes mismatch for %s", file.filename)
    elif kind == "audio":
        if ext and ext not in ALLOWED_AUDIO_EXT:
            raise HTTPException(400, "Допустимы аудио: ogg, webm, mp3, m4a, wav")
        if not any(data.startswith(p) for p in ALLOWED_AUDIO_PREFIXES):
            logger.warning("Audio magic bytes mismatch for %s", file.filename)

    return data, file.filename or ("photo.jpg" if kind == "image" else "voice.ogg")
