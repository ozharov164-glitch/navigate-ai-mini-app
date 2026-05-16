"""Rate limiting per user (Redis sliding window)."""
import logging
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.core.config import get_settings
from backend.app.core.redis_client import get_redis

settings = get_settings()
logger = logging.getLogger(__name__)

# Лимиты запросов в минуту на пользователя (по telegram_id / bot secret)
USER_LIMIT_PER_MINUTE = 30
BOT_INTERNAL_LIMIT_PER_MINUTE = 120


async def _check_limit(key: str, limit: int, window_sec: int = 60) -> bool:
    """True если лимит не превышен."""
    r = await get_redis()
    if not r:
        return True
    now = int(time.time())
    bucket = f"rl:{key}:{now // window_sec}"
    count = await r.incr(bucket)
    if count == 1:
        await r.expire(bucket, window_sec + 1)
    return count <= limit


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in ("/health", "/api/docs", "/openapi.json"):
            return await call_next(request)

        if path.startswith("/api/internal/bot"):
            secret = request.headers.get("X-Bot-Secret", "anon")[:16]
            ok = await _check_limit(f"bot:{secret}", BOT_INTERNAL_LIMIT_PER_MINUTE)
            if not ok:
                logger.warning("Rate limit bot internal: %s", path)
                return JSONResponse(429, {"detail": "Слишком много запросов. Подождите минуту."})
            return await call_next(request)

        if path.startswith("/api/"):
            init_data = request.headers.get("X-Telegram-Init-Data", "")
            user_key = str(hash(init_data))[:12] if init_data else request.client.host if request.client else "anon"
            ok = await _check_limit(f"user:{user_key}", USER_LIMIT_PER_MINUTE)
            if not ok:
                logger.warning("Rate limit user: %s", path)
                return JSONResponse(429, {"detail": "Слишком много запросов. Подождите минуту."})

        return await call_next(request)
