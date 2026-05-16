"""Маршрутизация через публичный OSRM + Nominatim (без данных карт на VPS)."""
import logging

from backend.app.models.user import User
from backend.app.services.osrm_maps import osrm_maps

logger = logging.getLogger(__name__)


class RoutingService:
    async def route(
        self,
        user: User,
        from_address: str,
        to_address: str,
        mode: str = "auto",
    ) -> dict:
        """Геокод и маршрут — внешние API; на сервере только кэш Redis."""
        _ = user
        try:
            return await osrm_maps.route(from_address, to_address, mode)
        except Exception as exc:
            logger.warning("OSRM route failed: %s", exc)
            return osrm_maps._link_only(from_address, to_address, mode, reason="error")


routing_service = RoutingService()
