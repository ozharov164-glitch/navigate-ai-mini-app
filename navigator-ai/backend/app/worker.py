"""Фоновый worker: proactive-дайджесты и напоминания."""
import asyncio
import logging
from datetime import date, datetime, timezone

import httpx
import pytz
from sqlalchemy import select

from backend.app.core.config import get_settings
from backend.app.core.database import async_session
from backend.app.core.redis_client import cache_set_nx
from backend.app.models.content import Digest, Reminder, Route, Task
from backend.app.models.user import User
from backend.app.services.ai_service import ai_service

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def send_telegram_message(chat_id: int, text: str) -> None:
    if not settings.bot_token:
        return
    url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})


async def _digest_sent_today(session, user_id: int, digest_type: str) -> bool:
    """Проверка: дайджест этого типа уже отправлен сегодня."""
    existing = await session.execute(
        select(Digest.id).where(
            Digest.user_id == user_id,
            Digest.digest_type == digest_type,
            Digest.digest_date == date.today(),
        ).limit(1)
    )
    return existing.scalar_one_or_none() is not None


async def morning_digest() -> None:
    async with async_session() as session:
        users = (await session.execute(select(User).where(User.proactive_enabled.is_(True)))).scalars().all()
        for user in users:
            tz = pytz.timezone(user.timezone or settings.default_timezone)
            now = datetime.now(tz)
            if now.hour != settings.morning_digest_hour:
                continue

            if await _digest_sent_today(session, user.id, "morning"):
                continue

            redis_key = f"digest:morning:{user.id}:{date.today().isoformat()}"
            if not await cache_set_nx(redis_key, ttl=90000):
                continue

            tasks = (
                await session.execute(
                    select(Task).where(Task.user_id == user.id, Task.completed.is_(False)).limit(10)
                )
            ).scalars().all()
            task_lines = "\n".join(f"• {t.title}" for t in tasks) or "Задач на сегодня нет — отличный день!"
            text = f"☀️ <b>Утренний дайджест НавигаторAI</b>\n\n{task_lines}\n\n📱 Открой дашборд в Mini App"
            await send_telegram_message(user.telegram_id, text)
            session.add(
                Digest(user_id=user.id, digest_type="morning", content=text, insights=[], digest_date=date.today())
            )
        await session.commit()


async def evening_summary() -> None:
    async with async_session() as session:
        users = (await session.execute(select(User).where(User.proactive_enabled.is_(True)))).scalars().all()
        for user in users:
            tz = pytz.timezone(user.timezone or settings.default_timezone)
            now = datetime.now(tz)
            if now.hour != settings.evening_summary_hour:
                continue

            if await _digest_sent_today(session, user.id, "evening"):
                continue

            redis_key = f"digest:evening:{user.id}:{date.today().isoformat()}"
            if not await cache_set_nx(redis_key, ttl=90000):
                continue

            # Вечерний дайджест без LLM по умолчанию — не тратим OpenRouter на всех proactive-пользователей
            if settings.ai_worker_evening_llm:
                prompt = (
                    f"Сегодня пользователь сэкономил {user.saved_minutes_today} мин и "
                    f"{user.saved_rub_today} ₽. Краткий summary и 2 insight."
                )
                try:
                    analysis = await ai_service.analyze(text=prompt, is_premium=True)
                    insights = analysis.smart_insights
                    summary = analysis.summary
                except Exception:
                    summary = "День завершён. Завтра — новые возможности!"
                    insights = ["Отдыхайте — завтра продуктивнее с утренним планом"]
            else:
                summary = (
                    f"Сегодня AI сэкономил вам {user.saved_minutes_today} мин "
                    f"и {user.saved_rub_today} ₽."
                )
                insights = [
                    "Завтра утром придёт дайджест с задачами",
                    "Откройте Mini App — добавьте заметку голосом или текстом",
                ]

            text = f"🌙 <b>Вечерний итог</b>\n\n{summary}\n\n💡 " + "\n💡 ".join(insights[:3])
            await send_telegram_message(user.telegram_id, text)
            session.add(
                Digest(
                    user_id=user.id,
                    digest_type="evening",
                    content=summary,
                    insights=insights,
                    digest_date=date.today(),
                )
            )
        await session.commit()


async def check_reminders() -> None:
    async with async_session() as session:
        now = datetime.now(timezone.utc)
        reminders = (
            await session.execute(
                select(Reminder).where(Reminder.sent.is_(False), Reminder.remind_at <= now)
            )
        ).scalars().all()
        for rem in reminders:
            user = (await session.execute(select(User).where(User.id == rem.user_id))).scalar_one()
            await send_telegram_message(user.telegram_id, f"⏰ <b>Напоминание:</b> {rem.title}")
            rem.sent = True
        await session.commit()


async def traffic_alerts() -> None:
    """Уведомления о пробках — не чаще одного раза в сутки на маршрут."""
    async with async_session() as session:
        routes = (
            await session.execute(
                select(Route).where(Route.traffic_level == "heavy").order_by(Route.created_at.desc()).limit(20)
            )
        ).scalars().all()
        seen_users: set[int] = set()
        today_str = date.today().isoformat()

        for route in routes:
            if route.user_id in seen_users:
                continue

            route_data = dict(route.route_data or {})
            if route_data.get("traffic_alert_sent") == today_str:
                continue

            redis_key = f"traffic:{route.id}:{today_str}"
            if not await cache_set_nx(redis_key, ttl=90000):
                continue

            seen_users.add(route.user_id)
            user = (await session.execute(select(User).where(User.id == route.user_id))).scalar_one()
            if not user.proactive_enabled:
                continue

            msg = (
                f"🚗 Пробки на маршруте {route.from_address[:30]} → {route.to_address[:30]} "
                f"(~{route.duration_minutes} мин)"
            )
            await send_telegram_message(user.telegram_id, msg)

            route_data["traffic_alert_sent"] = today_str
            route.route_data = route_data

        await session.commit()


async def run_loop() -> None:
    logger.info("Worker НавигаторAI запущен")
    while True:
        try:
            await check_reminders()
            await morning_digest()
            await evening_summary()
            await traffic_alerts()
        except Exception:
            logger.exception("Worker cycle error")
        await asyncio.sleep(60)


if __name__ == "__main__":
    asyncio.run(run_loop())
