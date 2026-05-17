"""Операции с пользователями, лимитами и рефералами."""
import secrets
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.models.user import Referral, SubscriptionTier, User
from backend.app.services.owner_test_service import owner_test_service

settings = get_settings()


def _is_premium(user: User) -> bool:
    if user.tier in (SubscriptionTier.BASIC.value, SubscriptionTier.PREMIUM.value):
        if user.premium_until and user.premium_until > datetime.now(timezone.utc):
            return True
    return False


class UserService:
    async def get_or_create(self, session: AsyncSession, telegram_id: int, **kwargs) -> User:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one_or_none()
        if user:
            for k, v in kwargs.items():
                if v is not None and hasattr(user, k):
                    setattr(user, k, v)
            return user

        code = secrets.token_hex(4).upper()
        now = datetime.now(timezone.utc)
        user = User(
            telegram_id=telegram_id,
            referral_code=code,
            created_at=now,
            updated_at=now,
            **{k: v for k, v in kwargs.items() if hasattr(User, k)},
        )
        session.add(user)
        await session.flush()
        return user

    def is_premium(self, user: User) -> bool:
        override = owner_test_service.premium_override(user)
        if override is not None:
            return override
        return _is_premium(user)

    def can_use_multimedia(self, user: User) -> bool:
        if not settings.premium_only_multimedia:
            return True
        return self.is_premium(user)

    def multimedia_denied_message(self) -> str:
        return "Голос и фото доступны в Premium. Оформите подписку в Mini App."

    def _maybe_reset_daily(self, user: User) -> None:
        today = date.today()
        if not user.daily_actions_date:
            return
        d = user.daily_actions_date.date() if hasattr(user.daily_actions_date, "date") else user.daily_actions_date
        if d != today:
            user.daily_actions_count = 0
            user.saved_minutes_today = 0
            user.saved_rub_today = 0

    def daily_limit(self, user: User) -> int:
        if self.is_premium(user):
            cap = settings.premium_daily_actions
            return cap if cap > 0 else 999_999
        return settings.free_daily_actions

    def daily_actions_used(self, user: User) -> int:
        self._maybe_reset_daily(user)
        return user.daily_actions_count or 0

    def daily_actions_left(self, user: User) -> int:
        return max(0, self.daily_limit(user) - self.daily_actions_used(user))

    def limit_message(self, user: User) -> str:
        if self.is_premium(user):
            return f"Лимит Premium ({settings.premium_daily_actions} AI/день) исчерпан. Завтра счётчик обновится."
        return f"Лимит {settings.free_daily_actions} AI-действий в сутки. Оформите Premium."

    async def check_daily_limit(self, session: AsyncSession, user: User) -> bool:
        self._maybe_reset_daily(user)
        if user.daily_actions_count >= self.daily_limit(user):
            return False
        user.daily_actions_count += 1
        user.daily_actions_date = datetime.now(timezone.utc)
        return True

    async def add_value_metrics(self, user: User, minutes: int, rub: int) -> None:
        user.saved_minutes_today += minutes
        user.saved_rub_today += rub

    async def apply_referral(self, session: AsyncSession, user: User, code: str) -> bool:
        if user.referred_by_id:
            return False
        result = await session.execute(select(User).where(User.referral_code == code.upper()))
        referrer = result.scalar_one_or_none()
        if not referrer or referrer.id == user.id:
            return False

        user.referred_by_id = referrer.id
        ref = Referral(referrer_id=referrer.id, referred_id=user.id, bonus_applied=True)
        session.add(ref)

        bonus = timedelta(days=settings.referral_bonus_days)
        now = datetime.now(timezone.utc)
        base = referrer.premium_until if referrer.premium_until and referrer.premium_until > now else now
        referrer.premium_until = base + bonus
        referrer.tier = SubscriptionTier.PREMIUM.value
        return True

    async def extend_premium(self, user: User, days: int = 30, tier: str = SubscriptionTier.PREMIUM.value) -> None:
        now = datetime.now(timezone.utc)
        base = user.premium_until if user.premium_until and user.premium_until > now else now
        user.premium_until = base + timedelta(days=days)
        user.tier = tier


user_service = UserService()
