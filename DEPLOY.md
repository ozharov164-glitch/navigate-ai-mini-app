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

1. Создайте репозиторий `doit_bot` на GitHub и запушьте этот проект.
2. **Settings → Pages → Build: GitHub Actions**
3. **Settings → Secrets and variables → Actions:**
   - `VITE_API_URL` = `https://31-128-42-170.sslip.io`
4. **Settings → Variables (optional):**
   - `VITE_BASE_PATH` = `/doit_bot/`
5. Push в `main` — workflow `.github/workflows/deploy-frontend.yml` соберёт фронт.

В BotFather укажите Web App URL: `https://dmitriidekhanov.github.io/doit_bot/`

## VPS

Повторный деплой:

```bash
export DEPLOY_PASS='ваш-пароль'
./navigator-ai/scripts/deploy-to-vps.sh
```

Стек: `docker compose -f docker-compose.prod.yml`

## Локальный запуск

Отключён. Для разработки используйте `.env` + `docker compose` или polling локально.
