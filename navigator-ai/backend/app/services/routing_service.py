"""Единая маршрутизация: Яндекс (пробки) / OSRM (эконом) / fallback."""
import logging
from datetime import date

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set
from backend.app.models.user import User
from backend.app.services.osrm_maps import osrm_maps
from backend.app.services.yandex_maps import yandex_maps

settings = get_settings()
logger = logging.getLogger(__name__)

PROVIDERS = ("auto", "yandex", "osrm")


class RoutingService:
    async def _yandex_allowed(self) -> bool:
        """Суточный лимит запросов к Яндекс API (глобальный счётчик в Redis)."""
        if not settings.yandex_maps_api_key:
            return False
        key = f"yandex:count:{date.today().isoformat()}"
        count = await cache_get(key)
        n = int(count) if count is not None else 0
        return n < settings.yandex_daily_limit

    async def _inc_yandex(self) -> None:
        key = f"yandex:count:{date.today().isoformat()}"
        count = await cache_get(key)
        n = int(count) if count is not None else 0
        await cache_set(key, n + 1, ttl=86400 * 2)

    def _resolve_provider(self, user: User) -> str:
        p = (user.route_provider or "auto").lower()
        return p if p in PROVIDERS else "auto"

    async def route(
        self,
        user: User,
        from_address: str,
        to_address: str,
        mode: str = "auto",
    ) -> dict:
        provider = self._resolve_provider(user)

        if provider == "osrm":
            return await osrm_maps.route(from_address, to_address, mode)

        if provider == "yandex":
            if settings.yandex_maps_api_key:
                try:
                    result = await yandex_maps.route(from_address, to_address, mode)
                    await self._inc_yandex()
                    return result
                except Exception as exc:
                    logger.warning("Yandex route failed: %s", exc)
            return yandex_maps._fallback_route(from_address, to_address, mode)

        # auto: Яндекс если ключ и лимит, иначе OSRM, иначе ссылка
        if settings.yandex_maps_api_key and await self._yandex_allowed():
            try:
                result = await yandex_maps.route(from_address, to_address, mode)
                await self._inc_yandex()
                if result.get("route_data", {}).get("fallback"):
                    return await osrm_maps.route(from_address, to_address, mode)
                return result
            except Exception as exc:
                logger.warning("Yandex auto failed, OSRM fallback: %s", exc)

        try:
            return await osrm_maps.route(from_address, to_address, mode)
        except Exception as exc:
            logger.warning("OSRM failed: %s", exc)
            return yandex_maps._fallback_route(from_address, to_address, mode)


routing_service = RoutingService()
