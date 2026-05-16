"""Интеграция с OpenRouter / DeepSeek."""
import hashlib
import json
import logging
import re
from typing import Any

import httpx

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set
from backend.app.schemas.ai import AIAnalysisResponse

settings = get_settings()
logger = logging.getLogger(__name__)

# Модели OpenRouter (можно переопределить в .env)
TRANSCRIBE_MODEL = "google/gemini-2.5-flash"
VISION_MODEL = "google/gemini-2.5-flash"


def _openrouter_headers() -> dict[str, str]:
    """HTTP-заголовки только в ASCII (httpx не принимает кириллицу в X-Title)."""
    referer = settings.mini_app_url or "https://github.com"
    if not referer.isascii():
        referer = "https://navigai.app"
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": referer,
        "X-Title": "NavigAI",
        "Content-Type": "application/json",
    }


def _cache_key(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return f"ai:{hashlib.sha256(raw.encode()).hexdigest()}"


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        text = match.group(0)
    return json.loads(text)


def _safe_analysis(parsed: dict[str, Any], fallback_summary: str = "") -> AIAnalysisResponse:
    try:
        return AIAnalysisResponse.model_validate(parsed)
    except Exception as exc:
        logger.warning("AI JSON validation failed: %s", exc)
        return AIAnalysisResponse(
            summary=parsed.get("summary") or fallback_summary or "Сообщение обработано",
            smart_insights=parsed.get("smart_insights") or [],
        )


class AIService:
    async def _chat_completion(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
        timeout: float = 90.0,
    ) -> str:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY не настроен на сервере")

        body: dict[str, Any] = {
            "model": model or settings.ai_model,
            "messages": messages,
            "max_tokens": max_tokens or settings.ai_max_tokens,
            "temperature": 0.3,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
                headers=_openrouter_headers(),
                json=body,
            )
            if resp.status_code != 200:
                logger.error("OpenRouter error %s: %s", resp.status_code, resp.text[:500])
                raise RuntimeError(f"AI-сервис недоступен (код {resp.status_code})")
            data = resp.json()

        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("Пустой ответ от AI")
        return (choices[0].get("message") or {}).get("content") or ""

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

        cache_payload = {"msg": user_message, "tpl": template, "has_img": bool(photo_base64)}
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
            model = VISION_MODEL
        else:
            messages.append({"role": "user", "content": user_message})
            model = settings.ai_model

        content = await self._chat_completion(
            messages, model=model, json_mode=True, timeout=120.0 if is_premium else 90.0
        )
        parsed = _extract_json(content)
        result = _safe_analysis(parsed, fallback_summary=content[:300])

        ttl = settings.ai_cache_ttl if not is_premium else max(settings.ai_cache_ttl // 2, 300)
        await cache_set(cache_key, result.model_dump(mode="json"), ttl=ttl)
        return result

    async def transcribe_voice(self, audio_bytes: bytes, filename: str = "voice.ogg") -> str:
        if not settings.openrouter_api_key:
            return "Голосовое сообщение (нет API-ключа)"

        import base64

        b64 = base64.b64encode(audio_bytes).decode()
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "ogg"
        fmt = {"ogg": "ogg", "webm": "webm", "mp3": "mpeg", "mpeg": "mpeg", "wav": "wav", "m4a": "mpeg"}.get(ext, "ogg")

        messages = [
            {
                "role": "system",
                "content": "Транскрибируй голосовое сообщение на русском языке. Верни только текст речи без пояснений.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Транскрибируй это голосовое сообщение."},
                    {
                        "type": "input_audio",
                        "input_audio": {"data": b64, "format": fmt},
                    },
                ],
            },
        ]

        try:
            text = await self._chat_completion(
                messages, model=TRANSCRIBE_MODEL, max_tokens=1024, timeout=60.0
            )
            if text.strip():
                return text.strip()
        except Exception as exc:
            logger.warning("Voice transcribe via audio failed: %s", exc)

        # Fallback: текстовая модель без аудио — хотя бы не падаем
        try:
            return await self._chat_completion(
                [
                    {
                        "role": "user",
                        "content": (
                            "Пользователь отправил голосовое в Telegram. "
                            "Верни одну фразу-заглушку для ассистента: "
                            "'Голосовое сообщение (не удалось распознать аудио)'"
                        ),
                    }
                ],
                max_tokens=64,
                timeout=30.0,
            )
        except Exception:
            return "Голосовое сообщение от пользователя"

    async def describe_photo(self, image_bytes: bytes) -> str:
        import base64

        b64 = base64.b64encode(image_bytes).decode()
        messages = [
            {
                "role": "system",
                "content": (
                    "Опиши фото для личного ассистента: чек, билет, документ, полис. "
                    "На русском, структурированно: суммы, даты, названия."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Опиши содержимое изображения для дальнейшего разбора."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            },
        ]
        return await self._chat_completion(messages, model=VISION_MODEL, max_tokens=1500, timeout=60.0)


ai_service = AIService()
