"""Команды бота."""
from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

from bot.config import settings
from bot.services.api_client import api_client
from bot.utils.keyboard import mini_app_button

router = Router()


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

    ref_text = ""
    if referral:
        if info.get("referral_applied"):
            ref_text = "\n🎁 Реферальный код применён — реферер получил +14 дней премиум."
        else:
            ref_text = "\n🎁 Реферальный код принят (уже использован или недействителен)."

    local_hint = ""
    if not rows:
        local_hint = "\n\n<i>Локальный режим: Mini App недоступен (нужен HTTPS). Бот и AI работают через сообщения.</i>"

    await message.answer(
        f"👋 <b>НавигаторAI</b> — ваш личный AI-навигатор жизни.\n\n"
        f"Отправьте голосовое, фото чека, текст или геопозицию — "
        f"я превращу это в задачи, расходы, маршруты и напоминания.\n\n"
        f"🔑 Ваш реферальный код: <code>{info.get('referral_code')}</code>\n"
        f"Пригласите друга — +14 дней премиум.{ref_text}{local_hint}",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "<b>Как пользоваться:</b>\n"
        "🎤 Голосовое — транскрипция + действия\n"
        "📷 Фото — чек, билет, документ\n"
        "💬 Текст — любая заметка\n"
        "📍 Геопозиция — маршруты с пробками\n\n"
        "/premium — подписка\n"
        "/privacy — приватность данных",
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
        "<b>Премиум НавигаторAI</b>\n\n"
        "• Безлимит действий\n"
        "• PDF-отчёты\n"
        "• Smart Insights\n"
        "• Приоритет DeepSeek\n\n"
        "Free: 20 действий в сутки",
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
        "• Данные только на вашем VPS\n"
        "• Адреса шифруются (Fernet)\n"
        "• Группы не поддерживаются\n"
        "• Удаление всех данных — в Mini App → Приватность",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
        parse_mode="HTML",
    )
