"""HTTP-клиент к backend API."""
from typing import Any

import httpx

from bot.config import settings


class BotApiClient:
  def __init__(self) -> None:
      self.base = settings.api_base_url.rstrip("/")
      self.headers = {"X-Bot-Secret": settings.webhook_secret or ""}

  async def ensure_user(self, telegram_id: int, **kwargs) -> dict[str, Any]:
      payload = {"telegram_id": telegram_id, **kwargs}
      async with httpx.AsyncClient(timeout=30.0) as client:
          resp = await client.post(
              f"{self.base}/api/internal/bot/ensure-user",
              json=payload,
              headers=self.headers,
          )
          resp.raise_for_status()
          return resp.json()

  async def activate_premium(self, telegram_id: int, tier: str, payment_ref: str | None = None) -> dict[str, Any]:
      async with httpx.AsyncClient(timeout=30.0) as client:
          resp = await client.post(
              f"{self.base}/api/internal/bot/activate-premium",
              json={"telegram_id": telegram_id, "tier": tier, "payment_ref": payment_ref},
              headers=self.headers,
          )
          resp.raise_for_status()
          return resp.json()

  async def process(
      self,
      telegram_id: int,
      input_type: str,
      text: str | None = None,
      file_bytes: bytes | None = None,
      filename: str | None = None,
      latitude: float | None = None,
      longitude: float | None = None,
      template: str | None = None,
      referral_code: str | None = None,
  ) -> dict[str, Any]:
      data: dict[str, Any] = {
          "telegram_id": str(telegram_id),
          "input_type": input_type,
      }
      if text:
          data["text"] = text
      if latitude is not None:
          data["latitude"] = str(latitude)
      if longitude is not None:
          data["longitude"] = str(longitude)
      if template:
          data["template"] = template
      if referral_code:
          data["referral_code"] = referral_code

      files = None
      if file_bytes:
          files = {"file": (filename or "file.bin", file_bytes)}

      async with httpx.AsyncClient(timeout=120.0) as client:
          resp = await client.post(
              f"{self.base}/api/internal/bot/process",
              data=data,
              files=files,
              headers=self.headers,
          )
          if resp.status_code == 429:
              return {"error": "limit", "message": resp.json().get("detail", "Лимит исчерпан")}
          if resp.status_code >= 500:
              detail = "Сервер временно недоступен"
              try:
                  detail = resp.json().get("detail", detail)
              except Exception:
                  pass
              return {"error": "server", "message": str(detail)}
          if resp.status_code >= 400:
              detail = "Ошибка запроса"
              try:
                  detail = resp.json().get("detail", detail)
              except Exception:
                  pass
              return {"error": "client", "message": str(detail)}
          resp.raise_for_status()
          return resp.json()


api_client = BotApiClient()
