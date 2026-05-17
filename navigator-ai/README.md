# НавигаторAI (@NavigAI_bot)

Тихий премиальный личный AI-оператор повседневной жизни. Голос, фото или текст → задачи, расходы и напоминания. Mini App + Telegram-бот.

## Архитектура (production)

| Компонент | URL |
|-----------|-----|
| Mini App | https://ozharov164-glitch.github.io/navigate-ai-mini-app/ |
| API | https://31-128-42-170.sslip.io/api |
| Bot | @NavigAI_bot |

## Вкладки Mini App

1. **Сегодня** — ввод, задачи, выполненные сегодня, insights из БД  
2. **Календарь** — задачи по датам  
3. **Бюджет** — расходы и категории  
4. **Настройки** — часовой пояс, Premium, приватность, экспорт  

## Стек

- Backend: FastAPI, SQLAlchemy async, PostgreSQL, Redis, Alembic  
- Bot: aiogram 3 (webhook)  
- Frontend: React 19, Vite, Tailwind, shadcn/ui, Framer Motion  
- AI: DeepSeek V3.2 через OpenRouter (JSON mode)  
- Whisper: self-hosted (опционально, profile `whisper`)  

## Лимиты AI

- Free: 10 действий/день  
- Premium: soft-cap 50/день (env `PREMIUM_DAILY_ACTIONS`)  
- Без LLM при открытии вкладок — только при разборе ввода  

## Деплой

См. [DEPLOY.md](../DEPLOY.md).

```bash
export DEPLOY_PASS='...'
./scripts/deploy-to-vps.sh
```

После обновления backend:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Миграция `005_premium_minimal_v2`: archive задач, удаление routes/gamification.

## Локальная разработка

```bash
cp .env.example .env
docker compose up -d postgres redis backend
python -m bot.main

cd frontend && npm install && VITE_API_URL=http://localhost:8000/api npm run dev
```

## Тесты

```bash
pip install -r requirements.txt
pytest tests/ -v
```

## Переменные окружения

См. `.env.example`. Обязательно в production:

- `WEBHOOK_SECRET`, `BOT_TOKEN`, `OPENROUTER_API_KEY`
- `MINI_APP_URL`, `CORS_ORIGINS`
- `ENCRYPTION_KEY` (Fernet, 44 символа base64)

Опционально Whisper:

```bash
docker compose -f docker-compose.prod.yml --profile whisper up -d whisper
# WHISPER_ENABLED=true, WHISPER_URL=http://whisper:8000
```
