# НавигаторAI (@NavigAI_bot)

Премиальный личный AI-навигатор: Telegram-бот + Mini App. Голос, фото, текст и геопозиция → задачи, расходы, маршруты, напоминания и smart insights.

## Архитектура (production)

| Компонент | URL |
|-----------|-----|
| Mini App | https://ozharov164-glitch.github.io/navigate-ai-mini-app/ |
| API | https://31-128-42-170.sslip.io/api |
| Bot | @NavigAI_bot |

## Структура

```
navigator-ai/
├── bot/                  # aiogram 3 (webhook)
├── backend/              # FastAPI + SQLAlchemy + Alembic
├── frontend/             # React 19 Mini App (GitHub Pages)
├── tests/                # pytest
├── alembic/
├── docker-compose.prod.yml
└── scripts/deploy-to-vps.sh
```

## Деплой

См. [DEPLOY.md](../DEPLOY.md) в корне репозитория.

```bash
export DEPLOY_PASS='...'
./navigator-ai/scripts/deploy-to-vps.sh
```

## Локальная разработка

```bash
cp .env.example .env
docker compose up -d postgres redis backend
python -m bot.main   # polling если WEBHOOK_URL пустой

cd frontend && npm install && VITE_API_URL=http://localhost:8000/api npm run dev
```

## Тесты и линтер

```bash
pip install -r requirements.txt
pytest tests/ -v
ruff check backend bot tests
black --check backend bot tests
```

## Переменные окружения

См. [.env.example](.env.example). Обязательно в production:

- `WEBHOOK_SECRET`, `BOT_TOKEN`, `OPENROUTER_API_KEY`
- `MINI_APP_URL` = URL GitHub Pages
- `CORS_ORIGINS` = origin Pages + `https://web.telegram.org`
- `ENCRYPTION_KEY` — валидный Fernet (44 символа base64)

## Функции

- DeepSeek V3.2 + fallback-модели (транскрипция, vision)
- Контекст из БД для шаблонов day_plan / week_analysis
- Yandex Maps, freemium 20/день, Stars + YooKassa
- Rate limit, валидация upload, JSON-ответы с Pydantic retry
- Proactive digests, Fernet для адресов, экспорт iCal/PDF

## Приватность

Данные на вашем VPS. Удаление всех данных — Mini App → Приватность.

## Лицензия

Proprietary — НавигаторAI © 2026
