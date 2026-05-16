# НавигаторAI — отчёт для Grok (продолжение работы)

> **Дата:** 16 мая 2026 (обновление P1+P2)  
> **Commit:** см. `git log -1` на `main`  
> **Главный brief:** `GROK_OPTIMIZATION_BRIEF_RU.md`

### Статус деплоя

| Компонент | Статус |
|-----------|--------|
| Backend VPS | ✅ (после `deploy-to-vps.sh` + `alembic upgrade head`) |
| Mini App gh-pages | ✅ push `main` |
| OSRM self-hosted | ⚠️ нужен `setup-osrm-data.sh` + volume |
| Whisper | ⚠️ `docker compose --profile whisper` + `WHISPER_ENABLED=true` |

---

## 1. Сделано в релизе P1+P2

### P1 — инфраструктура ✅

- `osrm` сервис в `docker-compose.prod.yml`, `OSRM_BASE_URL=http://osrm:5000`
- Fallback на публичный OSRM в `osrm_maps.py`
- Static Yandex отключается при `yandex:count > 700` (`YANDEX_STATIC_DISABLE_ABOVE`)
- Debounce 2s в `QuickTemplates.tsx`
- `RoutesPage` — badge провайдера + preview карты + Framer Motion

### P2 — продукт ✅

- Whisper сервис (profile `whisper`), `whisper_service.py`
- Голос/фото **только Premium** (`PREMIUM_ONLY_MULTIMEDIA`, bot + Mini App VoiceFab)
- Framer Motion: ValueBanner, DbInsights, ShareCard, Routes, templates

### Продукт и UI ✅

- DB insights расширены (до 8, без LLM)
- «Умный день» — детальный промпт + контекст в `context_builder`
- Персональные шаблоны: таблица `user_templates`, API, `PersonalTemplates.tsx`
- ShareCard — превью streak/achievements
- Светлая тема полирована в `index.css`

---

## 2. Backlog (следующие шаги)

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Запустить `setup-osrm-data.sh` на VPS | P0 |
| 2 | Включить Whisper при росте голоса | P1 |
| 3 | OpenRouter monthly cap $25–30 | P0 |
| 4 | Юридическая проверка Яндекс Maps | P2 |

---

## 3. Env (актуально)

```env
OSRM_BASE_URL=http://osrm:5000
OSRM_PUBLIC_FALLBACK=https://router.project-osrm.org
YANDEX_STATIC_DISABLE_ABOVE=700
WHISPER_ENABLED=false
WHISPER_URL=http://whisper:8000
PREMIUM_ONLY_MULTIMEDIA=true
FREE_DAILY_ACTIONS=10
PREMIUM_DAILY_ACTIONS=50
```

---

## 4. Ключевые файлы

```
docker-compose.prod.yml
backend/app/services/routing_service.py
backend/app/services/whisper_service.py
backend/app/services/product_insights_service.py
backend/app/models/content.py (UserTemplate)
alembic/versions/003_user_templates.py
frontend/src/pages/RoutesPage.tsx
frontend/src/components/PersonalTemplates.tsx
frontend/src/components/ValueBanner.tsx
```

---

*Формат ответа Grok: UX → LLM до/после → $/мес → env → файлы → риск.*
