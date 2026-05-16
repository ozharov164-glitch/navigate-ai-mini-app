"""Telegram Stars и YooKassa."""
import uuid
from typing import Any

import httpx

from backend.app.core.config import get_settings

settings = get_settings()


class PaymentService:
  def stars_invoice_payload(self, tier: str, user_id: int) -> dict[str, Any]:
      price = settings.stars_basic_price if tier == "basic" else settings.stars_premium_price
      return {
          "title": f"НавигаторAI {tier.upper()}",
          "description": "Премиум: безлимит, PDF, insights, приоритет AI",
          "payload": f"stars_{tier}_{user_id}_{uuid.uuid4().hex[:8]}",
          "currency": "XTR",
          "prices": [{"label": "Подписка", "amount": price}],
      }

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


payment_service = PaymentService()
