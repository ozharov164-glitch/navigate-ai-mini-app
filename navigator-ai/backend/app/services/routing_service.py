"""Маршрутизация: Яндекс.Карты (с ключом) или ссылка fallback."""
import logging
from datetime import date

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set
from backend.app.models.user import User
from backend.app.services.yandex_maps import yandex_maps

settings = get_settings()
logger = logging.getLogger(__name__)


class RoutingService:
    def _count_key(self) -> str:
        return f"yandex:count:{date.today().isoformat()}"

    async def yandex_requests_today(self) -> int:
        count = await cache_get(self._count_key())
        return int(count) if count is not None else 0

    async def static_map_allowed(self) -> bool:
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

    async def route(
        self,
        user: User,
        from_address: str,
        to_address: str,
        mode: str = "auto",
    ) -> dict:
        """Яндекс при наличии ключа и лимита, иначе текст + ссылка yandex.ru/maps."""
        _ = user  # выбор провайдера убран — всегда Яндекс
        if await self._yandex_allowed():
            try:
                allow_static = await self.static_map_allowed()
                result = await yandex_maps.route(
                    from_address, to_address, mode, static_map=allow_static
                )
                await self._inc_yandex()
                if not result.get("route_data", {}).get("fallback"):
                    return result
            except Exception as exc:
                logger.warning("Yandex route failed: %s", exc)

        return yandex_maps._fallback_route(from_address, to_address, mode)


routing_service = RoutingService()
