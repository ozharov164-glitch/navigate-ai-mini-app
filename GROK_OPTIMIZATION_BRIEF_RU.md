# НавигаторAI — brief для Grok (оптимизация, май 2026, актуальная версия)

> **Для кого:** Grok / ИИ-агент, который **снижает расходы** (OpenRouter, Yandex) и **не ломает** продукт.  
> **Дата обновления:** 16 мая 2026  
> **Бот:** `@NavigAI_bot`  
> **Репозиторий:** https://github.com/ozharov164-glitch/navigate-ai-mini-app  
> **Локальный путь:** `/Users/dmitriidekhanov/doit_bot/navigator-ai`  
> **Предыдущий brief:** `GROK_PROJECT_BRIEF_RU.md` (устарел по UI; этот файл — главный для оптимизации)

---

## 0. Главные правила для Grok

| Приоритет | Правило |
|-----------|---------|
| **№1** | Не увеличивать число **LLM-вызовов** и **input tokens** без явной необходимости |
| **№2** | Любое изменение оценивать: **вызовов/действие**, **$/мес** при 10 / 50 / 200 DAU, **затронутые env** |
| **№3** | Mini App **никогда** не должен вызывать LLM при открытии вкладок (только существующие API чтения из БД) |
| **№4** | Premium сейчас **без лимита AI** → главный риск бюджета; soft-cap — задача №1 |
| **№5** | Не коммитить секреты; не включать `AI_WORKER_EVENING_LLM=true` на prod без согласования |

**Бюджет владельца:** OpenRouter ~**$30**, пополнение редко. VPS оплачен.

---

## 1. Что изменилось с прошлого brief (обязательно учесть)

### 1.1 Mini App — premium UI (деплой ✅)

- **PR #1** смержен в `main`, commit `b3cfcdd` — *Redesign Mini App UI to premium dark-first experience*
- **Production URL:** https://ozharov164-glitch.github.io/navigate-ai-mini-app/
- Деплой: GitHub Actions → `.github/workflows/deploy-frontend.yml` → ветка `gh-pages`
- `VITE_API_URL=https://31-128-42-170.sslip.io/api`, `VITE_BASE_PATH=/navigate-ai-mini-app/`

**UI (без новых LLM):**

| Элемент | Файлы | API |
|---------|-------|-----|
| Dark-first + light (Telegram `colorScheme`) | `frontend/src/index.css`, `lib/theme.ts` | PATCH settings (тема) |
| ValueBanner, progress AI-действий, streak | `ValueBanner.tsx`, `lib/streak.ts` | dashboard only |
| CommandBar (Raycast-style AI input) | `CommandBar.tsx`, `HomePage.tsx` | POST `/dashboard/analyze` |
| Floating nav dock | `BottomNav.tsx` | — |
| Lazy-load Budget (recharts chunk) | `App.tsx` | GET budget-stats, expenses |
| Confetti при Stars Premium | `lib/confetti.ts`, `MorePage.tsx` | payments |
| Greeting по имени Telegram | `lib/greeting.ts` | — |

**Дизайн-токены:** `frontend/src/design-system/tokens.ts`

### 1.2 Яндекс.Карты — статус интеграции

Уже на **backend** (`backend/app/services/yandex_maps.py`):

- Geocoder → Router → Static map URL
- Redis-кэш геокода и маршрутов (`cache_ttl_seconds`, по умолчанию 3600)
- **Без `YANDEX_MAPS_API_KEY`:** fallback — только ссылка `yandex.ru/maps`, без картинки и точного времени

**На 1 маршрут (с ключом):** ~2× geocode + 1× route + static map (отдельный лимит Static API).

**Ключ только на VPS** — не в Mini App / GitHub Pages.

### 1.3 Статус оптимизации (16.05.2026, в коде)

- ✅ Soft-cap Premium `PREMIUM_DAILY_ACTIONS=50`
- ✅ `FREE_DAILY_ACTIONS=10`
- ✅ `context_builder` top-5 для day_plan / week_analysis
- ✅ `AI_JSON_RETRIES_PREMIUM=1` в budget mode
- ✅ Yandex 403/429 → fallback + `yandex:count` в Redis + OSRM toggle в Mini App
- ✅ Геймификация (streak/XP/achievements), DB insights без LLM
- ⚠️ OpenRouter monthly cap — вручную в кабинете OpenRouter
- ⚠️ На VPS: `alembic upgrade head` + env из `.env.example`

