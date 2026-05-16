"""Telegram Stars платежи."""
import logging

from aiogram import F, Router
from aiogram.types import CallbackQuery, LabeledPrice, Message, PreCheckoutQuery

from bot.config import settings
from bot.services.api_client import api_client

router = Router()
logger = logging.getLogger(__name__)


@router.callback_query(F.data.startswith("pay_stars_"))
async def pay_stars(callback: CallbackQuery) -> None:
    tier = "basic" if "basic" in callback.data else "premium"
    price = settings.stars_basic_price if tier == "basic" else settings.stars_premium_price
    await callback.message.answer_invoice(
        title=f"НавигаторAI {tier.upper()}",
        description="Премиум подписка на 30 дней",
        payload=f"stars_{tier}_{callback.from_user.id}",
        currency="XTR",
        prices=[LabeledPrice(label="Подписка", amount=price)],
    )
    await callback.answer()


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery) -> None:
    payload = query.invoice_payload or ""
    if not payload.startswith("stars_"):
        await query.answer(ok=False, error_message="Неверный платёж")
        return
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def successful_payment(message: Message) -> None:
    payment = message.successful_payment
    if not payment:
        return

    payload = payment.invoice_payload or ""
    parts = payload.split("_")
    # stars_{tier}_{telegram_id} или stars_{tier}_{telegram_id}_{uuid}
    if len(parts) < 3 or parts[0] != "stars":
        logger.warning("Unknown payment payload: %s", payload)
        await message.answer("✅ Оплата получена, но не удалось активировать премиум. Напишите в поддержку.")
        return

    tier = parts[1]
    if tier not in ("basic", "premium"):
        tier = "premium"

    try:
        telegram_id = int(parts[2])
    except ValueError:
        telegram_id = message.from_user.id

    payment_ref = payment.telegram_payment_charge_id
    try:
        result = await api_client.activate_premium(telegram_id, tier, payment_ref)
        until = result.get("premium_until", "")
        await message.answer(
            f"✅ <b>Премиум активирован!</b>\n\n"
            f"Тариф: {tier.upper()}\n"
            f"Действует до: {until[:10] if until else '30 дней'}\n\n"
            f"Откройте Mini App — все функции доступны.",
            parse_mode="HTML",
        )
    except Exception:
        logger.exception("Failed to activate premium for %s", telegram_id)
        await message.answer(
            "✅ Оплата получена. Премиум активируется в течение минуты.\n"
            "Если доступ не появился — откройте Mini App или напишите /premium.",
            parse_mode="HTML",
        )
