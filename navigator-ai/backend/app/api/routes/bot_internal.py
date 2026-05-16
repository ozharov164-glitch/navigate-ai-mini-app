"""Внутренний API для бота (обработка медиа)."""
import base64
import os
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.services.action_processor import action_processor
from backend.app.services.ai_service import ai_service
from backend.app.services.user_service import user_service

router = APIRouter(prefix="/internal/bot", tags=["bot-internal"])
settings = get_settings()


def _verify_bot_secret(x_bot_secret: str | None = Header(None, alias="X-Bot-Secret")) -> None:
    if settings.webhook_secret and x_bot_secret != settings.webhook_secret:
        raise HTTPException(403, "Forbidden")


class BotUserEnsure(BaseModel):
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


@router.post("/ensure-user")
async def ensure_user(body: BotUserEnsure, db: AsyncSession = Depends(get_db), _: None = Depends(_verify_bot_secret)):
    user = await user_service.get_or_create(
        db, body.telegram_id, username=body.username, first_name=body.first_name, last_name=body.last_name
    )
    if not user.onboarding_completed:
        user.onboarding_completed = True
    return {
        "user_id": user.id,
        "referral_code": user.referral_code,
        "is_premium": user_service.is_premium(user),
        "daily_left": max(0, settings.free_daily_actions - user.daily_actions_count),
    }


@router.post("/process")
async def process_message(
    telegram_id: int = Form(...),
    input_type: str = Form("text"),
    text: str | None = Form(None),
    template: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    referral_code: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_bot_secret),
):
    user = await user_service.get_or_create(db, telegram_id)
    if referral_code:
        await user_service.apply_referral(db, user, referral_code)

    if not await user_service.check_daily_limit(db, user):
        raise HTTPException(429, "Дневной лимит исчерпан. Откройте Mini App для премиум.")

    voice_transcript = None
    photo_description = None
    photo_base64 = None
    receipt_path = None

    if file and input_type == "voice":
        content = await file.read()
        voice_transcript = await ai_service.transcribe_voice(content, file.filename or "voice.ogg")
    elif file and input_type == "photo":
        content = await file.read()
        photo_description = await ai_service.describe_photo(content)
        photo_base64 = base64.b64encode(content).decode()
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        fname = f"{user.id}_{file.filename or 'photo.jpg'}"
        receipt_path = str(Path(settings.upload_dir) / fname)
        async with aiofiles.open(receipt_path, "wb") as f:
            await f.write(content)

    if input_type == "location" and latitude and longitude:
        text = (text or "") + f" Геопозиция: {latitude}, {longitude}"

    result = await action_processor.process_message(
        db,
        user,
        text=text,
        voice_transcript=voice_transcript,
        photo_description=photo_description,
        photo_base64=photo_base64,
        latitude=latitude,
        longitude=longitude,
        template=template,
        input_type=input_type,
        receipt_path=receipt_path,
    )
    return {
        "summary": result.summary,
        "tasks_count": len(result.tasks),
        "expenses_count": len(result.expenses),
        "routes_count": len(result.routes),
        "reminders_count": len(result.reminders),
        "insights": result.smart_insights,
        "saved_minutes": user.saved_minutes_today,
        "saved_rub": user.saved_rub_today,
    }
