"""Полезные insights только из БД — без LLM."""
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import Expense, Task
from backend.app.models.user import User


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
                .limit(1)
            )
        ).first()
        if cat_rows and cat_rows[1]:
            insights.append(
                {
                    "id": "top_category",
                    "title": "Главная статья расходов",
                    "body": f"«{cat_rows[0]}» — {float(cat_rows[1]):,.0f} ₽ в этом месяце".replace(",", " "),
                    "icon": "wallet",
                }
            )

        # Активные задачи с дедлайном
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

        # Незавершённые сегодня
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

        # Расходы за неделю vs пусто
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
        elif not cat_rows:
            insights.append(
                {
                    "id": "tip_receipt",
                    "title": "Совет",
                    "body": "Отправьте фото чека боту — расходы появятся в бюджете автоматически",
                    "icon": "lightbulb",
                }
            )

        if user.saved_minutes_today > 0:
            insights.append(
                {
                    "id": "value_today",
                    "title": "Ценность сегодня",
                    "body": f"AI сэкономил вам {user.saved_minutes_today} мин и учёл {user.saved_rub_today} ₽",
                    "icon": "sparkles",
                }
            )

        return insights[:5]


product_insights_service = ProductInsightsService()
