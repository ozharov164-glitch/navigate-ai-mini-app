"""Зависимости FastAPI: авторизация через Telegram initData."""
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token, validate_telegram_init_data
from backend.app.models.user import User
from backend.app.services.user_service import user_service

settings = get_settings()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(None),
    x_telegram_init_data: str | None = Header(None, alias="X-Telegram-Init-Data"),
) -> User:
    telegram_id: int | None = None

    if x_telegram_init_data:
        parsed = validate_telegram_init_data(x_telegram_init_data)
        if parsed and "user" in parsed:
            telegram_id = parsed["user"].get("id")

    if not telegram_id and authorization:
        token = authorization.replace("Bearer ", "")
        user_id = decode_access_token(token)
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                return user

    if not telegram_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация Telegram")

    user = await user_service.get_or_create(
        db,
        telegram_id,
        username=None,
    )
    return user
