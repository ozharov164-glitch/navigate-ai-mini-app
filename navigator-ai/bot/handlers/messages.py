"""Обработка голоса, фото, текста, геолокации."""
from aiogram import F, Router
from aiogram.types import Message

from bot.services.api_client import api_client
from bot.utils.keyboard import mini_app_keyboard

router = Router()


def _format_response(data: dict) -> str:
    if data.get("error") in ("limit", "server", "client"):
        return f"⚠️ {data.get('message', 'Не удалось обработать')}\n\nПопробуйте ещё раз или /premium"

    lines = [f"✅ <b>{data.get('summary', 'Готово!')}</b>", ""]
    if data.get("tasks_count"):
        lines.append(f"📋 Задач: {data['tasks_count']}")
    if data.get("expenses_count"):
        lines.append(f"💰 Расходов: {data['expenses_count']}")
    if data.get("routes_count"):
        lines.append(f"🗺 Маршрутов: {data['routes_count']}")
    if data.get("reminders_count"):
        lines.append(f"⏰ Напоминаний: {data['reminders_count']}")
    insights = data.get("insights") or []
    if insights:
        lines.append("\n💡 <b>Insights:</b>")
        for i in insights[:3]:
            lines.append(f"• {i}")
    if data.get("saved_minutes") or data.get("saved_rub"):
        lines.append(
            f"\n📊 Сегодня AI сэкономил: <b>{data.get('saved_minutes', 0)} мин</b> "
            f"и <b>{data.get('saved_rub', 0)} ₽</b>"
        )
    return "\n".join(lines)


def _reply_markup():
    return mini_app_keyboard("📱 Открыть Mini App")


@router.message(F.voice)
async def handle_voice(message: Message) -> None:
    status = await message.answer("🎤 Слушаю и анализирую...")
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
        await status.edit_text(
            "⚠️ Не удалось обработать голосовое. Попробуйте текстом.",
            parse_mode="HTML",
            reply_markup=_reply_markup(),
        )


@router.message(F.photo)
async def handle_photo(message: Message) -> None:
    status = await message.answer("📷 Распознаю документ...")
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    data = await message.bot.download_file(file.file_path)
    content = data.read() if hasattr(data, "read") else data
    caption = message.caption or ""

    try:
        result = await api_client.process(
            message.from_user.id,
            input_type="photo",
            text=caption,
            file_bytes=content,
            filename="photo.jpg",
        )
        await status.edit_text(_format_response(result), parse_mode="HTML", reply_markup=_reply_markup())
    except Exception:
        await status.edit_text(
            "⚠️ Не удалось обработать фото. Попробуйте снова.",
            parse_mode="HTML",
            reply_markup=_reply_markup(),
        )


@router.message(F.location)
async def handle_location(message: Message) -> None:
    status = await message.answer("📍 Строю маршрут...")
    try:
        result = await api_client.process(
            message.from_user.id,
            input_type="location",
            text=message.caption or "Текущая геопозиция",
            latitude=message.location.latitude,
            longitude=message.location.longitude,
        )
        await status.edit_text(_format_response(result), parse_mode="HTML", reply_markup=_reply_markup())
    except Exception:
        await status.edit_text(
            "⚠️ Не удалось построить маршрут.",
            parse_mode="HTML",
            reply_markup=_reply_markup(),
        )


@router.message(F.text)
async def handle_text(message: Message) -> None:
    if message.text.startswith("/"):
        return
    status = await message.answer("🧠 Анализирую...")
    template = None
    lower = message.text.lower()
    if "чек" in lower:
        template = "receipt"
    elif "план" in lower and "день" in lower:
        template = "day_plan"
    elif "недел" in lower:
        template = "week_analysis"

    try:
        result = await api_client.process(
            message.from_user.id,
            input_type="text",
            text=message.text,
            template=template,
        )
        await status.edit_text(_format_response(result), parse_mode="HTML", reply_markup=_reply_markup())
    except Exception:
        await status.edit_text(
            "⚠️ AI временно недоступен. Попробуйте через минуту.",
            parse_mode="HTML",
            reply_markup=_reply_markup(),
        )
