"""Точка входа бота — webhook на порту 8081."""
import asyncio
import logging
import os

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from bot.config import settings
from bot.handlers import commands, messages, payments
from bot.middlewares.private_only import PrivateChatOnlyMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _build_dispatcher() -> tuple[Bot, Dispatcher]:
    bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.message.middleware(PrivateChatOnlyMiddleware())
    dp.include_router(commands.router)
    dp.include_router(messages.router)
    dp.include_router(payments.router)
    return bot, dp


async def _run_polling(bot: Bot, dp: Dispatcher) -> None:
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("Локальный режим: long polling (WEBHOOK_URL не задан)")
    await dp.start_polling(bot)


async def _run_webhook(bot: Bot, dp: Dispatcher) -> None:
    app = web.Application()
    webhook_path = "/bot/webhook"
    SimpleRequestHandler(dispatcher=dp, bot=bot, secret_token=settings.webhook_secret or None).register(
        app, path=webhook_path
    )
    setup_application(app, dp, bot=bot)

    await bot.set_webhook(
        url=settings.webhook_url,
        secret_token=settings.webhook_secret or None,
        drop_pending_updates=True,
    )
    logger.info("Webhook установлен: %s", settings.webhook_url)

    port = int(os.getenv("BOT_PORT", "8081"))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info("Бот НавигаторAI слушает :%s%s", port, webhook_path)

    await asyncio.Event().wait()


async def main() -> None:
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN не задан")

    bot, dp = await _build_dispatcher()

    if settings.webhook_url:
        await _run_webhook(bot, dp)
    else:
        await _run_polling(bot, dp)


if __name__ == "__main__":
    asyncio.run(main())
