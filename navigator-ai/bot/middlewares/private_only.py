"""Только личные чаты — группы отклоняются."""
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.enums import ChatType
from aiogram.types import Message, TelegramObject


class PrivateChatOnlyMiddleware(BaseMiddleware):
  async def __call__(
      self,
      handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
      event: TelegramObject,
      data: dict[str, Any],
  ) -> Any:
      if isinstance(event, Message) and event.chat.type != ChatType.PRIVATE:
          await event.answer(
              "🔒 НавигаторAI работает только в личном чате.\n"
              "Напишите @NavigAI_bot в личные сообщения."
          )
          return None
      return await handler(event, data)
