"""Зависимости FastAPI: авторизация через Telegram initData."""
from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.security import (
    decode_access_token,
    decode_export_token,
    validate_telegram_init_data,
)
from backend.app.models.user import User
from backend.app.services.user_service import user_service

settings = get_settings()


async def _user_from_telegram_id(db: AsyncSession, telegram_id: int) -> User:
    return await user_service.get_or_create(db, telegram_id, username=None)


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

    return await _user_from_telegram_id(db, telegram_id)


async def get_export_user(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(None),
    x_telegram_init_data: str | None = Header(None, alias="X-Telegram-Init-Data"),
    init: str | None = Query(None, description="Telegram initData для window.open"),
    token: str | None = Query(None, description="Краткоживущий export-токен"),
) -> User:
    """Авторизация экспорта: заголовок, query init или export-токен."""
    init_data = x_telegram_init_data or init
    if init_data:
        parsed = validate_telegram_init_data(init_data)
        if parsed and "user" in parsed:
            tid = parsed["user"].get("id")
            if tid:
                return await _user_from_telegram_id(db, tid)

    if token:
        user_id = decode_export_token(token)
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                return user

    if authorization:
        bearer = authorization.replace("Bearer ", "")
        user_id = decode_access_token(bearer) or decode_export_token(bearer)
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                return user

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация для экспорта")
