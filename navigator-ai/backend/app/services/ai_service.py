"""Интеграция с OpenRouter / DeepSeek (с режимом экономии баланса)."""
import base64
import hashlib
import json
import logging
import re
from typing import Any

import httpx
from pydantic import ValidationError

from backend.app.core.config import get_settings
from backend.app.core.redis_client import cache_get, cache_set
from backend.app.schemas.ai import AIAnalysisResponse

settings = get_settings()
logger = logging.getLogger(__name__)

# Дешёвые модели первыми; в budget_mode — только первая
TRANSCRIBE_MODELS_FULL = (
    "google/gemini-2.5-flash",
    "openai/gpt-4o-mini",
)
TRANSCRIBE_MODELS_BUDGET = ("google/gemini-2.5-flash",)
VISION_MODELS_FULL = (
    "google/gemini-2.5-flash",
    "openai/gpt-4o-mini",
)
VISION_MODELS_BUDGET = ("google/gemini-2.5-flash",)


def _openrouter_headers() -> dict[str, str]:
    referer = settings.mini_app_url or "https://github.com"
    if not referer.isascii():
        referer = "https://navigai.app"
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": referer,
        "X-Title": "NavigAI",
        "Content-Type": "application/json",
    }


def _cache_key(prefix: str, payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return f"{prefix}:{hashlib.sha256(raw.encode()).hexdigest()}"


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
    except ValidationError as exc:
        logger.warning("AI JSON validation failed: %s", exc)
        return AIAnalysisResponse(
            summary=parsed.get("summary") or fallback_summary or "Сообщение обработано",
            smart_insights=parsed.get("smart_insights") or [],
        )


def _transcribe_models() -> tuple[str, ...]:
    if settings.ai_budget_mode:
        return TRANSCRIBE_MODELS_BUDGET
    return TRANSCRIBE_MODELS_FULL


def _vision_models() -> tuple[str, ...]:
    if settings.ai_budget_mode:
        return VISION_MODELS_BUDGET
    return VISION_MODELS_FULL


def _json_retries(is_premium: bool) -> int:
    # В budget mode — одна попытка для всех (меньше расхода OpenRouter)
    if settings.ai_budget_mode:
        return 1
    return settings.ai_json_retries_premium if is_premium else settings.ai_json_retries


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

        usage = data.get("usage") or {}
        if usage:
            logger.info(
                "OpenRouter model=%s prompt_tokens=%s completion_tokens=%s",
                model or settings.ai_model,
                usage.get("prompt_tokens"),
                usage.get("completion_tokens"),
            )

        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("Пустой ответ от AI")
        return (choices[0].get("message") or {}).get("content") or ""

    async def _chat_with_models(
        self,
        messages: list[dict[str, Any]],
        models: tuple[str, ...],
        **kwargs: Any,
    ) -> str:
        last_exc: Exception | None = None
        for model in models:
            try:
                return await self._chat_completion(messages, model=model, **kwargs)
            except Exception as exc:
                last_exc = exc
                logger.warning("Model %s failed: %s", model, exc)
        raise RuntimeError(f"Все модели недоступны: {last_exc}")

    async def _parse_analysis_with_retry(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        is_premium: bool,
    ) -> AIAnalysisResponse:
        """Парсинг JSON с Pydantic; число retry ограничено для экономии."""
        last_error = ""
        msgs = list(messages)
        max_attempts = _json_retries(is_premium)

        for attempt in range(max_attempts):
            content = await self._chat_completion(
                msgs,
                model=model,
                json_mode=True,
                max_tokens=settings.ai_max_tokens,
                timeout=120.0 if is_premium else 90.0,
            )
            try:
                parsed = _extract_json(content)
                result = AIAnalysisResponse.model_validate(parsed)
                if result.summary or result.tasks or result.expenses or result.routes:
                    return result
                last_error = "Пустой результат"
            except (json.JSONDecodeError, ValidationError) as exc:
                last_error = str(exc)
                logger.warning("JSON parse attempt %s/%s failed: %s", attempt + 1, max_attempts, exc)

            if attempt < max_attempts - 1:
                msgs = msgs + [
                    {"role": "assistant", "content": content[:2000] if content else "{}"},
                    {
                        "role": "user",
                        "content": (
                            "Ответ невалиден. Верни ТОЛЬКО JSON по схеме из system prompt. "
                            f"Ошибка: {last_error}"
                        ),
                    },
                ]

        return _safe_analysis({}, fallback_summary="Не удалось разобрать ответ AI")

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
        db_context: str | None = None,
        is_premium: bool = False,
    ) -> AIAnalysisResponse:
        # Уже есть текстовое описание фото — не шлём картинку повторно (экономия ~50% на фото)
        if photo_description:
            photo_base64 = None

        user_content_parts: list[str] = []
        if template == "receipt":
            user_content_parts.append("Шаблон: разобрать чек. Извлеки все позиции и суммы.")
        elif template == "day_plan":
            user_content_parts.append("Шаблон: планирование дня. Составь оптимальный план на основе контекста.")
        elif template == "week_analysis":
            user_content_parts.append("Шаблон: анализ недели. Дай сводку и рекомендации по реальным данным.")

        if db_context:
            user_content_parts.append(f"Контекст из базы данных:\n{db_context}")

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
        cache_key = _cache_key("ai", cache_payload)
        if cached := await cache_get(cache_key):
            logger.info("AI cache hit template=%s", template)
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
            model = _vision_models()[0]
        else:
            messages.append({"role": "user", "content": user_message})
            model = settings.ai_model

        result = await self._parse_analysis_with_retry(messages, model=model, is_premium=is_premium)

        ttl = settings.ai_cache_ttl if not is_premium else max(settings.ai_cache_ttl, 1800)
        await cache_set(cache_key, result.model_dump(mode="json"), ttl=ttl)
        return result

    async def transcribe_voice(self, audio_bytes: bytes, filename: str = "voice.ogg") -> str:
        asr_key = _cache_key("asr", {"h": hashlib.sha256(audio_bytes).hexdigest()})
        if cached := await cache_get(asr_key):
            if isinstance(cached, str):
                return cached
            if isinstance(cached, dict) and cached.get("text"):
                return str(cached["text"])

        # Локальный Whisper на VPS — без расхода OpenRouter
        from backend.app.services.whisper_service import whisper_service

        if local := await whisper_service.transcribe(audio_bytes, filename):
            await cache_set(asr_key, local, ttl=settings.ai_cache_ttl)
            return local

        if not settings.openrouter_api_key:
            return "Голосовое сообщение (нет API-ключа)"

        b64 = base64.b64encode(audio_bytes).decode()
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "ogg"
        fmt = {"ogg": "ogg", "webm": "webm", "mp3": "mpeg", "mpeg": "mpeg", "wav": "wav", "m4a": "mpeg"}.get(ext, "ogg")

        audio_messages = [
            {
                "role": "system",
                "content": "Транскрибируй голосовое на русском. Верни только текст речи.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Транскрибируй голосовое сообщение."},
                    {"type": "input_audio", "input_audio": {"data": b64, "format": fmt}},
                ],
            },
        ]

        for model in _transcribe_models():
            try:
                text = await self._chat_completion(
                    audio_messages,
                    model=model,
                    max_tokens=settings.ai_transcribe_max_tokens,
                    timeout=60.0,
                )
                if text.strip() and "не удалось" not in text.lower():
                    await cache_set(asr_key, text, ttl=settings.ai_cache_ttl)
                    return text.strip()
            except Exception as exc:
                logger.warning("Transcribe %s failed: %s", model, exc)

        return "Голосовое сообщение от пользователя"

    async def describe_photo(self, image_bytes: bytes) -> str:
        img_hash = hashlib.sha256(image_bytes).hexdigest()
        vis_key = _cache_key("vis", {"h": img_hash})
        if cached := await cache_get(vis_key):
            if isinstance(cached, str):
                return cached

        b64 = base64.b64encode(image_bytes).decode()
        messages = [
            {
                "role": "system",
                "content": (
                    "Опиши фото кратко для ассистента: чек, билет, документ. "
                    "На русском: суммы, даты, названия. Без лишнего текста."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Опиши содержимое изображения."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            },
        ]
        try:
            text = await self._chat_with_models(
                messages,
                _vision_models(),
                max_tokens=settings.ai_vision_max_tokens,
                timeout=60.0,
            )
            await cache_set(vis_key, text, ttl=settings.ai_cache_ttl)
            return text
        except Exception as exc:
            logger.error("Vision failed: %s", exc)
            return "Изображение (не удалось описать)"


ai_service = AIService()
