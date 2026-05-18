"""Фоновый worker: напоминания и тихие дайджесты (timezone-aware)."""
import asyncio
import logging
from datetime import date, datetime, time, timedelta, timezone

import httpx
import pytz
from sqlalchemy import select

from backend.app.core.config import get_settings
from backend.app.core.database import async_session
from backend.app.core.redis_client import cache_set_nx
from backend.app.models.content import Digest, Reminder, Task
from backend.app.models.user import User

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _web_app_keyboard() -> dict | None:
    """Inline-кнопка открытия Mini App под напоминаниями и дайджестами."""
    base = (settings.mini_app_url or "").rstrip("/")
    if not base.startswith("https://"):
        return None
    return {
        "inline_keyboard": [[{"text": "📱 Открыть НавигаторAI", "web_app": {"url": f"{base}/"}}]]
    }


async def send_telegram_message(chat_id: int, text: str) -> None:
    if not settings.bot_token:
        return
    url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
    payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    kb = _web_app_keyboard()
    if kb:
        payload["reply_markup"] = kb
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(url, json=payload)


def _local_today(user: User) -> date:
    tz = pytz.timezone(user.timezone or settings.default_timezone)
    return datetime.now(tz).date()


async def _digest_sent_on(session, user_id: int, digest_type: str, on_date: date) -> bool:
    existing = await session.execute(
        select(Digest.id).where(
            Digest.user_id == user_id,
            Digest.digest_type == digest_type,
            Digest.digest_date == on_date,
        ).limit(1)
    )
    return existing.scalar_one_or_none() is not None


async def _has_digest_worthy_tasks(session, user: User) -> tuple[bool, list[Task]]:
    """Новые или просроченные задачи — повод для дайджеста."""
    tz = pytz.timezone(user.timezone or settings.default_timezone)
    local_today = datetime.now(tz).date()
    end_of_today = datetime.combine(local_today, time.max, tzinfo=tz).astimezone(timezone.utc)

    rows = (
        await session.execute(
            select(Task).where(
                Task.user_id == user.id,
                Task.archived.is_(False),
                Task.completed.is_(False),
            ).limit(20)
        )
    ).scalars().all()

    worthy: list[Task] = []
    for t in rows:
        if t.due_date is None:
            worthy.append(t)
            continue
        if t.due_date <= end_of_today:
            worthy.append(t)
    return len(worthy) > 0, worthy


async def morning_digest() -> None:
    async with async_session() as session:
        users = (await session.execute(select(User).where(User.proactive_enabled.is_(True)))).scalars().all()
        for user in users:
            tz = pytz.timezone(user.timezone or settings.default_timezone)
            now = datetime.now(tz)
            if now.hour != settings.morning_digest_hour:
                continue

            local_date = now.date()
            if await _digest_sent_on(session, user.id, "morning", local_date):
                continue

            has_tasks, tasks = await _has_digest_worthy_tasks(session, user)
            if not has_tasks:
                continue

            redis_key = f"digest:morning:{user.id}:{local_date.isoformat()}"
            if not await cache_set_nx(redis_key, ttl=90000):
                continue

            task_lines = "\n".join(f"• {t.title}" for t in tasks[:8])
            text = f"☀️ <b>Утро · НавигаторAI</b>\n\n{task_lines}"
            await send_telegram_message(user.telegram_id, text)
            session.add(
                Digest(user_id=user.id, digest_type="morning", content=text, insights=[], digest_date=local_date)
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

            local_date = now.date()
            if await _digest_sent_on(session, user.id, "evening", local_date):
                continue

            has_tasks, tasks = await _has_digest_worthy_tasks(session, user)
            overdue = sum(
                1
                for t in tasks
                if t.due_date and t.due_date.astimezone(tz).date() < local_date
            )
            if not has_tasks and overdue == 0:
                continue

            redis_key = f"digest:evening:{user.id}:{local_date.isoformat()}"
            if not await cache_set_nx(redis_key, ttl=90000):
                continue

            summary = (
                f"Сегодня: {user.saved_minutes_today} мин и {user.saved_rub_today} ₽ учтено AI."
            )
            if overdue:
                summary += f"\nПросрочено задач: {overdue}."
            text = f"🌙 <b>Вечер · НавигаторAI</b>\n\n{summary}"
            await send_telegram_message(user.telegram_id, text)
            session.add(
                Digest(
                    user_id=user.id,
                    digest_type="evening",
                    content=summary,
                    insights=[],
                    digest_date=local_date,
                )
            )
        await session.commit()


async def check_reminders() -> None:
    async with async_session() as session:
        now = datetime.now(timezone.utc)
        reminders = (
            await session.execute(select(Reminder).where(Reminder.sent.is_(False), Reminder.remind_at <= now))
        ).scalars().all()
        for rem in reminders:
            user = (await session.execute(select(User).where(User.id == rem.user_id))).scalar_one()
            await send_telegram_message(user.telegram_id, f"⏰ <b>Напоминание</b>\n{rem.title}")
            rem.sent = True
        await session.commit()


async def run_loop() -> None:
    logger.info("Worker НавигаторAI запущен")
    while True:
        try:
            await check_reminders()
            await morning_digest()
            await evening_summary()
        except Exception:
            logger.exception("Worker cycle error")
        await asyncio.sleep(60)


if __name__ == "__main__":
    asyncio.run(run_loop())
