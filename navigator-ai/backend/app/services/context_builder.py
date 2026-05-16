"""Контекст из БД для AI-шаблонов day_plan и week_analysis."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import Expense, Task
from backend.app.models.user import User


class ContextBuilder:
    async def build_template_context(
        self, session: AsyncSession, user: User, template: str | None
    ) -> str | None:
        if template == "day_plan":
            return await self._day_plan_context(session, user)
        if template == "week_analysis":
            return await self._week_analysis_context(session, user)
        return None

    async def _day_plan_context(self, session: AsyncSession, user: User) -> str:
        today = date.today()
        tomorrow = today + timedelta(days=1)
        tasks = (
            await session.execute(
                select(Task)
                .where(Task.user_id == user.id, Task.completed.is_(False))
                .order_by(Task.due_date.nulls_last(), Task.created_at.desc())
                .limit(30)
            )
        ).scalars().all()

        lines = [f"Сегодня: {today.isoformat()}, часовой пояс: {user.timezone}"]
        if not tasks:
            lines.append("Активных задач в базе нет.")
        else:
            lines.append("Активные задачи пользователя:")
            for t in tasks:
                due = ""
                if t.due_date:
                    d = t.due_date.date() if hasattr(t.due_date, "date") else t.due_date
                    due = f", срок: {d.isoformat()}"
                lines.append(f"- [{t.priority}] {t.title}{due}")

        reminders_today = [t for t in tasks if t.due_date and _same_day(t.due_date, today)]
        reminders_tomorrow = [t for t in tasks if t.due_date and _same_day(t.due_date, tomorrow)]
        lines.append(f"На сегодня: {len(reminders_today)}, на завтра: {len(reminders_tomorrow)}")
        lines.append(
            f"Метрики дня: сэкономлено {user.saved_minutes_today} мин, {user.saved_rub_today} ₽."
        )
        return "\n".join(lines)

    async def _week_analysis_context(self, session: AsyncSession, user: User) -> str:
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        tasks = (
            await session.execute(
                select(Task).where(Task.user_id == user.id, Task.created_at >= week_ago)
            )
        ).scalars().all()
        expenses = (
            await session.execute(
                select(Expense).where(Expense.user_id == user.id, Expense.created_at >= week_ago)
            )
        ).scalars().all()

        completed = sum(1 for t in tasks if t.completed)
        total_exp = sum(e.amount for e in expenses)
        by_cat: dict[str, float] = {}
        for e in expenses:
            by_cat[e.category] = by_cat.get(e.category, 0) + e.amount

        cat_lines = [f"  - {k}: {v:.0f} ₽" for k, v in sorted(by_cat.items(), key=lambda x: -x[1])[:8]]

        return (
            f"Анализ за 7 дней (с {week_ago.date().isoformat()}):\n"
            f"Задач создано: {len(tasks)}, выполнено: {completed}\n"
            f"Расходов: {len(expenses)}, сумма: {total_exp:.0f} ₽\n"
            f"По категориям:\n" + ("\n".join(cat_lines) if cat_lines else "  (нет расходов)") + "\n"
            f"Метрики сегодня: {user.saved_minutes_today} мин, {user.saved_rub_today} ₽."
        )


def _same_day(dt: datetime, d: date) -> bool:
    if hasattr(dt, "date"):
        return dt.date() == d
    return dt == d


context_builder = ContextBuilder()
