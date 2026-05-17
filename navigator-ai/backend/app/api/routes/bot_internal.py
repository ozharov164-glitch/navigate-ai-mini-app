"""Внутренний API для бота (обработка медиа)."""
import base64
import logging
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.uploads import read_upload_limited
from backend.app.models.user import SubscriptionTier
from backend.app.services.action_processor import action_processor
from backend.app.services.ai_service import ai_service
from backend.app.services.owner_test_service import owner_test_service
from backend.app.services.user_service import _is_premium, user_service

router = APIRouter(prefix="/internal/bot", tags=["bot-internal"])
settings = get_settings()
logger = logging.getLogger(__name__)


def _verify_bot_secret(x_bot_secret: str | None = Header(None, alias="X-Bot-Secret")) -> None:
    """Внутренний API бота — всегда требует настроенный WEBHOOK_SECRET."""
    if not settings.webhook_secret:
        raise HTTPException(503, "WEBHOOK_SECRET не настроен на сервере")
    if x_bot_secret != settings.webhook_secret:
        raise HTTPException(403, "Forbidden")


class BotUserEnsure(BaseModel):
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    referral_code: str | None = None


class ActivatePremiumBody(BaseModel):
    telegram_id: int
    tier: str  # basic | premium
    payment_ref: str | None = None


class OwnerTestModeBody(BaseModel):
    telegram_id: int
    mode: str  # premium | free | auto


@router.post("/ensure-user")
async def ensure_user(body: BotUserEnsure, db: AsyncSession = Depends(get_db), _: None = Depends(_verify_bot_secret)):
    user = await user_service.get_or_create(
        db, body.telegram_id, username=body.username, first_name=body.first_name, last_name=body.last_name
    )
    if not user.onboarding_completed:
        user.onboarding_completed = True

    referral_applied = False
    if body.referral_code:
        referral_applied = await user_service.apply_referral(db, user, body.referral_code)

    real_premium = _is_premium(user)
    return {
        "user_id": user.id,
        "referral_code": user.referral_code,
        "is_premium": user_service.is_premium(user),
        "daily_left": user_service.daily_actions_left(user),
        "daily_limit": user_service.daily_limit(user),
        "referral_applied": referral_applied,
        **owner_test_service.status_payload(user, real_premium),
    }


@router.get("/owner-test-mode")
async def get_owner_test_mode(
    telegram_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_bot_secret),
):
    user = await user_service.get_or_create(db, telegram_id)
    if not owner_test_service.is_owner(telegram_id):
        raise HTTPException(403, "Только для владельца бота")
    return owner_test_service.status_payload(user, _is_premium(user))


@router.post("/owner-test-mode")
async def set_owner_test_mode(
    body: OwnerTestModeBody,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_bot_secret),
):
    user = await user_service.get_or_create(db, body.telegram_id)
    if not owner_test_service.is_owner(body.telegram_id):
        raise HTTPException(403, "Только для владельца бота")
    try:
        mode = await owner_test_service.set_mode(db, user, body.mode)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    await db.commit()
    logger.info("Owner test mode telegram_id=%s mode=%s", body.telegram_id, mode)
    return owner_test_service.status_payload(user, _is_premium(user))


@router.post("/activate-premium")
async def activate_premium(
    body: ActivatePremiumBody,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_bot_secret),
):
    """Активация премиум после успешной оплаты Stars (вызывается только ботом)."""
    if body.tier not in ("basic", "premium"):
        raise HTTPException(400, "tier: basic или premium")

    user = await user_service.get_or_create(db, body.telegram_id)
    sub_tier = SubscriptionTier.BASIC.value if body.tier == "basic" else SubscriptionTier.PREMIUM.value
    await user_service.extend_premium(user, days=30, tier=sub_tier)
    logger.info("Premium activated for telegram_id=%s tier=%s ref=%s", body.telegram_id, body.tier, body.payment_ref)
    return {
        "ok": True,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        "tier": user.tier,
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
        raise HTTPException(429, user_service.limit_message(user))

    if input_type in ("voice", "photo") and not user_service.can_use_multimedia(user):
        raise HTTPException(403, user_service.multimedia_denied_message())

    voice_transcript = None
    photo_description = None
    photo_base64 = None
    receipt_path = None

    if file and input_type == "voice":
        content, fname = await read_upload_limited(file, kind="audio")
        voice_transcript = await ai_service.transcribe_voice(content, fname)
    elif file and input_type == "photo":
        content, fname = await read_upload_limited(file, kind="image")
        photo_description = await ai_service.describe_photo(content)
        photo_base64 = base64.b64encode(content).decode()
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        fname = f"{user.id}_{fname}"
        receipt_path = str(Path(settings.upload_dir) / fname)
        async with aiofiles.open(receipt_path, "wb") as f:
            await f.write(content)

    try:
        result = await action_processor.process_message(
            db,
            user,
            text=text,
            voice_transcript=voice_transcript,
            photo_description=photo_description,
            photo_base64=photo_base64,
            template=template,
            input_type=input_type,
            receipt_path=receipt_path,
        )
    except RuntimeError as exc:
        logger.exception("AI process failed for user %s", telegram_id)
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        logger.exception("Process failed for user %s", telegram_id)
        raise HTTPException(500, "Ошибка обработки сообщения. Попробуйте позже.") from exc

    return {
        "summary": result.summary,
        "tasks_count": len(result.tasks),
        "expenses_count": len(result.expenses),
        "reminders_count": len(result.reminders),
        "insights": result.smart_insights,
        "saved_minutes": user.saved_minutes_today,
        "saved_rub": user.saved_rub_today,
    }
