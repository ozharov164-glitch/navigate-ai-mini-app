"""Yandex Maps: геокодинг, маршруты, статические карты."""
import hashlib
import logging
from typing import Any
from urllib.parse import quote

import httpx

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set

settings = get_settings()
logger = logging.getLogger(__name__)


class YandexMapsService:
    def _log_yandex_error(self, service: str, status: int, body: str = "") -> None:
        if status in (403, 429):
            logger.error("Yandex %s blocked: HTTP %s — %s", service, status, body[:200])
        else:
            logger.warning("Yandex %s HTTP %s", service, status)

    async def geocode(self, address: str) -> dict[str, Any] | None:
        if not settings.yandex_maps_api_key:
            return None

        cache_key = f"geo:{hashlib.md5(address.encode()).hexdigest()}"
        if cached := await cache_get(cache_key):
            return cached

        params = {
            "apikey": settings.yandex_maps_api_key,
            "geocode": address,
            "format": "json",
            "results": 1,
            "lang": "ru_RU",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(settings.yandex_geocoder_url, params=params)
            if resp.status_code != 200:
                self._log_yandex_error("geocoder", resp.status_code, resp.text)
                return None
            data = resp.json()

        try:
            member = data["response"]["GeoObjectCollection"]["featureMember"][0]["GeoObject"]
            pos = member["Point"]["pos"].split()
            result = {
                "address": member["metaDataProperty"]["GeocoderMetaData"]["text"],
                "lon": float(pos[0]),
                "lat": float(pos[1]),
            }
            await cache_set(cache_key, result, ttl=settings.cache_ttl_seconds)
            return result
        except (KeyError, IndexError):
            return None

    async def route(
        self,
        from_address: str,
        to_address: str,
        mode: str = "auto",
    ) -> dict[str, Any]:
        if not settings.yandex_maps_api_key:
            return self._fallback_route(from_address, to_address, mode)

        cache_key = f"route:{hashlib.md5(f'{from_address}|{to_address}|{mode}'.encode()).hexdigest()}"
        if cached := await cache_get(cache_key):
            return cached

        from_geo = await self.geocode(from_address)
        to_geo = await self.geocode(to_address)
        if not from_geo or not to_geo:
            return self._fallback_route(from_address, to_address, mode)

        routing_mode = {"auto": "driving", "transit": "masstransit", "pedestrian": "walking"}.get(
            mode, "driving"
        )
        waypoints = f"{from_geo['lon']},{from_geo['lat']}|{to_geo['lon']},{to_geo['lat']}"

        params = {
            "apikey": settings.yandex_maps_api_key,
            "waypoints": waypoints,
            "mode": routing_mode,
        }
        duration_minutes = None
        distance_km = None
        traffic_level = "unknown"
        router_ok = False

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(settings.yandex_router_url, params=params)
            if resp.status_code == 200:
                router_ok = True
                data = resp.json()
                try:
                    leg = data["route"]["legs"][0]
                    duration_minutes = int(leg.get("duration", 0) / 60)
                    distance_km = round(leg.get("length", 0) / 1000, 1)
                    traffic_level = "heavy" if duration_minutes and duration_minutes > 45 else "normal"
                except (KeyError, IndexError):
                    pass
            else:
                self._log_yandex_error("router", resp.status_code, resp.text)
                return self._fallback_route(from_address, to_address, mode)

        static_map = ""
        if router_ok and settings.yandex_static_map_enabled:
            static_map = self.static_map_url(from_geo["lon"], from_geo["lat"], to_geo["lon"], to_geo["lat"])

        yandex_url = (
            f"https://yandex.ru/maps/?rtext={from_geo['lat']},{from_geo['lon']}~"
            f"{to_geo['lat']},{to_geo['lon']}&rtt={routing_mode}"
        )

        result = {
            "from_address": from_geo["address"],
            "to_address": to_geo["address"],
            "duration_minutes": duration_minutes or 30,
            "distance_km": distance_km or 5.0,
            "traffic_level": traffic_level,
            "static_map_url": static_map,
            "yandex_maps_url": yandex_url,
            "route_data": {"provider": "yandex", "mode": mode, "waypoints": waypoints},
        }
        await cache_set(cache_key, result, ttl=settings.cache_ttl_seconds)
        return result

    def static_map_url(self, lon1: float, lat1: float, lon2: float, lat2: float) -> str:
        if not settings.yandex_maps_api_key or not settings.yandex_static_map_enabled:
            return ""
        center_lon = (lon1 + lon2) / 2
        center_lat = (lat1 + lat2) / 2
        pt = f"{lon1},{lat1},pm2rdm~{lon2},{lat2},pm2blm"
        return (
            f"{settings.yandex_static_map_url}?l=map&pt={quote(pt)}"
            f"&size=450,300&z=12&ll={center_lon},{center_lat}"
            f"&apikey={settings.yandex_maps_api_key}"
        )

    def _fallback_route(self, from_address: str, to_address: str, mode: str) -> dict[str, Any]:
        q_from = quote(from_address)
        q_to = quote(to_address)
        return {
            "from_address": from_address,
            "to_address": to_address,
            "duration_minutes": 35,
            "distance_km": 8.0,
            "traffic_level": "unknown",
            "static_map_url": "",
            "yandex_maps_url": f"https://yandex.ru/maps/?rtext={q_from}~{q_to}",
            "route_data": {"provider": "yandex", "mode": mode, "fallback": True},
        }


yandex_maps = YandexMapsService()
