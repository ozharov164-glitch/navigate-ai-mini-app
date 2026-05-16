"""Платежи: Stars и YooKassa."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.services.payment_service import payment_service
from backend.app.services.user_service import user_service

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger(__name__)


class PaymentTierRequest(BaseModel):
    tier: str  # basic | premium


class ConfirmPaymentRequest(BaseModel):
    tier: str
    payment_id: str  # ID платежа YooKassa


@router.post("/stars-invoice")
async def stars_invoice(body: PaymentTierRequest, user: User = Depends(get_current_user)):
    if body.tier not in ("basic", "premium"):
        raise HTTPException(400, "tier: basic или premium")
    return payment_service.stars_invoice_payload(body.tier, user.id)


@router.post("/yookassa")
async def yookassa_create(body: PaymentTierRequest, user: User = Depends(get_current_user)):
    data = await payment_service.create_yookassa_payment(body.tier, user.id)
    if not data:
        raise HTTPException(503, "YooKassa не настроена")
    return data


@router.post("/confirm")
async def confirm_payment(
    body: ConfirmPaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Подтверждение оплаты YooKassa — только после проверки статуса в API YooKassa."""
    if body.tier not in ("basic", "premium"):
        raise HTTPException(400, "tier: basic или premium")

    verified = await payment_service.verify_yookassa_payment(body.payment_id, user.id, body.tier)
    if not verified:
        raise HTTPException(402, "Платёж не подтверждён. Дождитесь завершения оплаты.")

    tier_value = payment_service.subscription_tier_value(body.tier)
    await user_service.extend_premium(user, days=30, tier=tier_value)
    logger.info("YooKassa premium activated user_id=%s payment=%s", user.id, body.payment_id)
    return {"ok": True, "premium_until": user.premium_until.isoformat() if user.premium_until else None}


@router.post("/yookassa-webhook")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook YooKassa: автоматическая активация премиум при payment.succeeded."""
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    parsed = payment_service.tier_from_yookassa_event(event)
    if not parsed:
        return {"ok": True, "skipped": True}

    user_id, tier = parsed
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("YooKassa webhook: user %s not found", user_id)
        return {"ok": True}

    tier_value = payment_service.subscription_tier_value(tier)
    await user_service.extend_premium(user, days=30, tier=tier_value)
    logger.info("YooKassa webhook premium user_id=%s tier=%s", user_id, tier)
    return {"ok": True}
