"""OSRM + Nominatim — бесплатная маршрутизация без ключа Яндекса."""
import hashlib
import logging
from typing import Any
from urllib.parse import quote

import httpx

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set

settings = get_settings()
logger = logging.getLogger(__name__)

# Публичный OSRM (для production лучше свой инстанс на VPS)
OSRM_PROFILE = {"auto": "driving", "transit": "driving", "pedestrian": "foot"}


class OsrmMapsService:
    async def geocode(self, address: str) -> dict[str, Any] | None:
        cache_key = f"osrm_geo:{hashlib.md5(address.encode()).hexdigest()}"
        if cached := await cache_get(cache_key):
            return cached

        params = {"q": address, "format": "json", "limit": 1, "accept-language": "ru"}
        headers = {"User-Agent": "NavigAI/1.0 (telegram mini app)"}
        try:
            async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
                resp = await client.get(f"{settings.nominatim_url.rstrip('/')}/search", params=params)
                if resp.status_code != 200:
                    logger.warning("Nominatim %s for %s", resp.status_code, address[:40])
                    return None
                data = resp.json()
        except Exception as exc:
            logger.warning("Nominatim error: %s", exc)
            return None

        if not data:
            return None
        item = data[0]
        result = {
            "address": item.get("display_name", address),
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
        }
        await cache_set(cache_key, result, ttl=settings.cache_ttl_seconds)
        return result

    async def route(
        self,
        from_address: str,
        to_address: str,
        mode: str = "auto",
    ) -> dict[str, Any]:
        cache_key = f"osrm_route:{hashlib.md5(f'{from_address}|{to_address}|{mode}'.encode()).hexdigest()}"
        if cached := await cache_get(cache_key):
            return cached

        from_geo = await self.geocode(from_address)
        to_geo = await self.geocode(to_address)
        if not from_geo or not to_geo:
            return self._link_only(from_address, to_address, mode, reason="geocode_failed")

        profile = OSRM_PROFILE.get(mode, "driving")
        coords = f"{from_geo['lon']},{from_geo['lat']};{to_geo['lon']},{to_geo['lat']}"
        duration_minutes = 30
        distance_km = 5.0
        bases = [settings.osrm_base_url.rstrip("/")]
        pub = settings.osrm_public_fallback.rstrip("/")
        if pub and pub not in bases:
            bases.append(pub)

        for base in bases:
            url = f"{base}/route/v1/{profile}/{coords}"
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(url, params={"overview": "false", "steps": "false"})
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("code") == "Ok" and data.get("routes"):
                            r0 = data["routes"][0]
                            duration_minutes = max(1, int(r0.get("duration", 1800) / 60))
                            distance_km = round(r0.get("distance", 5000) / 1000, 1)
                            break
                    else:
                        logger.warning("OSRM %s HTTP %s", base, resp.status_code)
            except Exception as exc:
                logger.warning("OSRM %s error: %s", base, exc)

        maps_url = self._maps_link(from_geo, to_geo)
        static_map = self._static_map_url(from_geo, to_geo)

        result = {
            "from_address": from_geo["address"],
            "to_address": to_geo["address"],
            "duration_minutes": duration_minutes,
            "distance_km": distance_km,
            "traffic_level": "normal",
            "static_map_url": static_map,
            "yandex_maps_url": maps_url,  # поле в БД: ссылка «открыть маршрут»
            "route_data": {"provider": "osrm", "mode": mode},
        }
        await cache_set(cache_key, result, ttl=settings.cache_ttl_seconds)
        return result

    def _static_map_url(self, from_geo: dict, to_geo: dict) -> str:
        """Статическая карта OSM (без API-ключа)."""
        lat1, lon1 = from_geo["lat"], from_geo["lon"]
        lat2, lon2 = to_geo["lat"], to_geo["lon"]
        center_lat = (lat1 + lat2) / 2
        center_lon = (lon1 + lon2) / 2
        return (
            "https://staticmap.openstreetmap.de/staticmap.php?"
            f"center={center_lat},{center_lon}&zoom=12&size=450x300&maptype=mapnik"
            f"&markers={lat1},{lon1},red-pushpin|{lat2},{lon2},blue-pushpin"
        )

    def _maps_link(self, from_geo: dict, to_geo: dict) -> str:
        """Ссылка на маршрут (Google Maps — без ключа)."""
        return (
            "https://www.google.com/maps/dir/?api=1"
            f"&origin={from_geo['lat']},{from_geo['lon']}"
            f"&destination={to_geo['lat']},{to_geo['lon']}"
            "&travelmode=driving"
        )

    def _link_only(self, from_address: str, to_address: str, mode: str, reason: str = "") -> dict[str, Any]:
        q_from, q_to = quote(from_address), quote(to_address)
        return {
            "from_address": from_address,
            "to_address": to_address,
            "duration_minutes": 35,
            "distance_km": 8.0,
            "traffic_level": "unknown",
            "static_map_url": "",
            "yandex_maps_url": (
                f"https://www.google.com/maps/dir/?api=1&origin={q_from}&destination={q_to}"
            ),
            "route_data": {"provider": "link_only", "mode": mode, "reason": reason},
        }


osrm_maps = OsrmMapsService()