---

## 2. Архитектура (production)

```
Telegram @NavigAI_bot
        │
        ├── Webhook → VPS 31.128.42.170 (Docker)
        │       ├── bot (aiogram 3) :8081
        │       ├── backend (FastAPI) :8000
        │       ├── worker (60s loop)
        │       ├── postgres:16, redis:7
        │       └── caddy (HTTPS)
        │
        └── Mini App → GitHub Pages (static React 19)
                └── API → https://31-128-42-170.sslip.io/api
```

| Ресурс | URL |
|--------|-----|
| API | `https://31-128-42-170.sslip.io` |
| Health | `GET /health` |
| Mini App | `https://ozharov164-glitch.github.io/navigate-ai-mini-app/` |
| VPS app | `/opt/navigai/app` |

**Env на VPS:** `.env.production` (не в git)

```env
MINI_APP_URL=https://ozharov164-glitch.github.io/navigate-ai-mini-app/
CORS_ORIGINS=https://ozharov164-glitch.github.io,https://web.telegram.org
```

---

## 3. Стек

| Слой | Технологии |
|------|------------|
| Bot | Python 3.12, aiogram 3 |
| API | FastAPI, SQLAlchemy async, Alembic |
| AI | OpenRouter: `deepseek/deepseek-v3.2` (JSON), `google/gemini-2.5-flash` (голос/фото) |
| Maps | Yandex Geocoder + Router v2 + Static (опционально ключ) |
| Cache | Redis (AI analyze, ASR, vision, geo, routes) |
| Frontend | React 19, Vite 6, Tailwind 3, recharts (lazy), lucide-react |
| Deploy frontend | push `main` → Actions → `gh-pages` |
| Deploy backend | `./navigator-ai/scripts/deploy-to-vps.sh` |

---

## 4. Стоимость AI на одно действие пользователя

| Действие | OpenRouter | Yandex | Примечание |
|----------|------------|--------|------------|
| Текст | 1× DeepSeek (+0–2 retry premium) | — | кэш analyze по тексту |
| Голос | 1× Gemini ASR + 1× DeepSeek | — | кэш ASR по SHA256 аудио |
| Фото | 1× Gemini vision + 1× DeepSeek | — | vision **не** дублируется в analyze (`AI_BUDGET_MODE`) |
| Шаблон `day_plan` / `week_analysis` | 1× DeepSeek | — | **длинный input** из `context_builder.py` |
| Гео / маршрут в тексте | 1× DeepSeek + persist route | 0–3× Yandex | fallback без ключа |
| Открытие Mini App | **0** | **0** | только `GET /dashboard` и CRUD |
| Worker напоминания / дайджест | **0** | **0** | evening LLM выключен |

---

## 5. AI budget mode (production, уже включено)

Файл: `backend/app/services/ai_service.py`

```env
AI_BUDGET_MODE=true
AI_WORKER_EVENING_LLM=false
AI_MAX_TOKENS=2048
AI_CACHE_TTL=3600
AI_JSON_RETRIES=2
AI_JSON_RETRIES_PREMIUM=3
AI_VISION_MAX_TOKENS=800
AI_TRANSCRIBE_MAX_TOKENS=512
FREE_DAILY_ACTIONS=20
```

| Мера | Статус |
|------|--------|
| Один vision на фото | ✅ |
| Redis кэш analyze / ASR / vision | ✅ |
| Короткие fallback-цепочки в budget mode | ✅ |
| Логи `prompt_tokens` / `completion_tokens` | ✅ в логах backend |
| Premium без лимита | ⚠️ **риск** — см. раздел 7 |

---

## 6. Лимиты пользователей (критично для оптимизации)

**Файл:** `backend/app/services/user_service.py`

```python
async def check_daily_limit(...):
    if self.is_premium(user):
        return True  # ← БЕЗ ЛИМИТА
    ...
```

