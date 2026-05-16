# НавигаторAI — отчёт для Grok (продолжение работы)

> **Дата:** 16 мая 2026  
> **Commit:** `f38a985` — *Production: AI caps, OSRM routing, gamification, DB insights*  
> **Главный brief:** `GROK_OPTIMIZATION_BRIEF_RU.md`  
> **Этот файл:** что уже в production, что делать дальше

### Статус деплоя (16.05.2026)

| Компонент | Статус |
|-----------|--------|
| **Git push** `main` | ✅ `f38a985` |
| **Mini App** (GitHub Actions → gh-pages) | ✅ success |
| **Backend VPS** | ✅ деплой 16.05.2026 (`ba10b1c`) |
| **Alembic на VPS** | ✅ `alembic upgrade head` |

---

## 0. Быстрый контекст

| Ресурс | URL |
|--------|-----|
| Mini App | https://ozharov164-glitch.github.io/navigate-ai-mini-app/ |
| API | https://31-128-42-170.sslip.io/api |
| Health | https://31-128-42-170.sslip.io/health |
| Bot | @NavigAI_bot |
| Repo | https://github.com/ozharov164-glitch/navigate-ai-mini-app |
| Локально | `/Users/dmitriidekhanov/doit_bot/navigator-ai` |
| VPS app | `/opt/navigai/app` |

**Бюджет:** OpenRouter ~$30 — caps и короткий контекст критичны.

---

## 1. Что задеплоено в этом релизе

### P0 — экономия OpenRouter ✅

| Изменение | Файлы | Env |
|-----------|-------|-----|
| Free **10** AI/день | `config.py`, `user_service.py` | `FREE_DAILY_ACTIONS=10` |
| Premium **soft-cap 50**/день | `user_service.py`, `dashboard.py` | `PREMIUM_DAILY_ACTIONS=50` |
| Контекст шаблонов **top-5** | `context_builder.py` | — |
| Premium JSON retry **1** | `ai_service.py` | `AI_JSON_RETRIES_PREMIUM=1` |
| Dashboard: реальный used/limit | `dashboard.py`, `ValueBanner.tsx` | — |

### Маршруты: Яндекс + OSRM ✅

| Компонент | Путь |
|-----------|------|
| Единый роутер | `backend/app/services/routing_service.py` |
| OSRM + Nominatim | `backend/app/services/osrm_maps.py` |
| Yandex + логи 403/429 | `backend/app/services/yandex_maps.py` |
| Redis-счётчик Яндекс/день | ключ `yandex:count:YYYY-MM-DD` |
| UI переключатель | Mini App → **Ещё → Маршруты** (`route_provider`) |

Режимы: `auto` | `yandex` | `osrm`. Fallback: текст + `yandex.ru/maps`.

### Геймификация и insights без LLM ✅

| Фича | Сервис | API |
|------|--------|-----|
| Streak, XP, уровень, achievements | `gamification_service.py` | `GET /dashboard` → `gamification` |
| Insights из SQL | `product_insights_service.py` | `GET /dashboard` → `db_insights` |
| «Умный день» | `HomePage.tsx` | `POST /analyze` template `day_plan` |
| Шаринг карточки | `ShareCard.tsx` | данные из dashboard |

**Миграция:** `alembic/versions/002_gamification_routing.py`  
Поля User: `route_provider`, `streak_count`, `streak_last_date`, `xp`.

### Mini App ✅

- ValueBanner: лимит AI, streak, уровень
- HomePage: DbInsights, Achievements, Share, Smart Day, debounce analyze
- MorePage: маршруты + premium/privacy
- Budget lazy-load (без LLM на открытии)

### Тесты ✅

```bash
cd navigator-ai && python3 -m pytest tests/test_limits.py tests/test_ai_parse.py -v
cd frontend && npm run build
```

---

## 2. Env на VPS (обязательно проверить)

В `/opt/navigai/app/.env` после деплоя:

```env
FREE_DAILY_ACTIONS=10
PREMIUM_DAILY_ACTIONS=50
AI_JSON_RETRIES_PREMIUM=1
YANDEX_DAILY_LIMIT=800
YANDEX_STATIC_MAP_ENABLED=true
OSRM_BASE_URL=https://router.project-osrm.org
NOMINATIM_URL=https://nominatim.openstreetmap.org
```

