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


def _referral_link(code: str) -> str:
    username = settings.bot_username or "NavigAI_bot"
    return f"https://t.me/{username}?start=ref_{code}"


@router.message(Command("start"))
async def cmd_start(message: Message, command: CommandObject) -> None:
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

    code = info.get("referral_code", "")
    if code:
        rows.append(
            [InlineKeyboardButton(text="🎁 Пригласить друга", url=_referral_link(code))]
        )

    if message.from_user and message.from_user.id == settings.bot_owner_telegram_id:
        if test_row := owner_test_button_row():
            rows.append(test_row)

    ref_text = ""
    if referral:
        if info.get("referral_applied"):
            ref_text = (
                "\n\n🎁 <b>Реферальный бонус</b>\n"
                f"Вам +{settings.referral_referred_bonus_days} дн. Premium · "
                f"другу +{settings.referral_bonus_days} дн."
            )
        else:
            ref_text = "\n\n🎁 Код уже использован или недействителен."

    local_hint = ""
    if not any(r for r in rows if r and r[0].web_app):
        local_hint = "\n\n<i>Локальный режим: Mini App недоступен (нужен HTTPS).</i>"

    await message.answer(
        f"👋 <b>НавигаторAI</b>\n"
        f"<i>Тихий AI-оператор вашего дня</i>\n\n"
        f"Отправьте <b>текст</b>, <b>голосовое</b> или <b>фото чека</b> — "
        f"я разложу на задачи, расходы и напоминания.\n\n"
        f"🔑 Ваш код: <code>{code}</code>\n"
        f"Пригласите друга — бонусы обоим.{ref_text}{local_hint}",
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
        "/premium — подписка\n"
        "/privacy — данные\n"
        "/referral — пригласить друга",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )


@router.message(Command("referral"))
async def cmd_referral(message: Message) -> None:
    info = await api_client.ensure_user(
        message.from_user.id,
        username=message.from_user.username,
        first_name=message.from_user.first_name,
    )
    code = info.get("referral_code", "")
    link = _referral_link(code)
    ref_rows: list[list[InlineKeyboardButton]] = [
        [InlineKeyboardButton(text="📤 Поделиться ссылкой", url=link)],
    ]
    if btn := mini_app_button("📱 Mini App"):
        ref_rows.append([btn])
    kb = InlineKeyboardMarkup(inline_keyboard=ref_rows)
    await message.answer(
        f"<b>Реферальная программа</b>\n\n"
        f"Ваша ссылка:\n<code>{link}</code>\n\n"
        f"• Вы: +{settings.referral_bonus_days} дн. Premium за друга\n"
        f"• Друг: +{settings.referral_referred_bonus_days} дн. Premium при регистрации",
        reply_markup=kb,
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
        "• PDF-отчёты и приоритетный разбор\n\n"
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
        "• Группы не поддерживаются\n"
        "• Удаление всех данных — в Mini App → Приватность",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )
