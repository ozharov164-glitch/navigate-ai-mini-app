# НавигаторAI — отчёт для Grok

> **Маршруты:** только **публичный OSRM + Nominatim** (интернет). Яндекс отключён.  
> **VPS:** нет тайлов/карт на диске — только HTTP-запросы + Redis-кэш.

## Env

```env
OSRM_BASE_URL=https://router.project-osrm.org
OSRM_PUBLIC_FALLBACK=https://routing.openstreetmap.de
NOMINATIM_URL=https://nominatim.openstreetmap.org
YANDEX_MAPS_API_KEY=
```

## Ограничения публичных сервисов

- Nominatim: ~1 req/s, кэш обязателен
- OSRM demo: не для высокой нагрузки; при росте DAU — платный хостинг OSRM или свой инстанс
- Нет пробок (в отличие от Яндекса)
- Превью карты: staticmap.openstreetmap.de (тоже из интернета)