**Вручную в OpenRouter:** monthly cap **$25–30**.

---

## 3. Команды ops

```bash
# Логи токенов
docker compose -f docker-compose.prod.yml logs backend | grep -i openrouter

# Миграция (после деплоя)
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Деплой backend
export DEPLOY_PASS='...'
./navigator-ai/scripts/deploy-to-vps.sh

# Mini App — push main → GitHub Actions → gh-pages
```

---

## 4. Backlog для Grok (приоритеты)

### P0 — сразу (Grok / владелец)

| # | Задача | Зачем |
|---|--------|-------|
| 0 | **Деплой backend** (см. §3) | без этого API старый, новые фичи не работают |
| 1 | `alembic upgrade head` на VPS | иначе 500 на dashboard (новые колонки) |
| 2 | `FREE_DAILY_ACTIONS=10` в prod `.env` | добавлено в локальный `.env.production`, уедет при deploy |
| 3 | OpenRouter monthly cap в кабинете | страховка $30 |

### P1 — продукт и экономия

| # | Задача | Файлы | Риск |
|---|--------|-------|------|
| 4 | **OSRM на VPS** в docker-compose (`osrm-backend` + `localhost:5000`) | `docker-compose.prod.yml`, env | low |
| 5 | Отключать static map при `yandex:count` > 700 | `yandex_maps.py`, `routing_service.py` | low |
| 6 | Debounce 2s в `QuickTemplates` (как HomePage) | `QuickTemplates.tsx` | low |
| 7 | RoutesPage: badge провайдера (Yandex/OSRM/fallback) | `RoutesPage.tsx` | low |
| 8 | Светлая тема: полировка `index.css` | `index.css` | low |

### P2 — осторожно

| # | Задача | Комментарий |
|---|--------|-------------|
| 9 | Whisper на VPS вместо Gemini ASR | CPU vs $ |
| 10 | Голос/фото только premium | меняет продукт |
| 11 | Framer Motion micro-animations | bundle size |

### Запрещено без согласования

- Новые LLM в `worker.py`
- LLM при открытии вкладок Mini App
- `AI_WORKER_EVENING_LLM=true` на prod
- Yandex API key во frontend

---

## 5. Яндекс.Карты — стратегия для Grok

**Проблема:** freemium + хранение маршрутов в PG → возможна **коммерческая лицензия**; Static API отдельный лимит.

**Текущее решение:**

1. Default `auto`: OSRM если Яндекс недоступен / лимит / 403/429.
2. Premium может выбрать **Яндекс** в Mini App.
3. `YANDEX_DAILY_LIMIT=800` — глобальный Redis-счётчик.

**Рекомендации:**

- Поднять локальный OSRM на VPS → `OSRM_BASE_URL=http://osrm:5000`
- При росте DAU — юридическая консультация по Яндекс Maps API
- Static map выключать первым (`YANDEX_STATIC_MAP_ENABLED=false`)

---

## 6. Оценка $/мес (после caps)

| Сценарий | ~$/мес |
|----------|--------|
| 10 DAU, caps + cache | $1–4 |
| 50 DAU, caps + cache | $12–35 |
| 200 DAU без роста лимитов | $40–80+ ⚠️ |

Premium cap 50/день: **−50–80%** spend vs безлимит.

---

## 7. Ключевые файлы

```
backend/app/core/config.py
backend/app/services/user_service.py
backend/app/services/ai_service.py
backend/app/services/context_builder.py
backend/app/services/routing_service.py
backend/app/services/osrm_maps.py
backend/app/services/yandex_maps.py
backend/app/services/gamification_service.py
backend/app/services/product_insights_service.py
backend/app/api/routes/dashboard.py
frontend/src/pages/HomePage.tsx
frontend/src/pages/MorePage.tsx
frontend/src/components/ValueBanner.tsx
alembic/versions/002_gamification_routing.py
```

---

## 8. Формат ответа Grok (напоминание)

Для каждого предложения:

1. **UX** — что увидит пользователь  
2. **LLM/действие** — до → после  
3. **$/мес** — 10 / 50 / 200 DAU  
4. **Env** — переменные  
5. **Файлы** — пути  
6. **Риск** — low / medium / high  

---

*Обновлять этот файл после каждого крупного релиза и деплоя.*
