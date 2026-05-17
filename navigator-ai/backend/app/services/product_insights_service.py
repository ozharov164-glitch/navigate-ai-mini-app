"""Полезные insights только из БД — без LLM."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import Expense, Task
from backend.app.models.user import User
from backend.app.services.user_service import user_service


class ProductInsightsService:
    async def build(self, session: AsyncSession, user: User) -> list[dict]:
        insights: list[dict] = []
        today = date.today()
        month_start = today.replace(day=1)
        week_ago = today - timedelta(days=7)

        cat_rows = (
            await session.execute(
                select(Expense.category, func.sum(Expense.amount).label("t"))
                .where(Expense.user_id == user.id, Expense.expense_date >= month_start)
                .group_by(Expense.category)
                .order_by(func.sum(Expense.amount).desc())
                .limit(2)
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

        overdue = (
            await session.execute(
                select(func.count(Task.id)).where(
                    Task.user_id == user.id,
                    Task.completed.is_(False),
                    Task.archived.is_(False),
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
                    "body": f"{overdue} задач с прошедшим дедлайном",
                    "icon": "alert",
                }
            )

        completed_week = (
            await session.execute(
                select(func.count(Task.id)).where(
                    Task.user_id == user.id,
                    Task.completed.is_(True),
                    Task.completed_at >= datetime.now(timezone.utc) - timedelta(days=7),
                )
            )
        ).scalar() or 0
        if completed_week >= 3:
            insights.append(
                {
                    "id": "productive_week",
                    "title": "Продуктивная неделя",
                    "body": f"Закрыто {completed_week} задач за 7 дней",
                    "icon": "check",
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
                    "body": f"За 7 дней учтено {float(week_sum):,.0f} ₽".replace(",", " "),
                    "icon": "chart",
                }
            )

        if not user_service.is_premium(user):
            insights.append(
                {
                    "id": "premium_tip",
                    "title": "Premium",
                    "body": "Безлимит действий, PDF-экспорт и голосовые ответы AI",
                    "icon": "crown",
                }
            )

        if user.saved_minutes_today > 0:
            insights.append(
                {
                    "id": "value_today",
                    "title": "Ценность сегодня",
                    "body": f"Сэкономлено {user.saved_minutes_today} мин и {user.saved_rub_today} ₽",
                    "icon": "sparkles",
                }
            )

        if not insights:
            insights.append(
                {
                    "id": "tip_start",
                    "title": "С чего начать",
                    "body": "Отправьте текст, голос или фото — AI разложит по задачам и расходам",
                    "icon": "lightbulb",
                }
            )

        return insights[:6]


product_insights_service = ProductInsightsService()
