"""Тесты суточных лимитов AI."""
from datetime import datetime, timedelta, timezone

import pytest

from backend.app.core.config import get_settings
from backend.app.models.user import User
from backend.app.services.user_service import user_service


@pytest.fixture
def free_user():
    return User(
        id=1,
        telegram_id=111,
        referral_code="TEST",
        tier="free",
        daily_actions_count=0,
    )


@pytest.fixture
def premium_user():
    return User(
        id=2,
        telegram_id=222,
        referral_code="PREM",
        tier="premium",
        premium_until=datetime.now(timezone.utc) + timedelta(days=30),
        daily_actions_count=0,
    )


def test_free_daily_limit_default():
    settings = get_settings()
    assert settings.free_daily_actions == 10


def test_premium_daily_limit_default():
    settings = get_settings()
    assert settings.premium_daily_actions == 50


@pytest.mark.asyncio
async def test_free_user_hits_limit(db_tables):
    from backend.app.core.database import async_session

    settings = get_settings()
    async with async_session() as session:
        user = User(telegram_id=999001, referral_code="LIM1", tier="free", daily_actions_count=0)
        session.add(user)
        await session.flush()

        for _ in range(settings.free_daily_actions):
            assert await user_service.check_daily_limit(session, user) is True
        assert await user_service.check_daily_limit(session, user) is False
        assert user_service.daily_actions_left(user) == 0


@pytest.mark.asyncio
async def test_premium_soft_cap(db_tables):
    from backend.app.core.database import async_session

    settings = get_settings()
    async with async_session() as session:
        user = User(
            telegram_id=999002,
            referral_code="LIM2",
            tier="premium",
            premium_until=datetime.now(timezone.utc) + timedelta(days=1),
            daily_actions_count=0,
        )
        session.add(user)
        await session.flush()

        for _ in range(settings.premium_daily_actions):
            assert await user_service.check_daily_limit(session, user) is True
        assert await user_service.check_daily_limit(session, user) is False
