"""Обработка голоса, фото и текста."""
from aiogram import F, Router
from aiogram.types import Message

from bot.services.api_client import api_client
from bot.utils.keyboard import mini_app_keyboard

router = Router()


def _format_response(data: dict) -> str:
    if data.get("error") in ("limit", "server", "client"):
        return f"⚠️ {data.get('message', 'Не удалось обработать')}"

    lines = [f"<b>{data.get('summary', 'Готово')}</b>", ""]
    if data.get("tasks_count"):
        lines.append(f"Задач: {data['tasks_count']}")
    if data.get("expenses_count"):
        lines.append(f"Расходов: {data['expenses_count']}")
    if data.get("reminders_count"):
        lines.append(f"Напоминаний: {data['reminders_count']}")
    if data.get("saved_minutes") or data.get("saved_rub"):
        lines.append(
            f"\nСегодня: {data.get('saved_minutes', 0)} мин · {data.get('saved_rub', 0)} ₽"
        )
    return "\n".join(lines)


def _reply_markup():
    return mini_app_keyboard("Открыть Mini App")


@router.message(F.voice)
async def handle_voice(message: Message) -> None:
    status = await message.answer("Слушаю…")
    file = await message.bot.get_file(message.voice.file_id)
    data = await message.bot.download_file(file.file_path)
    content = data.read() if hasattr(data, "read") else data

    try:
        result = await api_client.process(
            message.from_user.id,
            input_type="voice",
            file_bytes=content,
            filename="voice.ogg",
        )
        await status.edit_text(_format_response(result), parse_mode="HTML", reply_markup=_reply_markup())
    except Exception:
        await status.edit_text("Не удалось обработать голосовое.", reply_markup=_reply_markup())


@router.message(F.photo)
async def handle_photo(message: Message) -> None:
    status = await message.answer("Анализирую фото…")
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    data = await message.bot.download_file(file.file_path)
    content = data.read() if hasattr(data, "read") else data

    try:
        result = await api_client.process(
            message.from_user.id,
            input_type="photo",
            text=message.caption or "",
            file_bytes=content,
            filename="photo.jpg",
        )
        await status.edit_text(_format_response(result), parse_mode="HTML", reply_markup=_reply_markup())
    except Exception:
        await status.edit_text("Не удалось обработать фото.", reply_markup=_reply_markup())


@router.message(F.text)
async def handle_text(message: Message) -> None:
    if message.text.startswith("/"):
        return
    status = await message.answer("Анализирую…")
    template = None
    lower = message.text.lower()
    if "чек" in lower:
        template = "receipt"

    try:
        result = await api_client.process(
            message.from_user.id,
            input_type="text",
            text=message.text,
            template=template,
        )
        await status.edit_text(_format_response(result), parse_mode="HTML", reply_markup=_reply_markup())
    except Exception:
        await status.edit_text("AI временно недоступен. Попробуйте позже.", reply_markup=_reply_markup())
