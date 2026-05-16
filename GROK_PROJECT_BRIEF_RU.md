# НавигаторAI — brief для Grok (функционал + бюджет)

> **Для кого:** Grok / другой ИИ, который будет дорабатывать и **оптимизировать расходы** проекта.  
> **Дата:** май 2026  
> **Бот:** `@NavigAI_bot`  
> **Репозиторий:** `https://github.com/ozharov164-glitch/navigate-ai-mini-app`  
> **Локальный путь:** `/Users/dmitriidekhanov/doit_bot/navigator-ai`

---

## 0. Главный контекст для Grok

**У владельца проекта очень ограниченный бюджет на AI:**

- OpenRouter: **~$30** на балансе, пополнять часто нельзя — только после появления прибыли.
- VPS уже оплачен (гибридный деплой).
- **Приоритет №1 для любых доработок:** не увеличивать число LLM-вызовов и токенов без явной необходимости.
- **Приоритет №2:** монетизация (Stars / YooKassa) должна окупать API раньше, чем баланс кончится.

Любое предложение Grok должно оцениваться в **$/месяц на OpenRouter** и в **числе API-вызовов на одно действие пользователя**.

---

## 1. Что это за продукт

**НавигаторAI** — личный AI-навигатор в Telegram для российского пользователя.

Пользователь отправляет в бота или Mini App:

- **текст** — заметки, задачи, расходы;
- **голос** — транскрипция + структурирование;
- **фото** — чеки, билеты, документы;
- **геопозицию** — маршруты (Yandex Maps).

Система через LLM извлекает JSON и сохраняет в PostgreSQL:

- задачи (`tasks`)
- расходы (`expenses`)
- маршруты (`routes`)
- напоминания (`reminders`)
- smart insights (`smart_insights`)
- document vault (фото документов)

**Mini App (React)** — дашборд: сегодня, календарь, бюджет, маршруты, настройки, премиум, приватность.

**Монетизация:** freemium + premium (Telegram Stars, YooKassa).

---

## 2. Архитектура (production)

```
Telegram @NavigAI_bot
        │
        ├── Webhook → VPS (Docker)
        │       ├── bot (aiogram 3) :8081
        │       ├── backend (FastAPI) :8000
        │       ├── worker (asyncio loop, 60s)
        │       ├── postgres:16
        │       ├── redis:7
        │       └── caddy (HTTPS)
        │
        └── Mini App WebView → GitHub Pages (static React)
                └── API → https://31-128-42-170.sslip.io/api
```

| Ресурс | URL |
|--------|-----|
| API | `https://31-128-42-170.sslip.io` |
| Health | `/health` |
| Mini App | `https://ozharov164-glitch.github.io/navigate-ai-mini-app/` |
| VPS path | `/opt/navigai/app` |

**Важно:** `MINI_APP_URL`, `CORS_ORIGINS`, `VITE_BASE_PATH` — все на `.../navigate-ai-mini-app/`.

---

## 3. Стек

| Слой | Технологии |
|------|------------|
| Bot | Python 3.12, aiogram 3 |
| API | FastAPI, SQLAlchemy async, Alembic |
| AI | OpenRouter → `deepseek/deepseek-v3.2` (текст/JSON), `google/gemini-2.5-flash` (голос/фото) |
| Maps | Yandex Geocoder + Router (без ключа — fallback-маршруты) |
| Cache | Redis |
| Frontend | React 19, Vite 6, Tailwind 3 |
| Deploy | GitHub Actions → gh-pages; `scripts/deploy-to-vps.sh` → docker-compose.prod.yml |

---

## 4. Функционал бота

### Команды

| Команда | Действие |
|---------|----------|
| `/start` | Регистрация, реферальный код, кнопка Mini App; deep link `/start ref_XXX` применяет реферал |
| `/help` | Справка |
| `/premium` | Тарифы Stars + кнопка Mini App `?page=premium` |
| `/privacy` | Текст + Mini App `?page=privacy` |

### Типы сообщений

| Тип | Pipeline | **Стоимость AI** |
|-----|----------|------------------|
| Текст | `analyze` → persist | 1× DeepSeek (+ retry при битом JSON) |
| Голос | `transcribe_voice` → `analyze` | 1× Gemini + 1× DeepSeek |
| Фото | `describe_photo` → `analyze` (только текст описания) | 1× Gemini + 1× DeepSeek |
| Гео | текст + координаты → `analyze` + Yandex route | 1× DeepSeek + Yandex API |

