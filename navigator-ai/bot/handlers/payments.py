"""Telegram Stars платежи."""
from aiogram import F, Router
from aiogram.types import CallbackQuery, LabeledPrice, Message, PreCheckoutQuery

from bot.config import settings

router = Router()


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
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def successful_payment(message: Message) -> None:
    await message.answer(
        "✅ Оплата получена! Премиум активирован.\n"
        "Откройте Mini App — все функции доступны.",
        parse_mode="HTML",
    )
