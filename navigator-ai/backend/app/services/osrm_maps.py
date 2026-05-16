"""OSRM + Nominatim — маршрут и превью OSM; ссылка открытия — Яндекс.Карты."""
import base64
import hashlib
import logging
import math
from io import BytesIO
from typing import Any
from urllib.parse import quote

import httpx
from PIL import Image, ImageDraw

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set

settings = get_settings()
logger = logging.getLogger(__name__)

OSRM_PROFILE = {"auto": "driving", "transit": "driving", "pedestrian": "foot"}
TILE_SIZE = 256
OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
MAX_MAP_TILES = 16


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

        markers = quote(f"{lat1},{lon1},red|{lat2},{lon2},blue")
        urls.append(
            "https://staticmap.openstreetmap.de/staticmap.php?"
            f"center={center_lat},{center_lon}&zoom={zoom}&size=450x300&maptype=mapnik"
            f"&markers={markers}"
        )
        return urls

    def _lonlat_to_tile(self, lat: float, lon: float, zoom: int) -> tuple[int, int]:
        lat_rad = math.radians(lat)
        n = 2**zoom
        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return x, y

    def _tile_bbox(self, min_lat: float, max_lat: float, min_lon: float, max_lon: float, zoom: int) -> tuple[int, int, int, int]:
        xs, ys = [], []
        for lat, lon in (
            (min_lat, min_lon),
            (min_lat, max_lon),
            (max_lat, min_lon),
            (max_lat, max_lon),
        ):
            x, y = self._lonlat_to_tile(lat, lon, zoom)
            xs.append(x)
            ys.append(y)
        return min(xs), max(xs), min(ys), max(ys)

    async def _render_osm_tiles(self, from_geo: dict, to_geo: dict) -> tuple[bytes, str]:
        """Сборка превью из OSM-тайлов (fallback, если staticmap недоступен)."""
        lat1, lon1 = from_geo["lat"], from_geo["lon"]
        lat2, lon2 = to_geo["lat"], to_geo["lon"]
        min_lat, max_lat = min(lat1, lat2), max(lat1, lat2)
        min_lon, max_lon = min(lon1, lon2), max(lon1, lon2)
        pad = max(0.02, (max_lat - min_lat + max_lon - min_lon) * 0.12)
        min_lat -= pad
        max_lat += pad
        min_lon -= pad
        max_lon += pad

        span = max(max_lat - min_lat, max_lon - min_lon)
        zoom = 11 if span < 0.08 else 10 if span < 0.2 else 9 if span < 0.5 else 8 if span < 1 else 7 if span < 3 else 6

        x_min, x_max, y_min, y_max = self._tile_bbox(min_lat, max_lat, min_lon, max_lon, zoom)
        while (x_max - x_min + 1) * (y_max - y_min + 1) > MAX_MAP_TILES and zoom > 5:
            zoom -= 1
            x_min, x_max, y_min, y_max = self._tile_bbox(min_lat, max_lat, min_lon, max_lon, zoom)

        w = (x_max - x_min + 1) * TILE_SIZE
        h = (y_max - y_min + 1) * TILE_SIZE
        canvas = Image.new("RGB", (w, h), (230, 235, 230))
        headers = {"User-Agent": "NavigAI/1.0 (+https://t.me/NavigAI_bot)"}

        async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
            for x in range(x_min, x_max + 1):
                for y in range(y_min, y_max + 1):
                    resp = await client.get(OSM_TILE_URL.format(z=zoom, x=x, y=y))
                    if resp.status_code == 200 and len(resp.content) > 100:
                        tile = Image.open(BytesIO(resp.content)).convert("RGB")
                        canvas.paste(tile, ((x - x_min) * TILE_SIZE, (y - y_min) * TILE_SIZE))

        def to_px(lat: float, lon: float) -> tuple[int, int]:
            n = 2**zoom
            xf = (lon + 180.0) / 360.0 * n
            yf = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
            return int((xf - x_min) * TILE_SIZE), int((yf - y_min) * TILE_SIZE)

        draw = ImageDraw.Draw(canvas)
        for lat, lon, fill in ((lat1, lon1, "#ef4444"), (lat2, lon2, "#3b82f6")):
            px, py = to_px(lat, lon)
            r = 10
            draw.ellipse((px - r, py - r, px + r, py + r), fill=fill, outline="white", width=2)

        out = canvas.resize((450, 300), Image.Resampling.LANCZOS)
        buf = BytesIO()
        out.save(buf, format="PNG")
        return buf.getvalue(), "image/png"

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

        try:
            body, ctype = await self._render_osm_tiles(from_geo, to_geo)
            await cache_set(
                cache_key,
                {"body_b64": base64.b64encode(body).decode("ascii"), "ctype": ctype},
                ttl=settings.cache_ttl_seconds,
            )
            return body, ctype
        except Exception as exc:
            logger.warning("OSM tile render failed: %s", exc)
            raise RuntimeError("static map unavailable") from exc

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
