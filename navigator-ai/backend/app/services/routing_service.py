"""Единая маршрутизация: OSRM (эконом) / Яндекс (пробки) / fallback."""
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
    def _count_key(self) -> str:
        return f"yandex:count:{date.today().isoformat()}"

    async def yandex_requests_today(self) -> int:
        count = await cache_get(self._count_key())
        return int(count) if count is not None else 0

    async def static_map_allowed(self) -> bool:
        """Static Yandex отключается при высоком суточном счётчике."""
        if not settings.yandex_static_map_enabled:
            return False
        n = await self.yandex_requests_today()
        return n <= settings.yandex_static_disable_above

    async def _yandex_allowed(self) -> bool:
        if not settings.yandex_maps_api_key:
            return False
        return await self.yandex_requests_today() < settings.yandex_daily_limit

    async def _inc_yandex(self) -> None:
        n = await self.yandex_requests_today()
        await cache_set(self._count_key(), n + 1, ttl=86400 * 2)

    def _resolve_provider(self, user: User) -> str:
        p = (user.route_provider or "auto").lower()
        return p if p in PROVIDERS else "auto"

    async def _try_yandex(self, from_address: str, to_address: str, mode: str) -> dict | None:
        if not await self._yandex_allowed():
            return None
        try:
            allow_static = await self.static_map_allowed()
            result = await yandex_maps.route(
                from_address, to_address, mode, static_map=allow_static
            )
            await self._inc_yandex()
            if result.get("route_data", {}).get("fallback"):
                return None
            return result
        except Exception as exc:
            logger.warning("Yandex route failed: %s", exc)
            return None

    async def _try_osrm(self, from_address: str, to_address: str, mode: str) -> dict | None:
        try:
            return await osrm_maps.route(from_address, to_address, mode)
        except Exception as exc:
            logger.warning("OSRM failed: %s", exc)
            return None

    async def route(
        self,
        user: User,
        from_address: str,
        to_address: str,
        mode: str = "auto",
    ) -> dict:
        provider = self._resolve_provider(user)

        if provider == "osrm":
            return (await self._try_osrm(from_address, to_address, mode)) or yandex_maps._fallback_route(
                from_address, to_address, mode
            )

        if provider == "yandex":
            y = await self._try_yandex(from_address, to_address, mode)
            if y:
                return y
            o = await self._try_osrm(from_address, to_address, mode)
            return o or yandex_maps._fallback_route(from_address, to_address, mode)

        # auto: Яндекс если доступен, иначе OSRM, иначе ссылка
        y = await self._try_yandex(from_address, to_address, mode)
        if y:
            return y
        o = await self._try_osrm(from_address, to_address, mode)
        if o:
            return o
        return yandex_maps._fallback_route(from_address, to_address, mode)


routing_service = RoutingService()