**Dashboard:** `daily_actions_left = 999` для premium (`dashboard.py`).

**Freemium:** `FREE_DAILY_ACTIONS` (default 20), счётчик `daily_actions_count` / день.

**Rate limit API:** 30 req/min/user (Redis).

---

## 7. Backlog для Grok — оптимизация (приоритеты)

### P0 — сделать первым (низкий риск, высокая экономия)

| # | Задача | Файлы | Ожидаемый эффект |
|---|--------|-------|------------------|
| 1 | **Soft-cap Premium** 30–50 AI/день | `user_service.py`, `config.py`, `dashboard.py` | −50–80% spend при «безлимитных» premium |
| 2 | `PREMIUM_DAILY_ACTIONS=50` env | `config.py`, `.env.production.example` | настраиваемый cap |
| 3 | `FREE_DAILY_ACTIONS=10` | `config.py`, VPS env | −50% free tier load |
| 4 | Урезать `day_plan` context: **top-5** задач, не 30 | `context_builder.py` | −30–50% input tokens на шаблон |
| 5 | `week_analysis`: top-5 задач + top-5 категорий расходов | `context_builder.py` | то же |
| 6 | В budget mode: `AI_JSON_RETRIES_PREMIUM=1` (или 2) | `ai_service.py`, env | меньше retry = меньше 2×/3× вызовов |
| 7 | Напоминание владельцу: **OpenRouter monthly cap** $25–30 | docs only | страховка |

### P1 — средний приоритет

| # | Задача | Файлы |
|---|--------|-------|
| 8 | Счётчик `yandex_requests_today` + cap / отключение static map | `yandex_maps.py`, `config.py` |
| 9 | Лог ошибок Yandex 403/429 | `yandex_maps.py` |
| 10 | `YANDEX_STATIC_MAP_ENABLED=false` при лимите | `yandex_maps.py` |
| 11 | Дедуп одинакового analyze в Mini App (debounce 2s) | `HomePage.tsx`, `QuickTemplates.tsx` |
| 12 | Метрика в dashboard: `actions_used_today` для premium (реальное число) | `dashboard.py`, `ValueBanner.tsx` |

### P2 — осторожно (UX vs экономия)

| # | Задача | Комментарий |
|---|--------|-------------|
| 13 | Whisper на VPS вместо Gemini ASR | экономия $, нагрузка CPU |
| 14 | Текст бесплатно, голос/фото только premium | меняет продукт |
| 15 | OCR без vision для «простых» чеков | сложная эвристика |

### Запрещено без согласования

- Новые LLM-задачи в `worker.py`
- LLM на page view / scroll Mini App
- Увеличение `AI_MAX_TOKENS` или цепочек fallback-моделей
- `AI_WORKER_EVENING_LLM=true` на production
- API-ключ Yandex в frontend

---

## 8. Реализация soft-cap Premium (спека для Grok)

**Цель:** premium ощущается «безлимитом» в UI, но backend режет на 50/день до стабильной выручки.

1. `config.py`:
   ```python
   premium_daily_actions: int = 50  # 0 = без лимита (не рекомендуется)
   ```
2. `user_service.check_daily_limit`:
   - если premium и `premium_daily_actions > 0` → считать как free, но с другим лимитом
   - отдельное поле или тот же `daily_actions_count`
3. `dashboard.py`: `daily_actions_left = premium_cap - count` (не 999)
4. `ValueBanner` / бот: честный текст «Осталось N premium-действий»
5. При исчерпании: HTTP 429 + сообщение «Лимит на сегодня. Завтра сброс или напишите в поддержку»

**LLM-вызовов:** не добавляет, только ограничивает.

---

## 9. Яндекс.Карты — экономия (кратко)

| Режим | Стоимость | Поведение |
|-------|-----------|-----------|
| Без ключа | 0 ₽ | `yandex_maps._fallback_route()` — ссылка в Карты |
| С ключом, free tier | ~1000 req/день/сервис | Geocoder + Router + Static |
| С Redis | меньше повторов | ключи `geo:md5`, `route:md5` |