**Шаблоны по ключевым словам / кнопкам Mini App:**

- `receipt` — разбор чека
- `day_plan` — план дня (+ контекст задач из БД)
- `week_analysis` — анализ недели (+ контекст задач/расходов из БД)

### Платежи Stars (в боте)

- Invoice → `successful_payment` → `POST /api/internal/bot/activate-premium`
- Premium в БД: +30 дней

---

## 5. Mini App (React)

### Вкладки

| Tab | Функции |
|-----|---------|
| **home** | Summary, AI-поле (текст), быстрые шаблоны, задачи на сегодня, insights |
| **calendar** | Месячная сетка, задачи по дням, полный список `api.tasks()`, экспорт iCal |
| **budget** | Pie chart, категории, **список транзакций** |
| **routes** | Карточки маршрутов, ссылки Yandex |
| **more** | Premium (Stars `openInvoice`, YooKassa), места, vault, digests, экспорт, приватность, тема |

### UI

- Тёмная / светлая тема (`applyTheme`, классы `text-primary`, `text-muted`, …)
- Toast + Modal (без `alert`/`confirm`)
- VoiceFab — MediaRecorder → `/dashboard/analyze-voice`
- Авторизация: `X-Telegram-Init-Data` на всех API-запросах

---

## 6. Backend API (кратко)

| Prefix | Назначение |
|--------|------------|
| `GET /health` | Healthcheck |
| `/api/dashboard` | Дашборд, analyze, voice, tasks, expenses, places, settings, privacy |
| `/api/payments` | Stars invoice link, YooKassa, confirm (с верификацией), webhook |
| `/api/export` | iCal, PDF (premium), export token |
| `/api/internal/bot` | `ensure-user`, `process`, `activate-premium` — только с `X-Bot-Secret` |

**Лимиты:**

- Freemium: **20 AI-действий/сутки** (`FREE_DAILY_ACTIONS`)
- Premium: безлимит действий (⚠️ риск для бюджета!)
- Rate limit: 30 req/min на пользователя (Redis)

---

## 7. Worker (фон, каждые 60 сек)

| Задача | Использует LLM? |
|--------|-----------------|
| Напоминания (`remind_at`) | **Нет** — только Telegram message |
| Утренний дайджест (8:00) | **Нет** — список задач из БД |
| Вечерний итог (21:00) | **Нет** (по умолчанию) — шаблонный текст; LLM только если `AI_WORKER_EVENING_LLM=true` |
| Traffic alerts | **Нет** — уведомление о пробках, дедупликация 1/день |

---

## 8. AI-пайплайн и экономия (уже внедрено)

Файл: `backend/app/services/ai_service.py`

### Модели

| Задача | Модель |
|--------|--------|
| Текст / JSON | `deepseek/deepseek-v3.2` |
| Голос (ASR) | `google/gemini-2.5-flash` |
| Фото (vision) | `google/gemini-2.5-flash` |

### Режим `AI_BUDGET_MODE=true` (production)

| Мера | Описание |
|------|----------|
| Одно vision на фото | После `describe_photo` картинка **не** отправляется повторно в `analyze` |
| Кэш analyze | Redis, TTL `AI_CACHE_TTL=3600` |
| Кэш ASR | По SHA256 аудио |
| Кэш vision | По SHA256 изображения |
| Меньше токенов | `AI_MAX_TOKENS=2048`, vision 800, transcribe 512 |
| Меньше retry | Free: 1 попытка JSON; premium: до 3 |
| Короткие fallback | В budget — одна модель, без перебора 3 моделей |
| Worker evening | Без LLM (`AI_WORKER_EVENING_LLM=false`) |
| Логи usage | `prompt_tokens` / `completion_tokens` в логах backend |

### Переменные `.env` (экономия)

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

### Сколько API-вызовов на 1 действие (после оптимизации)

| Действие | Вызовов OpenRouter |
|----------|-------------------|
| Текст | 1 (+0–2 retry premium) |
| Голос | 2 (ASR + analyze) |
| Фото | 2 (vision + analyze) |
| Шаблон с контекстом БД | 1 (длиннее prompt → больше input tokens) |

---

## 9. Монетизация

| Тариф | Цена | Что даёт |
|-------|------|----------|
| Free | 0 | 20 AI-действий/день |
| Basic | 199 Stars / 199 ₽ | Premium 30 дней |
| Premium | 399 Stars / 399 ₽ | Premium 30 дней |

Premium: безлимит действий, PDF-отчёт, приоритет (больше retry).

