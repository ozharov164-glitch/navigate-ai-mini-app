"""Обработка голоса, фото и текста."""
from aiogram import F, Router
from aiogram.types import Message

from bot.services.api_client import api_client
from bot.utils.keyboard import mini_app_keyboard

router = Router()


def _format_response(data: dict) -> str:
    if data.get("error") in ("limit", "server", "client"):
        return f"⚠️ {data.get('message', 'Не удалось обработать')}"

    lines = [f"✅ <b>{data.get('summary', 'Готово')}</b>", ""]

    created: list[str] = []
    if data.get("tasks_count"):
        created.append(f"📋 Задач: {data['tasks_count']}")
        for t in data.get("tasks_preview") or []:
            created.append(f"  · {t}")
    if data.get("expenses_count"):
        created.append(f"💳 Расходов: {data['expenses_count']}")
        for e in data.get("expenses_preview") or []:
            created.append(f"  · {e}")
    if data.get("reminders_count"):
        created.append(f"⏰ Напоминаний: {data['reminders_count']}")

    if created:
        lines.append("\n".join(created))
        lines.append("")

    if data.get("saved_minutes") or data.get("saved_rub"):
        lines.append(
            f"Сегодня AI сэкономил: <b>{data.get('saved_minutes', 0)}</b> мин · "
            f"<b>{data.get('saved_rub', 0)}</b> ₽"
        )

    return "\n".join(lines)


def _reply_markup():
    return mini_app_keyboard("📱 Открыть Mini App")


@router.message(F.voice)
async def handle_voice(message: Message) -> None:
    status = await message.answer("🎤 Слушаю…")
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
    except Exception as e:
        msg = str(e) if "Premium" in str(e) or "лимит" in str(e).lower() else "Не удалось обработать голосовое."
        await status.edit_text(f"⚠️ {msg}", reply_markup=_reply_markup())


@router.message(F.photo)
async def handle_photo(message: Message) -> None:
    status = await message.answer("📷 Анализирую…")
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
        await status.edit_text(
            "⚠️ Фото доступно в Premium. Оформите подписку в Mini App.",
            reply_markup=_reply_markup(),
        )


@router.message(F.text)
async def handle_text(message: Message) -> None:
    if message.text.startswith("/"):
        return
    status = await message.answer("✨ Разбираю…")
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
    except Exception as e:
        detail = str(e)
        if "429" in detail or "лимит" in detail.lower():
            await status.edit_text(f"⚠️ {detail}", reply_markup=_reply_markup())
        else:
            await status.edit_text("⚠️ Не удалось разобрать. Попробуйте короче.", reply_markup=_reply_markup())
