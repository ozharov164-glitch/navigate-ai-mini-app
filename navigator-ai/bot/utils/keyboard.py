"""Клавиатуры: Web App только при HTTPS (Telegram не принимает localhost)."""
from aiogram.types import InlineKeyboardButton, WebAppInfo

from bot.config import settings


def _mini_app_url(path: str = "") -> str | None:
    base = (settings.mini_app_url or "").rstrip("/")
    if not base.startswith("https://"):
        return None
    if not path:
        return base
    if path.startswith("?"):
        return f"{base}{path}"
    return f"{base}/{path.lstrip('/')}"


def mini_app_button(text: str, path: str = "") -> InlineKeyboardButton | None:
    url = _mini_app_url(path)
    if not url:
        return None
    return InlineKeyboardButton(text=text, web_app=WebAppInfo(url=url))
