"""Переключатель Premium/Free для владельца бота (тестирование)."""
import logging

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from bot.config import settings
from bot.services.api_client import api_client

router = Router()
logger = logging.getLogger(__name__)


def _is_owner(telegram_id: int) -> bool:
    return telegram_id == settings.bot_owner_telegram_id


def _test_keyboard(current: str) -> InlineKeyboardMarkup:
    def mark(mode: str, label: str) -> str:
        return f"{label} ✓" if current == mode else label

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=mark("premium", "⭐ Premium"), callback_data="owner_test_premium"),
                InlineKeyboardButton(text=mark("free", "🆓 Free"), callback_data="owner_test_free"),
            ],
            [InlineKeyboardButton(text=mark("auto", "↩️ По подписке"), callback_data="owner_test_auto")],
        ]
    )


def _format_status(data: dict) -> str:
    mode = data.get("test_mode", "auto")
    effective = data.get("effective_premium", False)
    real = data.get("real_premium", False)
    mode_labels = {"premium": "⭐ Premium (тест)", "free": "🆓 Free (тест)", "auto": "↩️ По подписке"}
    eff = "✅ Premium" if effective else "🆓 Free"
    real_s = "✅ есть подписка" if real else "нет подписки"
    return (
        "<b>🛠 Режим тестирования</b>\n\n"
        f"Переключатель: <b>{mode_labels.get(mode, mode)}</b>\n"
        f"Сейчас в боте и Mini App: <b>{eff}</b>\n"
        f"Реальная подписка в БД: {real_s}\n"
        f"Лимит AI сегодня: {data.get('daily_limit', '—')}\n\n"
        "<i>Выберите режим кнопкой ниже. «По подписке» — обычная логика оплаты.</i>"
    )


async def _send_panel(message: Message, telegram_id: int) -> None:
    try:
        data = await api_client.get_owner_test_mode(telegram_id)
    except Exception:
        logger.exception("get_owner_test_mode failed")
        await message.answer("Не удалось загрузить режим. Проверьте API.")
        return
    await message.answer(
        _format_status(data),
        reply_markup=_test_keyboard(data.get("test_mode", "auto")),
        parse_mode="HTML",
    )


@router.message(Command("testmode", "test"))
async def cmd_testmode(message: Message) -> None:
    if not _is_owner(message.from_user.id):
        await message.answer("Команда только для владельца бота.")
        return
    await _send_panel(message, message.from_user.id)


@router.callback_query(F.data == "owner_test_panel")
async def owner_test_panel(callback: CallbackQuery) -> None:
    if not callback.from_user or not _is_owner(callback.from_user.id):
        await callback.answer("Недоступно", show_alert=True)
        return
    await callback.answer()
    if callback.message:
        await _send_panel(callback.message, callback.from_user.id)


@router.callback_query(F.data.in_({"owner_test_premium", "owner_test_free", "owner_test_auto"}))
async def owner_test_callback(callback: CallbackQuery) -> None:
    if not callback.from_user or not _is_owner(callback.from_user.id):
        await callback.answer("Недоступно", show_alert=True)
        return

    mode = callback.data.replace("owner_test_", "", 1)
    if mode not in ("premium", "free", "auto"):
        await callback.answer("Неизвестный режим")
        return

    try:
        data = await api_client.set_owner_test_mode(callback.from_user.id, mode)
    except Exception:
        logger.exception("set_owner_test_mode failed")
        await callback.answer("Ошибка API", show_alert=True)
        return

    await callback.answer(f"Режим: {mode}")
    if callback.message:
        await callback.message.edit_text(
            _format_status(data),
            reply_markup=_test_keyboard(data.get("test_mode", mode)),
            parse_mode="HTML",
        )


def owner_test_button_row() -> list[InlineKeyboardButton] | None:
    """Кнопка для /start (только если вызывающий — владелец; проверка снаружи)."""
    return [InlineKeyboardButton(text="🛠 Тест: Premium / Free", callback_data="owner_test_panel")]
