# НавигаторAI (@NavigAI_bot)

Премиальный личный AI-навигатор жизни: Telegram-бот + Mini App. Голос, фото, текст и геопозиция → задачи, расходы, маршруты, напоминания и smart insights.

## Структура

```
navigator-ai/
├── bot/                  # aiogram 3 (webhook)
├── backend/              # FastAPI + SQLAlchemy + Alembic
├── frontend/             # React 19 Mini App
├── alembic/              # миграции PostgreSQL
├── nginx/                # reverse proxy
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

## Быстрый старт

```bash
cp .env.example .env
# Заполните BOT_TOKEN, OPENROUTER_API_KEY, YANDEX_MAPS_API_KEY, WEBHOOK_URL, MINI_APP_URL

docker compose up -d --build
```

Сервисы:
- **nginx** `:80` — Mini App + API + webhook
- **backend** `:8000` — FastAPI
- **bot** `:8081` — webhook `/bot/webhook`
- **frontend** `:3000` — статика Mini App
- **postgres**, **redis**, **worker**

## Переменные окружения

См. [.env.example](.env.example) — все ключи с комментариями.

## Функции

- Личный чат only (группы отклоняются)
- DeepSeek V3.2 через OpenRouter (JSON mode)
- Yandex Maps: geocode, routing, static maps + Redis cache
- Freemium: 20 действий/день; Premium: Stars + YooKassa
- Proactive: утренний дайджест 8:00, вечерний summary 21:00
- Шифрование адресов (Fernet), раздел «Приватность», удаление всех данных
- Экспорт iCal / PDF (premium)

## Разработка локально

```bash
# Backend
pip install -r requirements.txt
alembic upgrade head
uvicorn backend.app.main:app --reload

# Bot
python -m bot.main

# Frontend
cd frontend && npm install && npm run dev
```

## Приватность

Данные хранятся **только на вашем VPS**. Чувствительные поля шифруются. Пользователь сам добавляет «Мои места» — домашний адрес при onboarding не запрашивается.

## Лицензия

Proprietary — НавигаторAI © 2026
