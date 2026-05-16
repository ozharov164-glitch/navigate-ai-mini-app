"""Платежи: Stars и YooKassa."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.user import SubscriptionTier, User
from backend.app.services.payment_service import payment_service
from backend.app.services.user_service import user_service

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentTierRequest(BaseModel):
    tier: str  # basic | premium


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
    body: PaymentTierRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Webhook/callback подтверждение (упрощённо для self-hosted)."""
    tier = SubscriptionTier.BASIC.value if body.tier == "basic" else SubscriptionTier.PREMIUM.value
    await user_service.extend_premium(user, days=30, tier=tier)
    return {"ok": True, "premium_until": user.premium_until.isoformat() if user.premium_until else None}
