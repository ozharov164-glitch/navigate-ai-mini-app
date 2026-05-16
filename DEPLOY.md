# Деплой НавигаторAI (гибрид)

## Архитектура

| Компонент | Где |
|-----------|-----|
| Mini App (React) | GitHub Pages |
| Bot + API + PostgreSQL + Redis | VPS `31.128.42.170` |

- **API (HTTPS):** https://31-128-42-170.sslip.io
- **Webhook:** https://31-128-42-170.sslip.io/bot/webhook
- **Mini App:** https://ozharov164-glitch.github.io/navigate-ai-mini-app/

## GitHub Pages (Mini App)

1. Репозиторий: `https://github.com/ozharov164-glitch/navigate-ai-mini-app`
2. **Settings → Pages → Build: GitHub Actions**
3. Workflow `.github/workflows/deploy-frontend.yml` задаёт:
   - `VITE_API_URL` = `https://31-128-42-170.sslip.io/api`
   - `VITE_BASE_PATH` = `/navigate-ai-mini-app/`
4. Push в `main` — автодеплой на ветку `gh-pages`.

В **BotFather** укажите Web App URL (должен совпадать с `MINI_APP_URL` и `CORS_ORIGINS`):

```
https://ozharov164-glitch.github.io/navigate-ai-mini-app/
```

## VPS

Повторный деплой:

```bash
export DEPLOY_PASS='ваш-пароль'
./navigator-ai/scripts/deploy-to-vps.sh
```

Стек: `docker compose -f docker-compose.prod.yml`

В `.env.production` на сервере:

```env
MINI_APP_URL=https://ozharov164-glitch.github.io/navigate-ai-mini-app/
CORS_ORIGINS=https://ozharov164-glitch.github.io,https://web.telegram.org
```

## Локальный запуск

```bash
cp navigator-ai/.env.example navigator-ai/.env
# WEBHOOK_URL пустой → polling
docker compose -f navigator-ai/docker-compose.yml up -d postgres redis backend
cd navigator-ai && python -m bot.main
```

## Миграции после обновления backend

На VPS внутри контейнера или с хоста:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Миграции: `002_gamification_routing`, `003_user_templates`.

Обновите `.env.production`:

```env
FREE_DAILY_ACTIONS=10
PREMIUM_DAILY_ACTIONS=50
AI_JSON_RETRIES_PREMIUM=1
YANDEX_DAILY_LIMIT=800
YANDEX_STATIC_DISABLE_ABOVE=700
YANDEX_MAPS_API_KEY=ваш-ключ-яндекс-карт
PREMIUM_ONLY_MULTIMEDIA=true
WHISPER_ENABLED=false
```

### Яндекс.Карты

В [developer.tech.yandex.ru](https://developer.tech.yandex.ru/) создайте ключ с API: Geocoder, Router, Static Maps.  
Пропишите в `.env.production`: `YANDEX_MAPS_API_KEY=...`  
Без ключа маршруты работают как ссылка «Открыть в Яндекс.Картах» (без времени и картинки).

### Whisper (опционально, экономия ASR)

```bash
docker compose -f docker-compose.prod.yml --profile whisper up -d whisper
```

В `.env`: `WHISPER_ENABLED=true`, `WHISPER_URL=http://whisper:8000`

## Тесты перед деплоем

```bash
cd navigator-ai
pip install -r requirements.txt
pytest tests/ -v
```

## YooKassa webhook

В личном кабинете YooKassa укажите:

`https://31-128-42-170.sslip.io/api/payments/yookassa-webhook`
