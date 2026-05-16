"""Интеграция с OpenRouter / DeepSeek V3.2."""
import hashlib
import json
import re
from typing import Any

import httpx

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set
from backend.app.schemas.ai import AIAnalysisResponse

settings = get_settings()


def _cache_key(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return f"ai:{hashlib.sha256(raw.encode()).hexdigest()}"


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


class AIService:
  async def analyze(
      self,
      *,
      text: str | None = None,
      voice_transcript: str | None = None,
      photo_description: str | None = None,
      photo_base64: str | None = None,
      latitude: float | None = None,
      longitude: float | None = None,
      user_places: list[dict[str, Any]] | None = None,
      template: str | None = None,
      is_premium: bool = False,
  ) -> AIAnalysisResponse:
      """Один запрос к DeepSeek — структурированный JSON."""
      user_content_parts: list[str] = []
      if template == "receipt":
          user_content_parts.append("Шаблон: разобрать чек. Извлеки все позиции и суммы.")
      elif template == "day_plan":
          user_content_parts.append("Шаблон: планирование дня. Составь оптимальный план.")
      elif template == "week_analysis":
          user_content_parts.append("Шаблон: анализ недели. Дай сводку и рекомендации.")

      if voice_transcript:
          user_content_parts.append(f"Голос (транскрипт): {voice_transcript}")
      if photo_description:
          user_content_parts.append(f"Описание фото: {photo_description}")
      if text:
          user_content_parts.append(f"Текст: {text}")
      if latitude is not None and longitude is not None:
          user_content_parts.append(f"Геопозиция: {latitude}, {longitude}")
      if user_places:
          user_content_parts.append(f"Мои места: {json.dumps(user_places, ensure_ascii=False)}")

      user_message = "\n".join(user_content_parts) or "Пустое сообщение"

      cache_payload = {
          "msg": user_message,
          "tpl": template,
          "has_img": bool(photo_base64),
      }
      cache_key = _cache_key(cache_payload)
      if cached := await cache_get(cache_key):
          return AIAnalysisResponse.model_validate(cached)

      messages: list[dict[str, Any]] = [
          {"role": "system", "content": settings.ai_system_prompt},
      ]

      if photo_base64:
          messages.append(
              {
                  "role": "user",
                  "content": [
                      {"type": "text", "text": user_message},
                      {
                          "type": "image_url",
                          "image_url": {"url": f"data:image/jpeg;base64,{photo_base64}"},
                      },
                  ],
              }
          )
      else:
          messages.append({"role": "user", "content": user_message})

      headers = {
          "Authorization": f"Bearer {settings.openrouter_api_key}",
          "HTTP-Referer": settings.mini_app_url,
          "X-Title": settings.app_name,
      }
      body = {
          "model": settings.ai_model,
          "messages": messages,
          "max_tokens": settings.ai_max_tokens,
          "response_format": {"type": "json_object"},
      }
      if is_premium:
          body["provider"] = {"order": ["DeepSeek"]}

      async with httpx.AsyncClient(timeout=90.0) as client:
          resp = await client.post(
              f"{settings.openrouter_base_url}/chat/completions",
              headers=headers,
              json=body,
          )
          resp.raise_for_status()
          data = resp.json()

      content = data["choices"][0]["message"]["content"]
      parsed = _extract_json(content)
      result = AIAnalysisResponse.model_validate(parsed)

      ttl = settings.ai_cache_ttl if not is_premium else settings.ai_cache_ttl // 2
      await cache_set(cache_key, result.model_dump(mode="json"), ttl=ttl)
      return result

  async def transcribe_voice(self, audio_bytes: bytes, filename: str = "voice.ogg") -> str:
      """Транскрипция через vision-модель (аудио как файл) или fallback-текст."""
      if not settings.openrouter_api_key:
          return "Голосовое сообщение (транскрипция недоступна — настройте OPENROUTER_API_KEY)"

      import base64

      b64 = base64.b64encode(audio_bytes).decode()
      messages = [
          {
              "role": "system",
              "content": "Ты транскрибируешь голосовые сообщения на русском. Верни только текст без пояснений.",
          },
          {
              "role": "user",
              "content": f"Транскрибируй аудио. Файл: {filename}. Если не можешь — верни краткое описание по контексту.",
          },
      ]
      async with httpx.AsyncClient(timeout=60.0) as client:
          resp = await client.post(
              f"{settings.openrouter_base_url}/chat/completions",
              headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
              json={"model": settings.ai_model, "messages": messages, "max_tokens": 1024},
          )
          if resp.status_code == 200:
              return resp.json()["choices"][0]["message"]["content"].strip()
      return "Голосовое сообщение получено"

  async def describe_photo(self, image_bytes: bytes) -> str:
      import base64

      b64 = base64.b64encode(image_bytes).decode()
      messages = [
          {
              "role": "system",
              "content": "Опиши фото для личного ассистента: чек, билет, документ, полис. На русском, кратко.",
          },
          {
              "role": "user",
              "content": [
                  {"type": "text", "text": "Опиши содержимое изображения."},
                  {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
              ],
          },
      ]
      async with httpx.AsyncClient(timeout=60.0) as client:
          resp = await client.post(
              f"{settings.openrouter_base_url}/chat/completions",
              headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
              json={"model": settings.ai_model, "messages": messages, "max_tokens": 1500},
          )
          resp.raise_for_status()
          return resp.json()["choices"][0]["message"]["content"].strip()


ai_service = AIService()
