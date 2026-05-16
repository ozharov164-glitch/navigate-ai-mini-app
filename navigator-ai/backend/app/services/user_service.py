"""Операции с пользователями, лимитами и рефералами."""
import secrets
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.security import decrypt_sensitive, encrypt_sensitive
from backend.app.models.user import Referral, SubscriptionTier, User, UserPlace

settings = get_settings()


def _is_premium(user: User) -> bool:
    if user.tier in (SubscriptionTier.BASIC.value, SubscriptionTier.PREMIUM.value):
        if user.premium_until and user.premium_until > datetime.now(timezone.utc):
            return True
    return False


class UserService:
  async def get_or_create(
      self, session: AsyncSession, telegram_id: int, **kwargs
  ) -> User:
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
      return _is_premium(user)

  async def check_daily_limit(self, session: AsyncSession, user: User) -> bool:
      """True если можно выполнить действие."""
      if self.is_premium(user):
          return True
      today = date.today()
      if user.daily_actions_date:
          d = user.daily_actions_date.date() if hasattr(user.daily_actions_date, "date") else user.daily_actions_date
          if d != today:
              user.daily_actions_count = 0
      if user.daily_actions_count >= settings.free_daily_actions:
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

  async def get_places_decrypted(self, session: AsyncSession, user_id: int) -> list[dict]:
      result = await session.execute(select(UserPlace).where(UserPlace.user_id == user_id))
      places = []
      for p in result.scalars().all():
          try:
              addr = decrypt_sensitive(p.address_encrypted)
          except Exception:
              addr = ""
          places.append({"name": p.name, "address": addr, "lat": p.lat, "lon": p.lon})
      return places

  async def add_place(self, session: AsyncSession, user_id: int, name: str, address: str, lat: float | None, lon: float | None) -> UserPlace:
      place = UserPlace(
          user_id=user_id,
          name=name,
          address_encrypted=encrypt_sensitive(address),
          lat=lat,
          lon=lon,
      )
      session.add(place)
      await session.flush()
      return place

  async def delete_all_data(self, session: AsyncSession, user: User) -> None:
      """Каскадное удаление через relationships + явная очистка."""
      await session.delete(user)
      await session.flush()


user_service = UserService()
