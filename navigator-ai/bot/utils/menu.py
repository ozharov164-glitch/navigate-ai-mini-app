"""Menu Button Mini App — синяя кнопка слева от поля ввода."""
import logging

from aiogram import Bot
from aiogram.types import MenuButtonWebApp, WebAppInfo

from bot.config import settings

logger = logging.getLogger(__name__)


async def setup_menu_button(bot: Bot) -> None:
    url = (settings.mini_app_url or "").rstrip("/")
    if not url.startswith("https://"):
        logger.warning("MINI_APP_URL без HTTPS — Menu Button не установлен")
        return
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="НавигаторAI", web_app=WebAppInfo(url=f"{url}/")),
        )
        logger.info("Menu Button установлен: %s", url)
    except Exception:
        logger.exception("Не удалось установить Menu Button")
