"""Модели пользователя, мест и рефералов."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str] = mapped_column(String(255), nullable=True)
    language_code: Mapped[str] = mapped_column(String(10), default="ru")
    timezone: Mapped[str] = mapped_column(String(64), default="Europe/Moscow")
    tier: Mapped[str] = mapped_column(String(20), default=SubscriptionTier.FREE.value)
    premium_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    referral_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    referred_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    daily_actions_count: Mapped[int] = mapped_column(Integer, default=0)
    daily_actions_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    saved_minutes_today: Mapped[int] = mapped_column(Integer, default=0)
    saved_rub_today: Mapped[int] = mapped_column(Integer, default=0)
    proactive_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    theme: Mapped[str] = mapped_column(String(10), default="dark")
    route_provider: Mapped[str] = mapped_column(String(10), default="auto")  # auto | yandex | osrm
    streak_count: Mapped[int] = mapped_column(Integer, default=0)
    streak_last_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    places: Mapped[list["UserPlace"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserPlace(Base):
    __tablename__ = "user_places"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))  # дом, работа, дача
    address_encrypted: Mapped[str] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(nullable=True)
    lon: Mapped[float] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="places")


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    referrer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    referred_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    bonus_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
