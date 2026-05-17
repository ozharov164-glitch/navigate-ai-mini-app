"""Тестовый переключатель Premium/Free для владельца бота."""
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.models.user import User

settings = get_settings()
MODES = frozenset({"premium", "free", "auto"})


class OwnerTestService:
    def is_owner(self, telegram_id: int) -> bool:
        return telegram_id == settings.bot_owner_telegram_id

    def get_mode(self, user: User) -> str:
        if not self.is_owner(user.telegram_id):
            return "auto"
        v = user.premium_test_override
        if v in ("premium", "free"):
            return v
        return "auto"

    def premium_override(self, user: User) -> bool | None:
        if not self.is_owner(user.telegram_id):
            return None
        mode = self.get_mode(user)
        if mode == "premium":
            return True
        if mode == "free":
            return False
        return None

    async def set_mode(self, session: AsyncSession, user: User, mode: str) -> str:
        if not self.is_owner(user.telegram_id):
            raise PermissionError("not owner")
        mode = mode.lower().strip()
        if mode not in MODES:
            raise ValueError("mode must be premium, free or auto")
        user.premium_test_override = None if mode == "auto" else mode
        await session.flush()
        return mode

    def status_payload(self, user: User, real_premium: bool) -> dict:
        mode = self.get_mode(user)
        effective = real_premium
        override = self.premium_override(user)
        if override is not None:
            effective = override
        return {
            "is_owner": self.is_owner(user.telegram_id),
            "test_mode": mode,
            "effective_premium": effective,
            "real_premium": real_premium,
            "tier": user.tier,
            "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        }


owner_test_service = OwnerTestService()
