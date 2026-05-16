# НавигаторAI — полный handoff-документ для доработки проекта

> **Назначение:** передать другой ИИ/команде для полировки, рефакторинга и доведения до production-ready.  
> **Дата актуализации:** 16 мая 2026  
> **Репозиторий:** `https://github.com/ozharov164-glitch/navigate-ai-mini-app`  
> **Локальный путь:** `/Users/dmitriidekhanov/doit_bot/navigator-ai`

---

## 1. Краткое описание продукта

**НавигаторAI** (`@NavigAI_bot`) — личный AI-навигатор в Telegram: пользователь отправляет **текст, голос, фото или геопозицию**, система через LLM (OpenRouter / DeepSeek) извлекает структурированные данные и сохраняет:

- задачи (tasks)
- расходы (expenses)
- маршруты (routes) — с Yandex Maps
- напоминания (reminders)
- smart insights
- документы из фото (document vault)

Дополнительно есть **Telegram Mini App** (React) — дашборд, календарь, бюджет, маршруты, настройки, премиум, приватность.

**Модель монетизации:** freemium (20 AI-действий/день) + premium (Telegram Stars, YooKassa).

---

## 2. Архитектура деплоя (гибрид)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram Cloud                            │
│   Пользователь ↔ @NavigAI_bot ↔ Webhook ↔ Mini App (WebView)   │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────────┐   ┌──────────────────────────────────┐
│ VPS 31.128.42.170          │   │ GitHub Pages                      │
│ Docker Compose (prod)      │   │ ozharov164-glitch.github.io/      │
│                            │   │ navigate-ai-mini-app/             │
│ • Caddy (HTTPS, Let's Encrypt)│   │ React static (Vite build)        │
│ • bot :8081                │   │ VITE_API_URL → VPS /api           │
│ • backend :8000            │   └──────────────────────────────────┘
│ • worker (async loop)      │
│ • postgres:16              │
│ • redis:7                  │
└────────────────────────────┘
             │
             ▼
┌────────────────────────────┐
│ OpenRouter API             │  DeepSeek V3.2 (текст/JSON), Gemini (vision/voice)
│ Yandex Maps API            │  geocode, routing, static maps
└────────────────────────────┘
```

### Production URLs (текущие)

| Ресурс | URL |
|--------|-----|
| HTTPS API (Caddy + sslip.io) | `https://31-128-42-170.sslip.io` |
| API prefix | `https://31-128-42-170.sslip.io/api` |
| Health | `https://31-128-42-170.sslip.io/health` |
| Bot webhook | `https://31-128-42-170.sslip.io/bot/webhook` |
| Mini App (GitHub Pages) | `https://ozharov164-glitch.github.io/navigate-ai-mini-app/` |
| Путь на VPS | `/opt/navigai/app` |
| Compose prod | `docker-compose.prod.yml` |

### ⚠️ Несогласованность URL в документации

В разных файлах встречаются **разные** base path и Mini App URL:

| Источник | Значение |
|----------|----------|
| GitHub Actions workflow | `VITE_BASE_PATH=/navigate-ai-mini-app/` |
| DEPLOY.md (BotFather) | `https://dmitriidekhanov.github.io/doit_bot/` |
| `.env.production.example` | `https://YOUR_USER.github.io/doit_bot/` |
| Фактический Pages | `.../navigate-ai-mini-app/` |

**Все четыре должны совпадать:** BotFather Web App URL, `MINI_APP_URL`, `CORS_ORIGINS`, `VITE_BASE_PATH`. Иначе — «Load failed», 401, битые ассеты.

---

## 3. Структура репозитория

```
doit_bot/                          ← корень git
├── .github/workflows/
│   └── deploy-frontend.yml          ← CI → gh-pages
├── DEPLOY.md
├── PROJECT_HANDOFF_RU.md            ← этот файл
└── navigator-ai/
    ├── bot/                         ← aiogram 3
    ├── backend/app/                 ← FastAPI
    ├── frontend/                    ← React 19 + Vite 6
    ├── alembic/                     ← одна миграция 001_initial
    ├── nginx/                       ← full stack (dev)
    ├── Caddyfile                    ← prod reverse proxy
    ├── docker-compose.yml           ← полный стек (dev/VPS 4GB)
    ├── docker-compose.prod.yml      ← prod без frontend
    ├── Dockerfile                   ← multi-stage backend + bot
    ├── requirements.txt
    ├── scripts/
    │   ├── deploy-to-vps.sh
    │   └── remote-install.exp
    ├── .env.example
    └── .env.production.example
```

**Точки входа:**

| Компонент | Команда / файл |
|-----------|----------------|
| API | `uvicorn backend.app.main:app` → `backend/app/main.py` |
| Бот | `python -m bot.main` → `bot/main.py` |
| Worker | `python -m backend.app.worker` → `backend/app/worker.py` |
| Frontend dev | `npm run dev` в `frontend/` |

---

## 4. Telegram-бот — детальный функционал

### 4.1. Режим работы

**Файл:** `bot/main.py`

- Если задан `WEBHOOK_URL` → **webhook** на `0.0.0.0:BOT_PORT` (8081), путь `/bot/webhook`, `secret_token=WEBHOOK_SECRET`
- Иначе → **long polling** (локальная разработка)
- **Prod:** webhook через Caddy → `bot:8081`

### 4.2. Middleware

**Файл:** `bot/middlewares/private_only.py`

- Сообщения из групп отклоняются с подсказкой писать в ЛС
- ⚠️ `ALLOW_PRIVATE_ONLY` в config **не читается** — middleware всегда активен

### 4.3. Команды

**Файл:** `bot/handlers/commands.py`

| Команда | Поведение |
|---------|-----------|
| `/start` | `ensure_user` через API; показ реферального кода; кнопка Web App «Открыть дашборд» (если HTTPS `MINI_APP_URL`) |
| `/help` | Справка по возможностям |
| `/premium` | Тарифы Stars; кнопка Mini App `?page=premium` |
| `/privacy` | Текст о приватности; кнопка `?page=privacy` |

**Deep link `/start ref_XXX`:** код парсится, показывается «бонус после первого действия», но **не передаётся в backend** при `ensure_user` — реферал фактически **не применяется** (см. §10).

### 4.4. Обработка сообщений

**Файл:** `bot/handlers/messages.py`

| Тип | input_type | Pipeline |
|-----|------------|----------|
| Текст | `text` | AI analyze → persist |
| Голос | `voice` | transcribe (Gemini) → AI → persist |
| Фото | `photo` | describe (vision) → AI → persist + file on disk |
| Геолокация | `location` | lat/lon в prompt → AI + Yandex routes |

**Шаблоны по ключевым словам в тексте:**

- «чек» → `template=receipt`
- «план» + «день» → `day_plan`
- «недел» → `week_analysis`

**Ответ пользователю:**

- HTML: summary, счётчики (задачи/расходы/маршруты/напоминания), insights, метрики «AI сэкономил»
- **Inline-кнопка** `📱 Открыть Mini App` (Web App) — **не** текстовая ссылка (исправлено в коммите `9df171b`)

### 4.5. Платежи (Stars)

**Файл:** `bot/handlers/payments.py`

- Callback для invoice, pre_checkout, successful_payment
- ⚠️ После успешной оплаты Stars **premium не активируется** в БД — только сообщение пользователю

### 4.6. Клавиатуры

**Файл:** `bot/utils/keyboard.py`

- `mini_app_button()` / `mini_app_keyboard()` — только если `MINI_APP_URL` начинается с `https://`
- На localhost кнопки Web App **не показываются** (ограничение Telegram)

### 4.7. HTTP-клиент к backend

**Файл:** `bot/services/api_client.py`

| Метод | Endpoint | Auth |
|-------|----------|------|
| `ensure_user` | `POST /api/internal/bot/ensure-user` | `X-Bot-Secret` |
| `process` | `POST /api/internal/bot/process` | multipart form + secret |

Обработка ошибок: 429 → limit, 5xx → server, 4xx → client (дружелюбные сообщения в handlers).

**Важно:** `process` использует **Form**, не JSON (`telegram_id` как form field).

---

## 5. Backend (FastAPI) — детальный функционал

### 5.1. Роутеры

**Монтирование:** `backend/app/main.py` — prefix `/api` для dashboard, payments, export, bot_internal.  
`GET /health` — без prefix.

#### Dashboard (`/api/dashboard`)

**Файл:** `backend/app/api/routes/dashboard.py`  
**Auth:** `X-Telegram-Init-Data` или `Authorization: Bearer JWT`

| Method | Path | Описание |
|--------|------|----------|
| GET | `/dashboard` | Агрегат для Mini App (tasks, expenses, routes, insights, theme, limits) |
| POST | `/dashboard/analyze` | Текстовый AI-анализ из Mini App |
| POST | `/dashboard/analyze-voice` | Multipart audio → transcribe → AI |
| PATCH | `/dashboard/tasks/{id}` | Toggle complete / title |
| GET | `/dashboard/tasks` | Список задач (не используется во frontend) |
| GET | `/dashboard/expenses` | Список расходов (не используется) |
| GET | `/dashboard/routes` | Маршруты (не используется) |
| GET | `/dashboard/reminders` | Напоминания |
| GET | `/dashboard/documents` | Document vault |
| GET | `/dashboard/digests` | AI digest history |
| GET | `/dashboard/budget-stats` | Агрегация по категориям + forecast |
| GET/POST/DELETE | `/dashboard/places` | «Мои места» (адреса шифруются Fernet) |
| PATCH | `/dashboard/settings` | theme, timezone, proactive |
| GET | `/dashboard/privacy` | Статичная инфо о хранении |
| DELETE | `/dashboard/privacy/delete-all` | Полное удаление данных пользователя |

#### Bot internal (`/api/internal/bot`)

**Файл:** `backend/app/api/routes/bot_internal.py`  
**Auth:** `X-Bot-Secret` == `WEBHOOK_SECRET` (если secret пустой — **проверка отключена**, API открыт)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/ensure-user` | Создать/обновить user, onboarding |
| POST | `/process` | Полный pipeline (как у бота) |

#### Payments (`/api/payments`)

| Method | Path | Описание |
|--------|------|----------|
| POST | `/stars-invoice` | Payload для Telegram invoice |
| POST | `/yookassa` | Создание платежа YooKassa |
| POST | `/confirm` | ⚠️ Упрощённая активация premium **без проверки оплаты** |

#### Export (`/api/export`)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/ical` | iCal файл |
| GET | `/pdf` | PDF отчёт (только premium) |

### 5.2. Авторизация Mini App

**Файлы:** `backend/app/api/deps.py`, `backend/app/core/security.py`

1. Парсинг `X-Telegram-Init-Data` — HMAC по спецификации Telegram WebApp, `auth_date` max 24h
2. Fallback: JWT Bearer (`sub` = user id)
3. `get_or_create(telegram_id)` — username из initData **не всегда** прокидывается

**CORS:** `CORSMiddleware` — origins из `CORS_ORIGINS` (comma-separated). Должен включать **точный origin** GitHub Pages.

### 5.3. AI-сервис

**Файл:** `backend/app/services/ai_service.py`

| Функция | Модель | Примечание |
|---------|--------|------------|
| `analyze()` | `AI_MODEL` (deepseek/deepseek-v3.2) | JSON mode, system prompt в config |
| Vision (фото) | `google/gemini-2.5-flash` | base64 image |
| `transcribe_voice()` | `google/gemini-2.5-flash` | input_audio; форматы ogg/webm/wav |
| Кэш | Redis | ключ по message+template |

**Исправленный критический баг (май 2026):** заголовок `X-Title: НавигаторAI` (кириллица) вызывал `UnicodeEncodeError` в httpx → **все AI-запросы падали с 500**. Сейчас: `X-Title: NavigAI` (ASCII).

**Fallback при ошибке транскрипции:** LLM возвращает заглушку «не удалось распознать» — анализ может быть бессмысленным.

### 5.4. Action processor

**Файл:** `backend/app/services/action_processor.py`

1. `ai_service.analyze()` → `AIAnalysisResponse` (Pydantic)
2. `_persist()` — INSERT tasks, expenses, routes, reminders, insights, action_log
3. Для каждого route → `yandex_maps.build_route()` (geocode + router API)
4. Эвристика метрик: `saved_minutes = tasks*5 + routes*10`, `saved_rub = expenses*0.05`

### 5.5. Yandex Maps

**Файл:** `backend/app/services/yandex_maps.py`

- Geocoder, Router API, Static map URL
- Redis cache
- При ошибке API → **hardcoded fallback** (35 мин, 8 км, generic map)
- `traffic_level = "heavy"` если duration > 45 мин (грубая эвристика)

### 5.6. User service

**Файл:** `backend/app/services/user_service.py`

- Freemium: `free_daily_actions` (20) / сутки, сброс по дате
- Premium: `tier` + `premium_until`
- Referral: `apply_referral()` — +14 дней premium рефереру
- Places: Fernet encryption для адресов

### 5.7. Worker (фоновые задачи)

**Файл:** `backend/app/worker.py`  
**Нет Celery** — asyncio loop каждые **60 секунд**:

| Задача | Логика |
|--------|--------|
| `check_reminders` | Напоминания с `remind_at <= now` → Telegram message |
| `morning_digest` | `proactive_enabled` + local hour == 8 → список задач |
| `evening_summary` | hour == 21 → AI summary |
| `traffic_alerts` | routes с `traffic_level == heavy` → уведомление |

**Известные проблемы worker:**

- Digest может слаться **многократно** в течение часа (нет флага «уже отправлено сегодня»)
- Traffic alerts повторяются каждый цикл для тех же маршрутов

---

## 6. База данных

### 6.1. Модели

**Users:** `backend/app/models/user.py`  
`User`, `UserPlace`, `Referral`

**Content:** `backend/app/models/content.py`  
`Task`, `Expense`, `Route`, `Reminder`, `Digest`, `DocumentVault`, `SmartInsight`, `ActionLog`

### 6.2. Миграции

- Одна ревизия: `alembic/versions/001_initial.py`
- При старте backend container: `alembic upgrade head`

### 6.3. Поля User (важные)

| Поле | Назначение |
|------|------------|
| `telegram_id` | PK логики |
| `referral_code` | Уникальный код |
| `tier`, `premium_until` | Подписка |
| `daily_actions_count`, `daily_actions_date` | Лимит freemium |
| `theme` | dark/light для Mini App |
| `timezone`, `proactive_enabled` | Worker digests |
| `saved_minutes_today`, `saved_rub_today` | Метрики «ценности» |
| `onboarding_completed` | Флаг онбординга |

---

## 7. Mini App (Frontend) — детальный функционал

### 7.1. Стек

- React 19, TypeScript, Vite 6, Tailwind 3
- **Нет** react-router — навигация через `useState<Tab>` в `App.tsx`
- Telegram SDK: **сырой** `window.Telegram.WebApp` (пакет `@tma.js/sdk` в dependencies **не используется**)
- Charts: recharts (BudgetPage)

### 7.2. Вкладки

| Tab | Компонент | Функции |
|-----|-----------|---------|
| home | `HomePage.tsx` | Summary, QuickTemplates, список задач на сегодня (toggle complete) |
| calendar | `CalendarPage.tsx` | Упрощённый 7-дневный вид; только `tasks_today` |
| budget | `BudgetPage.tsx` | Pie chart из `budget-stats` |
| routes | `RoutesPage.tsx` | Карточки маршрутов + ссылки Yandex |
| more | `MorePage.tsx` | Premium, места, vault, digests, export, privacy, тема |

### 7.3. Глобальные UI-элементы

- `ValueBanner` — saved min/₽, лимит действий, premium badge
- `VoiceFab` — запись через MediaRecorder → `POST /dashboard/analyze-voice`
- `BottomNav` — 5 вкладок
- Кнопка темы ☀️/🌙 в header

### 7.4. API-клиент

**Файл:** `frontend/src/lib/api.ts`

- `apiBase()` — нормализует `VITE_API_URL` с суффиксом `/api` (**критично** для GitHub Pages)
- Все JSON-запросы: header `X-Telegram-Init-Data`
- Без initData → ошибка «Откройте Mini App из бота»

### 7.5. Тема

**Файлы:** `frontend/src/lib/theme.ts`, `index.css`, `App.tsx`

- `applyTheme()` — классы `html.dark` / `html.light`, стили glass-компонентов, цвета Telegram WebApp
- Загрузка: `dashboard.theme` с сервера → иначе `Telegram.WebApp.colorScheme`
- Сохранение: `PATCH /dashboard/settings`
- ⚠️ Многие тексты в страницах захардкожены под тёмную тему (`text-slate-300`, `text-slate-400`) — светлая тема может выглядеть **частично** неконтрастной

### 7.6. Quick Templates

**Файл:** `frontend/src/components/QuickTemplates.tsx`

| Кнопка | template | Prompt |
|--------|----------|--------|
| Разобрать чек | `receipt` | Разбери чек, добавь расходы |
| Планирование дня | `day_plan` | План на сегодня |
| Анализ недели | `week_analysis` | Анализ недели |

- Состояние busy + toast с summary (исправлено в `9df171b`)
- Занимает 1 действие из дневного лимита

### 7.7. VoiceFab

- Tap → start MediaRecorder → tap (square) → stop → upload
- Не работает Web Speech API в Telegram WebView (поэтому заменён на запись)
- Требует разрешение микрофона; fallback — «отправьте голосовое боту»
- Формат: webm/opus (зависит от браузера)

### 7.8. Deep links

`?page=privacy` / `?page=premium` → переключает tab на `more`, **без** скролла к секции

---

## 8. Переменные окружения (полный список)

### Backend / Bot (`backend/app/core/config.py`)

| Переменная | Default | Назначение |
|------------|---------|------------|
| `APP_NAME` | НавигаторAI | Имя (не в HTTP headers!) |
| `APP_ENV` | production | Окружение |
| `DEBUG` | false | OpenAPI docs, log level |
| `SECRET_KEY` | change-me | JWT |
| `ENCRYPTION_KEY` | placeholder | Fernet для адресов |
| `BOT_TOKEN` | "" | Telegram |
| `BOT_USERNAME` | NavigAI_bot | |
| `WEBHOOK_URL` | "" | Пусто = polling |
| `WEBHOOK_SECRET` | "" | Webhook + bot internal API |
| `MINI_APP_URL` | example.com | Web App кнопки |
| `API_BASE_URL` | localhost:8000 | Bot → backend (Docker: `http://backend:8000`) |
| `ALLOW_PRIVATE_ONLY` | true | **НЕ ИСПОЛЬЗУЕТСЯ в коде** |
| `DATABASE_URL` | postgresql+asyncpg://... | |
| `REDIS_URL` | redis://localhost:6379/0 | |
| `CACHE_TTL_SECONDS` | 3600 | |
| `CORS_ORIGINS` | web.telegram.org | Comma-separated |
| `OPENROUTER_API_KEY` | "" | Обязателен для AI |
| `OPENROUTER_BASE_URL` | openrouter.ai/api/v1 | |
| `AI_MODEL` | deepseek/deepseek-v3.2 | |
| `AI_MAX_TOKENS` | 4096 | |
| `AI_CACHE_TTL` | 1800 | |
| `AI_SYSTEM_PROMPT` | long JSON prompt | |
| `YANDEX_MAPS_API_KEY` | "" | Маршруты без ключа → fallback |
| `YANDEX_*_URL` | Yandex API endpoints | |
| `STARS_BASIC_PRICE` | 199 | |
| `STARS_PREMIUM_PRICE` | 399 | |
| `YOOKASSA_*` | | Опционально |
| `FREE_DAILY_ACTIONS` | 20 | |
| `REFERRAL_BONUS_DAYS` | 14 | |
| `MORNING_DIGEST_HOUR` | 8 | |
| `EVENING_SUMMARY_HOUR` | 21 | |
| `DEFAULT_TIMEZONE` | Europe/Moscow | |
| `UPLOAD_DIR` | /app/uploads | Фото чеков |
| `MAX_UPLOAD_SIZE_MB` | 20 | |

### Frontend build (CI / local)

| Переменная | Prod CI value |
|------------|---------------|
| `VITE_API_URL` | `https://31-128-42-170.sslip.io/api` |
| `VITE_BASE_PATH` | `/navigate-ai-mini-app/` |

### Docker-only (compose)

`POSTGRES_*`, `PUBLIC_HOST`, порты nginx/caddy.

---

## 9. Docker и reverse proxy

### docker-compose.prod.yml (текущий prod)

Сервисы: `postgres`, `redis`, `backend`, `bot`, `worker`, `caddy`  
**Нет** frontend/nginx — Mini App только на GitHub Pages.

### Caddyfile

```
{$PUBLIC_HOST} {
  /bot/webhook* → bot:8081
  /api/*       → backend:8000
  /health      → backend:8000
  default      → 404
}
```

### docker-compose.yml (full stack)

+ frontend + nginx на 80/443 — для локального/VPS monolith, сейчас **не используется** в hybrid prod.

---

## 10. Известные баги, недочёты и технический долг

### 🔴 Критические / функциональные

| # | Проблема | Где | Рекомендация |
|---|----------|-----|--------------|
| 1 | Реферал `/start ref_XXX` не применяется | `commands.py` парсит, но не шлёт в API | Передать `referral_code` в `ensure_user` или первый `process` |
| 2 | Stars payment не активирует premium | `payments.py` | Вызвать `user_service.extend_premium` + webhook backend |
| 3 | `POST /payments/confirm` без верификации | `payments.py` | Убрать или привязать к реальному payment id |
| 4 | Bot internal API открыт если `WEBHOOK_SECRET` пуст | `bot_internal.py` | Всегда требовать secret в prod |
| 5 | iCal/PDF export без auth в Mini App | `MorePage`, `CalendarPage` | Query `?init=` **не поддерживается** backend → 401; передавать initData или signed token |
| 6 | URL mismatch (doit_bot vs navigate-ai-mini-app) | DEPLOY.md, env examples | Унифицировать все конфиги |

### 🟠 Средние

| # | Проблема | Где |
|---|----------|-----|
| 7 | Worker digest spam (нет «sent today») | `worker.py` |
| 8 | Traffic alerts повторяются | `worker.py` |
| 9 | Голос OGG/WebM может не распознаваться Gemini | `ai_service.transcribe_voice` |
| 10 | Yandex без API key → фейковые маршруты | `yandex_maps._fallback_route` |
| 11 | Budget forecast = total * 1.1 | `dashboard.budget_stats` |
| 12 | Redis при падении отключается навсегда до рестарта | `redis_client.py` |
| 13 | PDF/iCal кириллица в ReportLab (Helvetica) | `export_service.py` |
| 14 | Глобальный 500 handler скрывает детали | `main.py` |

### 🟡 UX / Mini App

| # | Проблема |
|---|----------|
| 15 | Нет свободного текстового ввода AI в Mini App (только шаблоны + голос) |
| 16 | Calendar не показывает полный список задач (`api.tasks` не вызывается) |
| 17 | Budget не показывает список транзакций |
| 18 | Routes не обновляются отдельно |
| 19 | `?page=premium` не скроллит к секции |
| 20 | Stars: `starsInvoice` без `Telegram.WebApp.openInvoice` |
| 21 | Светлая тема — не все компоненты адаптированы |
| 22 | VoiceFab перекрывает BottomNav на маленьких экранах |
| 23 | `alert`/`confirm` вместо нативных TG UI |
| 24 | Ошибки в MorePage/places/payments часто silent |

### 🟢 Исправлено недавно (май 2026)

| Проблема | Решение |
|----------|---------|
| AI не отвечал (UnicodeEncodeError в X-Title) | ASCII headers в `ai_service.py` |
| Mini App «Load failed» | `VITE_API_URL` с `/api`, функция `apiBase()` |
| Ссылка вместо кнопки Mini App | Inline Web App keyboard в `messages.py` |
| Тема не переключалась | `theme` в dashboard + `applyTheme()` |
| Quick templates без feedback | busy + toast |
| Голос в Mini App | MediaRecorder + `/analyze-voice` |

---

## 11. Потоки данных (sequence)

### 11.1. Текст в боте

```
User text → bot/messages.py
  → api_client.process(telegram_id, text, template?)
  → POST /api/internal/bot/process (multipart)
  → user_service.check_daily_limit
  → action_processor.process_message
    → ai_service.analyze (OpenRouter JSON)
    → persist + yandex routes
  → JSON counts + summary
  → edit_message HTML + InlineKeyboard Web App
```

### 11.2. Mini App dashboard load

```
WebView open → initTelegram()
  → GET /api/dashboard + X-Telegram-Init-Data
  → validate_telegram_init_data → get_or_create User
  → aggregate tasks/expenses/routes/insights
  → applyTheme(dashboard.theme)
```

### 11.3. Quick template в Mini App

```
Click template → POST /api/dashboard/analyze {text, template}
  → same action_processor pipeline
  → toast summary → onRefresh() dashboard
```

---

## 12. AI prompt и формат ответа

**System prompt:** `config.py` → `AI_SYSTEM_PROMPT`  
Требует **строго JSON** без markdown:

```json
{
  "tasks": [{"title", "description", "due_date", "priority"}],
  "expenses": [{"amount", "category", "merchant", "description", "currency"}],
  "routes": [{"from_address", "to_address", "transport_mode"}],
  "reminders": [{"title", "remind_at"}],
  "summary": "string",
  "smart_insights": ["string"]
}
```

Парсинг: `_extract_json()` + `_safe_analysis()` fallback при битом JSON.

---

## 13. Зависимости (backend)

| Пакет | Версия | Назначение |
|-------|--------|------------|
| fastapi | 0.115.6 | API |
| uvicorn | 0.32.1 | ASGI |
| aiogram | 3.28.2 | Bot |
| sqlalchemy | 2.0.36 | ORM async |
| asyncpg | 0.30.0 | PostgreSQL |
| alembic | 1.14.0 | Migrations |
| redis | 5.2.1 | Cache |
| httpx | 0.28.1 | HTTP |
| openai | 1.57.4 | OpenRouter client |
| cryptography | 44.0.0 | Fernet |
| reportlab | 4.2.5 | PDF |
| icalendar | 6.1.0 | iCal |

Python **3.12** в Dockerfile.

---

## 14. Зависимости (frontend)

| Пакет | Версия | Статус |
|-------|--------|--------|
| react | ^19 | Используется |
| @tma.js/sdk | ^2.5 | **Не используется** |
| recharts | ^2.14 | Budget chart |
| lucide-react | ^0.468 | Icons |
| vite | ^6 | Build |

---

## 15. CI/CD и деплой

### GitHub Actions

**Файл:** `.github/workflows/deploy-frontend.yml`

- Trigger: push `main` при изменении `navigator-ai/frontend/**`
- Build с hardcoded `VITE_API_URL`, `VITE_BASE_PATH`
- Deploy: `peaceiris/actions-gh-pages@v4` → branch `gh-pages`

### VPS deploy

```bash
export DEPLOY_PASS='...'
./navigator-ai/scripts/deploy-to-vps.sh
```

- Tarball проекта → `/opt/navigai/app`
- Требует локальный `navigator-ai/.env.production`
- `docker compose -f docker-compose.prod.yml up -d --build`

**Быстрый патч** (только backend/bot):

```bash
tar backend bot → scp → docker compose up -d --build backend bot worker
```

---

## 16. Безопасность (важно для полировки)

1. **Секреты в чате/репо:** пароль VPS, GitHub PAT, `WEBHOOK_SECRET`, `OPENROUTER_API_KEY` могли светиться — **ротировать**
2. `.env` / `.env.production` в `.gitignore`, но проверить что не закоммичены
3. `payments/confirm` — дыра для бесплатного premium
4. Bot internal без secret — полный доступ к AI от имени любого telegram_id
5. Upload dir для фото — нет явной антивирус/validation кроме размера

---

## 17. Рекомендуемый roadmap для «полировки»

### Фаза A — стабильность (1–2 дня)

- [ ] Унифицировать все URL (Pages, CORS, MINI_APP_URL, BotFather)
- [ ] Починить referral flow end-to-end
- [ ] Починить Stars → premium activation
- [ ] Закрыть `/payments/confirm` или добавить verification
- [ ] Export iCal/PDF с auth (header или short-lived token in URL)
- [ ] Worker: dedupe digests per day

### Фаза B — Mini App UX (2–3 дня)

- [ ] Полная поддержка light theme (audit всех `text-slate-*`)
- [ ] Текстовое поле AI-запроса на Home
- [ ] Calendar: `api.tasks()` + месяц
- [ ] Budget: список expenses
- [ ] `Telegram.WebApp.openInvoice` для Stars
- [ ] Заменить alert/confirm на in-app modals
- [ ] Обработка ошибок во всех mutations

### Фаза C — качество AI (2–4 дня)

- [ ] Надёжная транскрипция (Whisper API / fallback chain)
- [ ] Валидация JSON schema (instructor / pydantic retry)
- [ ] Контекст недели для `week_analysis` (реальные данные из БД в prompt)
- [ ] Receipt template: требовать фото или последний expense

### Фаза D — production hardening

- [ ] Тесты (pytest API, e2e bot mocks)
- [ ] Monitoring (Sentry, structured logs)
- [ ] Rate limiting per user
- [ ] Backup postgres
- [ ] Единый стиль кода (black/ruff, indent 4 spaces)
- [ ] Вторая миграция alembic при изменении схемы

---

## 18. Как локально тестировать

```bash
# 1. .env из .env.example
cp navigator-ai/.env.example navigator-ai/.env

# 2. Polling (WEBHOOK_URL пустой)
docker compose up -d postgres redis backend
cd navigator-ai && python -m bot.main

# 3. Frontend
cd navigator-ai/frontend
VITE_API_URL=http://localhost:8000/api npm run dev
# Mini App в Telegram только с HTTPS tunnel (ngrok) для initData
```

**Тест bot process на prod:**

```bash
curl -X POST 'https://31-128-42-170.sslip.io/api/internal/bot/process' \
  -H 'X-Bot-Secret: YOUR_SECRET' \
  -F 'telegram_id=123' \
  -F 'input_type=text' \
  -F 'text=напомни купить молоко завтра'
```

---

## 19. Контакты и идентификаторы

| Сущность | Значение |
|----------|----------|
| Telegram bot | `@NavigAI_bot` |
| GitHub repo | `ozharov164-glitch/navigate-ai-mini-app` |
| VPS IP | `31.128.42.170` |
| sslip.io host | `31-128-42-170.sslip.io` |

---

## 20. Файловый индекс (быстрый поиск)

| Задача | Файл |
|--------|------|
| Bot entry | `navigator-ai/bot/main.py` |
| Message handlers | `navigator-ai/bot/handlers/messages.py` |
| Commands | `navigator-ai/bot/handlers/commands.py` |
| Web App buttons | `navigator-ai/bot/utils/keyboard.py` |
| API routes | `navigator-ai/backend/app/api/routes/*.py` |
| AI logic | `navigator-ai/backend/app/services/ai_service.py` |
| Persist AI results | `navigator-ai/backend/app/services/action_processor.py` |
| Config | `navigator-ai/backend/app/core/config.py` |
| Worker | `navigator-ai/backend/app/worker.py` |
| Mini App root | `navigator-ai/frontend/src/App.tsx` |
| API client | `navigator-ai/frontend/src/lib/api.ts` |
| Theme | `navigator-ai/frontend/src/lib/theme.ts` |
| Deploy workflow | `.github/workflows/deploy-frontend.yml` |
| Prod compose | `navigator-ai/docker-compose.prod.yml` |
| Caddy | `navigator-ai/Caddyfile` |

---

*Конец документа. При изменениях архитектуры обновляйте §2, §10 и §17.*
