"""Геймификация без LLM: streak, XP, уровень, достижения."""
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import ActionLog, Expense, Task
from backend.app.models.user import User

# XP за действия
XP_PER_AI = 10
XP_PER_TASK_DONE = 5
LEVEL_XP_STEP = 100


class GamificationService:
    def _reset_streak_if_needed(self, user: User) -> None:
        today = date.today()
        if user.streak_last_date is None:
            return
        last = user.streak_last_date.date() if hasattr(user.streak_last_date, "date") else user.streak_last_date
        if (today - last).days > 1:
            user.streak_count = 0

    def record_activity(self, user: User) -> None:
        """Вызывать после успешного AI-действия."""
        today = date.today()
        self._reset_streak_if_needed(user)
        last = None
        if user.streak_last_date:
            last = user.streak_last_date.date() if hasattr(user.streak_last_date, "date") else user.streak_last_date
        if last != today:
            user.streak_count = (user.streak_count or 0) + 1
            user.streak_last_date = datetime.now(timezone.utc)
        user.xp = (user.xp or 0) + XP_PER_AI

    def add_task_xp(self, user: User) -> None:
        user.xp = (user.xp or 0) + XP_PER_TASK_DONE

    def level_info(self, xp: int) -> tuple[int, int, int]:
        level = max(1, xp // LEVEL_XP_STEP + 1)
        xp_in_level = xp % LEVEL_XP_STEP
        xp_to_next = LEVEL_XP_STEP - xp_in_level
        return level, xp_in_level, xp_to_next

    async def build_profile(self, session: AsyncSession, user: User) -> dict:
        tasks_done = (
            await session.execute(
                select(func.count(Task.id)).where(Task.user_id == user.id, Task.completed.is_(True))
            )
        ).scalar() or 0

        total_expenses = (
            await session.execute(select(func.count(Expense.id)).where(Expense.user_id == user.id))
        ).scalar() or 0

        ai_actions = (
            await session.execute(select(func.count(ActionLog.id)).where(ActionLog.user_id == user.id))
        ).scalar() or 0

        month_total = (
            await session.execute(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.user_id == user.id)
            )
        ).scalar() or 0

        level, xp_in_level, xp_to_next = self.level_info(user.xp or 0)

        achievements = []
        checks = [
            ("first_step", "Первый шаг", "Выполнена первая задача", tasks_done >= 1),
            ("organizer", "Органайзер", "10 задач выполнено", tasks_done >= 10),
            ("budgeteer", "Бюджетник", "Учтено 5 расходов", total_expenses >= 5),
            ("navigator", "Навигатор", "20 AI-действий", ai_actions >= 20),
            ("streak_3", "Огонь ×3", "Streak 3 дня", (user.streak_count or 0) >= 3),
            ("streak_7", "Неделя силы", "Streak 7 дней", (user.streak_count or 0) >= 7),
            ("saver", "Экономист", "Сэкономлено 500 ₽ учёта", float(user.saved_rub_today or 0) >= 500 or float(month_total) >= 500),
        ]
        for aid, title, desc, ok in checks:
            achievements.append(
                {"id": aid, "title": title, "description": desc, "unlocked": bool(ok)}
            )

        return {
            "streak": user.streak_count or 0,
            "level": level,
            "xp": user.xp or 0,
            "xp_in_level": xp_in_level,
            "xp_to_next": xp_to_next,
            "achievements": achievements,
            "tasks_completed": int(tasks_done),
            "ai_actions_total": int(ai_actions),
        }


gamification_service = GamificationService()
