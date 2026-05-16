# НавигаторAI — отчёт для Grok

> **Обновление:** OSRM убран. Маршруты только Яндекс + fallback-ссылка.

## Маршруты

- `routing_service.py` — только `YANDEX_MAPS_API_KEY` + лимиты Redis
- Без ключа: `yandex.ru/maps` (время/карта не строятся)
- Переключатель в Mini App **удалён**
- Контейнер `osrm` удалён из `docker-compose.prod.yml`

## Яндекс для владельца

1. Ключ: https://developer.tech.yandex.ru/ → Geocoder, Router, Static Maps
2. `.env`: `YANDEX_MAPS_API_KEY=...`
3. Freemium + платный бот **не запрещает** ключ, но при росте может понадобиться **коммерческая лицензия** Яндекса (см. условия API)

## Env

```env
YANDEX_MAPS_API_KEY=...
YANDEX_DAILY_LIMIT=800
YANDEX_STATIC_DISABLE_ABOVE=700
```