**Реферал:** `/start ref_CODE` → +14 дней premium рефереру.

**Платежи:**

- Stars: `createInvoiceLink` → `Telegram.WebApp.openInvoice` / бот invoice
- YooKassa: redirect + webhook `/api/payments/yookassa-webhook`
- `/api/payments/confirm` — только с проверкой `payment_id` в API YooKassa

---

## 10. Безопасность (кратко)

- `WEBHOOK_SECRET` обязателен для bot internal API
- Telegram initData HMAC (24h)
- Fernet для адресов «Мои места»
- Upload: лимит размера + проверка magic bytes
- Секреты только в `.env` / `.env.production` (не в git)

---

## 11. Что уже сделано (май 2026)

- Фазы A–D handoff: стабильность, UX, AI quality, pytest, rate limit, docs
- Унификация URL GitHub Pages
- Referral, Stars premium, YooKassa verify
- Export с auth, worker dedupe
- **Оптимизация OpenRouter** (budget mode, no double vision, caches)

Подробный технический handoff: `PROJECT_HANDOFF_RU.md`  
Деплой: `DEPLOY.md`

---

## 12. Задачи для Grok: дальнейшая оптимизация бюджета

**Делать в первую очередь (низкий риск, высокая экономия):**

1. **Soft-cap premium** — лимит 30–50 AI-действий/день даже для premium до стабильной выручки.
2. **`FREE_DAILY_ACTIONS=10`** — снизить freemium с 20 до 10.
3. **OpenRouter hard limit** — напомнить владельцу выставить monthly cap в кабинете OpenRouter.
4. **Короче system prompt** — меньше input tokens на каждый запрос.
5. **Шаблоны week_analysis / day_plan** — урезать `db_context` (топ-5 задач, не 30).
6. **Отключить premium retry=3** в budget mode → 1–2 для всех.
7. **Dashboard без AI** — загрузка дашборда не должна вызывать LLM (сейчас не вызывает ✓).

**Делать осторожно (может ухудшить UX):**

8. Локальный ASR (Whisper на VPS) вместо Gemini — экономия, но нужен CPU/GPU.
9. Убрать vision для «простых» фото — только OCR эвристика (сложно).
10. Платный только голос/фото, текст бесплатно с жёстким лимитом.

**Не делать без согласования:**

- Добавлять новые фоновые LLM-задачи в worker
- Вызывать LLM на каждый page view Mini App
- Увеличивать `AI_MAX_TOKENS` или число fallback-моделей
- Включать `AI_WORKER_EVENING_LLM=true` на production

---

## 13. Оценка расхода ($30 OpenRouter)

| Сценарий | Примерно / месяц |
|----------|------------------|
| 10 users × 5 текстов/день | $1–3 |
| + голос/фото у 30% | +$3–8 |
| 5 активных premium без cap | +$5–20 |

**Вывод для Grok:** при росте пользователей сначала вводить **лимиты и caps**, потом — фичи.

---

## 14. Ключевые файлы

| Задача | Путь |
|--------|------|
| AI + кэш + budget | `backend/app/services/ai_service.py` |
| Контекст БД для шаблонов | `backend/app/services/context_builder.py` |
| Persist | `backend/app/services/action_processor.py` |
| Лимиты пользователя | `backend/app/services/user_service.py` |
| Worker | `backend/app/worker.py` |
| Config / env | `backend/app/core/config.py`, `.env.production` |
| Bot handlers | `bot/handlers/messages.py`, `commands.py`, `payments.py` |
| Mini App | `frontend/src/App.tsx`, `lib/api.ts` |
| Deploy | `scripts/deploy-to-vps.sh`, `docker-compose.prod.yml` |

---

## 15. Команды для Grok

```bash
# Логи расхода токенов на VPS
docker compose -f docker-compose.prod.yml logs backend | grep OpenRouter

# Деплой после правок
export DEPLOY_PASS='...'
./navigator-ai/scripts/deploy-to-vps.sh

# Тесты (unit, без БД)
cd navigator-ai && pytest tests/test_ai_parse.py -v
```

---

## 16. Формат ответа Grok

При предложении изменений Grok должен указывать:

1. **Что меняется в UX**
2. **Сколько LLM-вызовов на действие** (до / после)
3. **Оценка $/месяц** при 10 / 50 / 200 DAU
4. **Какие env-переменные** затронуты

---

*Документ для передачи в Grok. Обновлять при смене архитектуры, тарифов или budget-настроек.*
