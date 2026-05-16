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
