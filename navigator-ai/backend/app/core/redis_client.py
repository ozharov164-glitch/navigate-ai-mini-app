"""Redis-клиент для кэша и фоновых задач (при недоступности Redis — no-op)."""
import json
import logging
from typing import Any

import redis.asyncio as redis

from backend.app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)
_redis: redis.Redis | None = None
_redis_unavailable = False


async def get_redis() -> redis.Redis | None:
    global _redis, _redis_unavailable
    if _redis_unavailable:
        return None
    if _redis is None:
        try:
            client = redis.from_url(settings.redis_url, decode_responses=True)
            await client.ping()
            _redis = client
        except Exception as exc:
            _redis_unavailable = True
            logger.warning("Redis недоступен, кэш отключён: %s", exc)
            return None
    return _redis


async def cache_get(key: str) -> Any | None:
    r = await get_redis()
    if not r:
        return None
    val = await r.get(key)
    if val:
        return json.loads(val)
    return None


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    r = await get_redis()
    if not r:
        return
    await r.set(key, json.dumps(value, ensure_ascii=False), ex=ttl or settings.cache_ttl_seconds)


async def cache_delete(key: str) -> None:
    r = await get_redis()
    if not r:
        return
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    r = await get_redis()
    if not r:
        return
    keys = []
    async for key in r.scan_iter(match=pattern):
        keys.append(key)
    if keys:
        await r.delete(*keys)


async def cache_set_nx(key: str, ttl: int = 86400) -> bool:
    """Устанавливает ключ только если его ещё нет (дедупликация уведомлений)."""
    r = await get_redis()
    if not r:
        return True
    return bool(await r.set(key, "1", ex=ttl, nx=True))
