"""Telegram Stars и YooKassa."""
import logging
import uuid
from typing import Any

import httpx

from backend.app.core.config import get_settings
from backend.app.models.user import SubscriptionTier

settings = get_settings()
logger = logging.getLogger(__name__)


class PaymentService:
    def stars_invoice_payload(self, tier: str, telegram_id: int) -> dict[str, Any]:
        """payload использует telegram_id — как в bot/handlers/payments.py."""
        price = settings.stars_basic_price if tier == "basic" else settings.stars_premium_price
        return {
            "title": f"НавигаторAI {tier.upper()}",
            "description": "Premium: до 50 AI/день, голос, фото, PDF",
            "payload": f"stars_{tier}_{telegram_id}",
            "currency": "XTR",
            "prices": [{"label": "Подписка", "amount": price}],
        }

    async def create_stars_invoice_link(self, tier: str, telegram_id: int) -> str | None:
        """Создаёт ссылку на invoice для Telegram.WebApp.openInvoice."""
        if not settings.bot_token:
            return None
        payload = self.stars_invoice_payload(tier, telegram_id)
        body = {
            "title": payload["title"],
            "description": payload["description"],
            "payload": payload["payload"],
            "currency": payload["currency"],
            "prices": payload["prices"],
        }
        url = f"https://api.telegram.org/bot{settings.bot_token}/createInvoiceLink"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=body)
            data = resp.json()
            if data.get("ok") and data.get("result"):
                return str(data["result"])
            logger.warning("createInvoiceLink failed: %s", data.get("description"))
        return None

    async def create_yookassa_payment(self, tier: str, user_id: int) -> dict[str, Any] | None:
        if not settings.yookassa_shop_id or not settings.yookassa_secret_key:
            return None

        amount = settings.yookassa_basic_price_rub if tier == "basic" else settings.yookassa_premium_price_rub
        idempotence = str(uuid.uuid4())
        body = {
            "amount": {"value": f"{amount:.2f}", "currency": "RUB"},
            "confirmation": {"type": "redirect", "return_url": settings.yookassa_return_url},
            "capture": True,
            "description": f"НавигаторAI подписка {tier}",
            "metadata": {"user_id": str(user_id), "tier": tier},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.yookassa.ru/v3/payments",
                json=body,
                auth=(settings.yookassa_shop_id, settings.yookassa_secret_key),
                headers={"Idempotence-Key": idempotence, "Content-Type": "application/json"},
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return {
                    "payment_id": data["id"],
                    "confirmation_url": data["confirmation"]["confirmation_url"],
                    "status": data["status"],
                }
        return None

    async def fetch_yookassa_payment(self, payment_id: str) -> dict[str, Any] | None:
        if not settings.yookassa_shop_id or not settings.yookassa_secret_key:
            return None
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"https://api.yookassa.ru/v3/payments/{payment_id}",
                auth=(settings.yookassa_shop_id, settings.yookassa_secret_key),
            )
            if resp.status_code == 200:
                return resp.json()
        return None

    async def verify_yookassa_payment(self, payment_id: str, user_id: int, expected_tier: str) -> bool:
        """Проверяет, что платёж YooKassa успешен и принадлежит пользователю."""
        data = await self.fetch_yookassa_payment(payment_id)
        if not data:
            return False
        if data.get("status") != "succeeded":
            return False
        meta = data.get("metadata") or {}
        if str(meta.get("user_id")) != str(user_id):
            logger.warning("YooKassa payment %s user mismatch", payment_id)
            return False
        if meta.get("tier") != expected_tier:
            logger.warning("YooKassa payment %s tier mismatch", payment_id)
            return False
        return True

    def tier_from_yookassa_event(self, event: dict[str, Any]) -> tuple[int, str] | None:
        """Извлекает user_id и tier из webhook-события YooKassa."""
        obj = event.get("object") or {}
        event_name = event.get("event", "")
        if event_name != "payment.succeeded" and obj.get("status") != "succeeded":
            return None
        meta = obj.get("metadata") or {}
        user_id = meta.get("user_id")
        tier = meta.get("tier")
        if not user_id or tier not in ("basic", "premium"):
            return None
        return int(user_id), tier

    def subscription_tier_value(self, tier: str) -> str:
        return SubscriptionTier.BASIC.value if tier == "basic" else SubscriptionTier.PREMIUM.value


payment_service = PaymentService()
