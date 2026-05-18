"""Команды бота."""
from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

from bot.config import settings
from bot.handlers.owner_test import owner_test_button_row
from bot.services.api_client import api_client
from bot.utils.keyboard import mini_app_button

router = Router()

FREE_LIMIT = settings.free_daily_actions
PREMIUM_LIMIT = settings.premium_daily_actions


@router.message(Command("start"))
async def cmd_start(message: Message, command: CommandObject) -> None:
    """Рефералка только в Mini App — здесь лишь тихое применение ref_ из deep link."""
    referral = None
    if command.args and command.args.startswith("ref_"):
        referral = command.args.replace("ref_", "")

    info = await api_client.ensure_user(
        message.from_user.id,
        username=message.from_user.username,
        first_name=message.from_user.first_name,
        last_name=message.from_user.last_name,
        referral_code=referral,
    )

    rows: list[list[InlineKeyboardButton]] = []
    if btn := mini_app_button("📱 Открыть дашборд"):
        rows.append([btn])

    if message.from_user and message.from_user.id == settings.bot_owner_telegram_id:
        if test_row := owner_test_button_row():
            rows.append(test_row)

    bonus_note = ""
    if referral and info.get("referral_applied"):
        bonus_note = "\n\n🎁 Реферальный бонус активирован — откройте приложение."

    await message.answer(
        f"👋 <b>НавигаторAI</b>\n"
        f"<i>Тихий AI-оператор вашего дня</i>\n\n"
        f"Отправьте <b>текст</b>, <b>голосовое</b> или <b>фото чека</b> — "
        f"я разложу на задачи, расходы и напоминания.{bonus_note}",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    rows: list[list[InlineKeyboardButton]] = []
    if btn := mini_app_button("📱 Открыть Mini App"):
        rows.append([btn])
    await message.answer(
        "<b>Как пользоваться</b>\n\n"
        "💬 <b>Текст</b> — «завтра стоматолог 5000₽ и купить молоко»\n"
        "🎤 <b>Голос</b> — то же голосом (Premium)\n"
        "📷 <b>Фото</b> — чек или документ (Premium)\n\n"
        f"Free: {FREE_LIMIT} AI/день · Premium: до {PREMIUM_LIMIT} AI/день\n\n"
        "/premium — подписка · /privacy — данные",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )


@router.message(Command("premium"))
async def cmd_premium(message: Message) -> None:
    rows = [
        [InlineKeyboardButton(text="⭐ Basic 199 Stars", callback_data="pay_stars_basic")],
        [InlineKeyboardButton(text="⭐ Premium 399 Stars", callback_data="pay_stars_premium")],
    ]
    if btn := mini_app_button("📱 Оформить в Mini App", "?page=premium"):
        rows.append([btn])
    kb = InlineKeyboardMarkup(inline_keyboard=rows)
    await message.answer(
        "<b>Premium НавигаторAI</b>\n\n"
        f"• До {PREMIUM_LIMIT} AI-действий в день\n"
        "• Голос и фото\n"
        "• PDF-отчёты\n\n"
        f"<i>Free: {FREE_LIMIT} AI/день</i>",
        reply_markup=kb,
        parse_mode="HTML",
    )


@router.message(Command("privacy"))
async def cmd_privacy(message: Message) -> None:
    rows: list[list[InlineKeyboardButton]] = []
    if btn := mini_app_button("🔒 Приватность в Mini App", "?page=privacy"):
        rows.append([btn])
    await message.answer(
        "🔐 <b>Приватность</b>\n\n"
        "• Данные на вашем VPS\n"
        "• Удаление — в Mini App → Настройки",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )
