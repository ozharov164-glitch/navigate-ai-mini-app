"""Полезные insights только из БД — без LLM."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import Expense, Route, Task
from backend.app.models.user import User
from backend.app.services.user_service import user_service


class ProductInsightsService:
    async def build(self, session: AsyncSession, user: User) -> list[dict]:
        insights: list[dict] = []
        today = date.today()
        month_start = today.replace(day=1)
        week_ago = today - timedelta(days=7)

        # Топ категория расходов за месяц
        cat_rows = (
            await session.execute(
                select(Expense.category, func.sum(Expense.amount).label("t"))
                .where(Expense.user_id == user.id, Expense.expense_date >= month_start)
                .group_by(Expense.category)
                .order_by(func.sum(Expense.amount).desc())
                .limit(3)
            )
        ).all()
        if cat_rows:
            top = cat_rows[0]
            insights.append(
                {
                    "id": "top_category",
                    "title": "Главная статья расходов",
                    "body": f"«{top[0]}» — {float(top[1]):,.0f} ₽ в этом месяце".replace(",", " "),
                    "icon": "wallet",
                }
            )
            if len(cat_rows) > 1:
                second = cat_rows[1]
                insights.append(
                    {
                        "id": "second_category",
                        "title": "Вторая статья",
                        "body": f"«{second[0]}» — {float(second[1]):,.0f} ₽".replace(",", " "),
                        "icon": "chart",
                    }
                )

        # Просроченные задачи
        overdue = (
            await session.execute(
                select(func.count(Task.id)).where(
                    Task.user_id == user.id,
                    Task.completed.is_(False),
                    Task.due_date.isnot(None),
                    Task.due_date < datetime.now(timezone.utc),
                )
            )
        ).scalar() or 0
        if overdue:
            insights.append(
                {
                    "id": "overdue",
                    "title": "Просрочено",
                    "body": f"{overdue} задач с прошедшим дедлайном — закройте или перенесите",
                    "icon": "alert",
                }
            )

        due_scheduled = (
            await session.execute(
                select(func.count(Task.id)).where(
                    Task.user_id == user.id,
                    Task.completed.is_(False),
                    Task.due_date.isnot(None),
                )
            )
        ).scalar() or 0
        if due_scheduled:
            insights.append(
                {
                    "id": "tasks_upcoming",
                    "title": "Задачи впереди",
                    "body": f"{due_scheduled} задач с дедлайном — откройте календарь",
                    "icon": "calendar",
                }
            )

        open_tasks = (
            await session.execute(
                select(func.count(Task.id)).where(
                    Task.user_id == user.id, Task.completed.is_(False)
                )
            )
        ).scalar() or 0
        if open_tasks > 3:
            insights.append(
                {
                    "id": "focus",
                    "title": "Фокус дня",
                    "body": f"{open_tasks} открытых задач — закройте 1–2 главные до вечера",
                    "icon": "target",
                }
            )

        week_sum = (
            await session.execute(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    Expense.user_id == user.id, Expense.expense_date >= week_ago
                )
            )
        ).scalar() or 0
        if week_sum > 0:
            insights.append(
                {
                    "id": "week_spend",
                    "title": "Неделя в цифрах",
                    "body": f"За 7 дней учтено {float(week_sum):,.0f} ₽ расходов".replace(",", " "),
                    "icon": "chart",
                }
            )

        routes_week = (
            await session.execute(
                select(func.count(Route.id)).where(
                    Route.user_id == user.id,
                    Route.created_at >= datetime.now(timezone.utc) - timedelta(days=7),
                )
            )
        ).scalar() or 0
        if routes_week:
            insights.append(
                {
                    "id": "routes_week",
                    "title": "Маршруты",
                    "body": f"За неделю построено {routes_week} маршрутов",
                    "icon": "map",
                }
            )

        if user.streak_count and user.streak_count >= 2:
            insights.append(
                {
                    "id": "streak",
                    "title": "Серия дней",
                    "body": f"Streak {user.streak_count} дней подряд — так держать!",
                    "icon": "flame",
                }
            )

        if not user_service.is_premium(user) and settings_premium_hint():
            insights.append(
                {
                    "id": "premium_tip",
                    "title": "Premium",
                    "body": "Голос, фото и 50 AI/день — в подписке Premium",
                    "icon": "crown",
                }
            )

        if user.saved_minutes_today > 0:
            insights.append(
                {
                    "id": "value_today",
                    "title": "Ценность сегодня",
                    "body": f"AI сэкономил {user.saved_minutes_today} мин и учёл {user.saved_rub_today} ₽",
                    "icon": "sparkles",
                }
            )

        if not insights:
            insights.append(
                {
                    "id": "tip_start",
                    "title": "С чего начать",
                    "body": "Напишите боту задачу или нажмите «Умный день»",
                    "icon": "lightbulb",
                }
            )

        return insights[:8]


def settings_premium_hint() -> bool:
    from backend.app.core.config import get_settings

    return get_settings().premium_only_multimedia


product_insights_service = ProductInsightsService()
