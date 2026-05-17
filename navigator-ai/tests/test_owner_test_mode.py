"""Тест override premium для владельца."""
from types import SimpleNamespace

from backend.app.core.config import get_settings
from backend.app.services.owner_test_service import owner_test_service
from backend.app.services.user_service import user_service

settings = get_settings()


def _fake_user(telegram_id: int, override: str | None = None, tier: str = "free"):
    return SimpleNamespace(
        telegram_id=telegram_id,
        premium_test_override=override,
        tier=tier,
        premium_until=None,
    )


def test_owner_force_premium():
    u = _fake_user(settings.bot_owner_telegram_id, override="premium")
    assert owner_test_service.premium_override(u) is True


def test_owner_force_free():
    u = _fake_user(settings.bot_owner_telegram_id, override="free", tier="premium")
    assert owner_test_service.premium_override(u) is False


def test_non_owner_no_override():
    u = _fake_user(123456, override="premium")
    assert owner_test_service.premium_override(u) is None


def test_is_premium_uses_override(monkeypatch):
    u = _fake_user(settings.bot_owner_telegram_id, override="free", tier="premium")
    monkeypatch.setattr(
        "backend.app.services.user_service._is_premium",
        lambda user: True,
    )
    assert user_service.is_premium(u) is False
