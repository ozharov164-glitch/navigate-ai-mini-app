# Деплой НавигаторAI (гибрид)

## Архитектура

| Компонент | Где |
|-----------|-----|
| Mini App (React) | GitHub Pages |
| Bot + API + PostgreSQL + Redis + Worker | VPS `31.128.42.170` |

- **API (HTTPS):** https://31-128-42-170.sslip.io
- **Webhook:** https://31-128-42-170.sslip.io/bot/webhook
- **Mini App:** https://ozharov164-glitch.github.io/navigate-ai-mini-app/

## GitHub Pages (Mini App)

1. Репозиторий: `https://github.com/ozharov164-glitch/navigate-ai-mini-app`
2. **Settings → Pages → Build: GitHub Actions**
3. Workflow `.github/workflows/deploy-frontend.yml`:
   - `VITE_API_URL` = `https://31-128-42-170.sslip.io/api`
   - `VITE_BASE_PATH` = `/navigate-ai-mini-app/`
4. Push в `main` — автодеплой на `gh-pages`.

В **BotFather** Web App URL (совпадает с `MINI_APP_URL` и `CORS_ORIGINS`):

```
https://ozharov164-glitch.github.io/navigate-ai-mini-app/
```

## VPS

```bash
export DEPLOY_PASS='ваш-пароль'
./navigator-ai/scripts/deploy-to-vps.sh
```

Стек: `docker compose -f docker-compose.prod.yml`

В `.env.production` на сервере:

```env
MINI_APP_URL=https://ozharov164-glitch.github.io/navigate-ai-mini-app/
CORS_ORIGINS=https://ozharov164-glitch.github.io,https://web.telegram.org
FREE_DAILY_ACTIONS=10
PREMIUM_DAILY_ACTIONS=50
AI_JSON_RETRIES_PREMIUM=1
PREMIUM_ONLY_MULTIMEDIA=true
WHISPER_ENABLED=false
DEFAULT_TIMEZONE=Europe/Moscow
```

## Миграции

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Актуальная миграция: `005_premium_minimal_v2` (archive задач, удаление маршрутов и геймификации).

## Whisper (опционально)

```bash
docker compose -f docker-compose.prod.yml --profile whisper up -d whisper
```

В `.env`: `WHISPER_ENABLED=true`, `WHISPER_URL=http://whisper:8000`

## Тесты перед деплоем

```bash
cd navigator-ai
pip install -r requirements.txt
pytest tests/ -v
cd frontend && npm run build
```

## YooKassa webhook

`https://31-128-42-170.sslip.io/api/payments/yookassa-webhook`
