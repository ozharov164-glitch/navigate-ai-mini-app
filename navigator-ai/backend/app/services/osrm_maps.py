"""OSRM + Nominatim — маршрут и превью OSM; ссылка открытия — Яндекс.Карты."""
import base64
import hashlib
import logging
from typing import Any
from urllib.parse import quote

import httpx

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set

settings = get_settings()
logger = logging.getLogger(__name__)

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

    def yandex_maps_link(self, from_geo: dict, to_geo: dict) -> str:
        """Ссылка для пользователя — Яндекс.Карты (без API-ключа)."""
        return (
            f"https://yandex.ru/maps/?rtext={from_geo['lat']},{from_geo['lon']}~"
            f"{to_geo['lat']},{to_geo['lon']}&rtt=auto"
        )

    def yandex_maps_link_text(self, from_address: str, to_address: str) -> str:
        q_from, q_to = quote(from_address), quote(to_address)
        return f"https://yandex.ru/maps/?rtext={q_from}~{q_to}&rtt=auto"

    def proxy_map_url(self, from_geo: dict, to_geo: dict) -> str:
        """Превью через наш API (обход блокировок static OSM в WebView)."""
        base = settings.public_api_base.rstrip("/")
        return (
            f"{base}/dashboard/map-preview?"
            f"fl={from_geo['lat']}&fo={from_geo['lon']}"
            f"&tl={to_geo['lat']}&tol={to_geo['lon']}"
        )

    def _static_map_remote_urls(self, from_geo: dict, to_geo: dict) -> list[str]:
        lat1, lon1 = from_geo["lat"], from_geo["lon"]
        lat2, lon2 = to_geo["lat"], to_geo["lon"]
        center_lat = (lat1 + lat2) / 2
        center_lon = (lon1 + lon2) / 2
        zoom = 5 if abs(lat1 - lat2) > 2 or abs(lon1 - lon2) > 2 else 10

        urls: list[str] = []

        if settings.yandex_maps_api_key:
            pt = f"{lon1},{lat1},pm2rdm~{lon2},{lat2},pm2blm"
            urls.append(
                f"https://static-maps.yandex.ru/1.x/?l=map&pt={quote(pt)}"
                f"&size=450,300&z={zoom}&ll={center_lon},{center_lat}"
                f"&apikey={settings.yandex_maps_api_key}"
            )

        urls.append(
            "https://staticmap.openstreetmap.fr/staticmap.php?"
            f"center={center_lat},{center_lon}&zoom={zoom}&size=450x300&maptype=mapnik"
            f"&markers={lat1},{lon1},red|{lat2},{lon2},blue"
        )
        return urls

    async def fetch_static_preview(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> tuple[bytes, str]:
        """Скачать картинку маршрута (кэш Redis)."""
        cache_key = f"mapimg:{hashlib.md5(f'{lat1},{lon1},{lat2},{lon2}'.encode()).hexdigest()}"
        if cached := await cache_get(cache_key):
            if isinstance(cached, dict) and cached.get("body_b64"):
                return base64.b64decode(cached["body_b64"]), cached.get("ctype", "image/png")

        from_geo = {"lat": lat1, "lon": lon1}
        to_geo = {"lat": lat2, "lon": lon2}
        headers = {"User-Agent": "NavigAI/1.0"}

        for url in self._static_map_remote_urls(from_geo, to_geo):
            try:
                async with httpx.AsyncClient(timeout=12.0, headers=headers, follow_redirects=True) as client:
                    resp = await client.get(url)
                    ctype = resp.headers.get("content-type", "")
                    if resp.status_code == 200 and "image" in ctype and len(resp.content) > 500:
                        await cache_set(
                            cache_key,
                            {
                                "body_b64": base64.b64encode(resp.content).decode("ascii"),
                                "ctype": ctype,
                            },
                            ttl=settings.cache_ttl_seconds,
                        )
                        return resp.content, ctype
            except Exception as exc:
                logger.warning("Static map fetch failed %s: %s", url[:60], exc)

        raise RuntimeError("static map unavailable")

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
                async with httpx.AsyncClient(timeout=20.0) as client:
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

        result = {
            "from_address": from_geo["address"],
            "to_address": to_geo["address"],
            "duration_minutes": duration_minutes,
            "distance_km": distance_km,
            "traffic_level": "normal",
            "static_map_url": self.proxy_map_url(from_geo, to_geo),
            "yandex_maps_url": self.yandex_maps_link(from_geo, to_geo),
            "route_data": {
                "provider": "osrm",
                "mode": mode,
                "from": {"lat": from_geo["lat"], "lon": from_geo["lon"]},
                "to": {"lat": to_geo["lat"], "lon": to_geo["lon"]},
            },
        }
        await cache_set(cache_key, result, ttl=settings.cache_ttl_seconds)
        return result

    def _link_only(self, from_address: str, to_address: str, mode: str, reason: str = "") -> dict[str, Any]:
        return {
            "from_address": from_address,
            "to_address": to_address,
            "duration_minutes": 35,
            "distance_km": 8.0,
            "traffic_level": "unknown",
            "static_map_url": "",
            "yandex_maps_url": self.yandex_maps_link_text(from_address, to_address),
            "route_data": {"provider": "link_only", "mode": mode, "reason": reason},
        }


osrm_maps = OsrmMapsService()