**Env VPS:**
```env
YANDEX_MAPS_API_KEY=...
YANDEX_GEOCODER_URL=https://geocode-maps.yandex.ru/1.x/
YANDEX_ROUTER_URL=https://api.routing.yandex.net/v2/route
YANDEX_STATIC_MAP_URL=https://static-maps.yandex.ru/1.x/
CACHE_TTL_SECONDS=86400
```

**Лицензия:** freemium + хранение маршрутов в PostgreSQL — при росте возможна **коммерческая** лицензия Яндекса.

---

## 10. Mini App — что трогает API (для Grok: не плодить вызовы)

| Вкладка | Endpoints | LLM |
|---------|-----------|-----|
| home | `GET /dashboard`, `POST /analyze`, `PATCH /tasks/{id}` | только analyze |
| calendar | `GET /tasks`, export iCal | нет |
| budget | `GET /budget-stats`, `GET /expenses` | нет |
| routes | данные из `GET /dashboard` | нет |
| more | places, privacy, payments, export | нет |
| VoiceFab | `POST /analyze-voice` | да (ASR+analyze) |

---

## 11. Монетизация

| Тариф | Цена | AI |
|-------|------|-----|
| Free | 0 | 20/день (сейчас) → целевое **10/день** |
| Basic / Premium | 199–399 Stars / ₽ | **безлимит фактически** → целевой **cap 50/день** |

Реферал: `/start ref_CODE` → +14 дней premium рефереру.

---

## 12. Оценка расхода OpenRouter ($30 баланс)

| Сценарий | ~$/мес |
|----------|--------|
| 10 DAU × 5 текстов/день | $1–3 |
| + 30% голос/фото | +$3–8 |
| 5 premium **без cap** | +$5–25 ⚠️ |
| 5 premium **cap 50/день** | +$3–12 |
| 50 DAU, cap + cache | $15–40 → нужны лимиты **до** роста |

**Вывод:** сначала **caps + короче prompts**, потом фичи.

---

## 13. Ключевые файлы

| Задача | Путь |
|--------|------|
| AI + кэш + budget | `backend/app/services/ai_service.py` |
| Контекст шаблонов | `backend/app/services/context_builder.py` |
| Лимиты | `backend/app/services/user_service.py` |
| Persist + Yandex route | `backend/app/services/action_processor.py` |
| Yandex Maps | `backend/app/services/yandex_maps.py` |
| Dashboard API | `backend/app/api/routes/dashboard.py` |
| Config | `backend/app/core/config.py` |
| Worker | `backend/app/worker.py` |
| Bot | `bot/handlers/messages.py` |
| Mini App entry | `frontend/src/App.tsx` |
| API client | `frontend/src/lib/api.ts` |
| Deploy Mini App | `.github/workflows/deploy-frontend.yml` |
| Deploy VPS | `scripts/deploy-to-vps.sh`, `DEPLOY.md` |

---

## 14. Команды

```bash
# Токены OpenRouter на VPS
docker compose -f docker-compose.prod.yml logs backend | grep -i openrouter

# Тесты AI parse (без БД)
cd navigator-ai && pytest tests/test_ai_parse.py -v

# Сборка Mini App локально
cd navigator-ai/frontend && npm run build

# Деплой backend на VPS
export DEPLOY_PASS='...'
./navigator-ai/scripts/deploy-to-vps.sh

# Mini App деплоится автоматически при push в main (frontend/**)
```

---

## 15. Формат ответа Grok (обязательно)

Каждое предложение оформлять так:

1. **UX** — что увидит пользователь  
2. **LLM/действие** — до → после (число вызовов OpenRouter)  
3. **$/мес** — при 10 / 50 / 200 DAU (грубая оценка)  
4. **Env** — какие переменные добавить/изменить  
5. **Файлы** — список путей для PR  
6. **Риск** — low / medium / high  

---

## 16. Git (актуально на 16.05.2026)

| Ветка | Commit | Описание |
|-------|--------|----------|
| `main` | `b3cfcdd` | Premium Mini App UI |
| `main` | `e8a9e13` | OpenRouter budget mode, caches |

PR #1 — merged. Mini App live on GitHub Pages.

---

*Обновлять этот файл при изменении лимитов, caps, env или архитектуры деплоя.*
