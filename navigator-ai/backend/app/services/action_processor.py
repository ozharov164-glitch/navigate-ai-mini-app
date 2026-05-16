"""Обработка AI-ответа и сохранение в БД."""
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import (
    ActionLog,
    DocumentVault,
    Expense,
    Reminder,
    Route,
    SmartInsight,
    Task,
)
from backend.app.schemas.ai import AIAnalysisResponse
from backend.app.services.ai_service import ai_service
from backend.app.services.context_builder import context_builder
from backend.app.services.user_service import user_service
from backend.app.services.yandex_maps import yandex_maps
from backend.app.models.user import User


class ActionProcessor:
  async def process_message(
      self,
      session: AsyncSession,
      user: User,
      *,
      text: str | None = None,
      voice_transcript: str | None = None,
      photo_description: str | None = None,
      photo_base64: str | None = None,
      latitude: float | None = None,
      longitude: float | None = None,
      template: str | None = None,
      input_type: str = "text",
      receipt_path: str | None = None,
  ) -> AIAnalysisResponse:
      places = await user_service.get_places_decrypted(session, user.id)
      db_context = await context_builder.build_template_context(session, user, template)
      analysis = await ai_service.analyze(
          text=text,
          voice_transcript=voice_transcript,
          photo_description=photo_description,
          photo_base64=photo_base64,
          latitude=latitude,
          longitude=longitude,
          user_places=places,
          template=template,
          db_context=db_context,
          is_premium=user_service.is_premium(user),
      )
      await self._persist(session, user, analysis, input_type, receipt_path)
      # Метрика ценности: эвристика
      saved_min = len(analysis.tasks) * 5 + len(analysis.routes) * 10
      saved_rub = int(sum(e.amount for e in analysis.expenses) * 0.05)
      await user_service.add_value_metrics(user, saved_min, saved_rub)
      return analysis

  async def _persist(
      self,
      session: AsyncSession,
      user: User,
      data: AIAnalysisResponse,
      input_type: str,
      receipt_path: str | None,
  ) -> None:
      for t in data.tasks:
          session.add(
              Task(
                  user_id=user.id,
                  title=t.title,
                  description=t.description,
                  due_date=t.due_date,
                  priority=t.priority,
              )
          )
      for e in data.expenses:
          session.add(
              Expense(
                  user_id=user.id,
                  amount=e.amount,
                  currency=e.currency,
                  category=e.category,
                  merchant=e.merchant,
                  description=e.description,
                  receipt_path=receipt_path,
              )
          )
      for r in data.routes:
          try:
              route_info = await yandex_maps.route(r.from_address, r.to_address, r.transport_mode)
          except Exception:
              route_info = yandex_maps._fallback_route(r.from_address, r.to_address, r.transport_mode)
          session.add(
              Route(
                  user_id=user.id,
                  from_address=route_info["from_address"],
                  to_address=route_info["to_address"],
                  transport_mode=r.transport_mode,
                  duration_minutes=route_info["duration_minutes"],
                  distance_km=route_info["distance_km"],
                  traffic_level=route_info["traffic_level"],
                  static_map_url=route_info["static_map_url"],
                  yandex_maps_url=route_info["yandex_maps_url"],
                  route_data=route_info.get("route_data"),
              )
          )
      for rem in data.reminders:
          session.add(
              Reminder(
                  user_id=user.id,
                  title=rem.title,
                  remind_at=rem.remind_at,
              )
          )
      for insight in data.smart_insights:
          session.add(SmartInsight(user_id=user.id, insight=insight, category="ai"))

      if receipt_path and input_type == "photo":
          session.add(
              DocumentVault(
                  user_id=user.id,
                  title="Документ из чата",
                  doc_type="receipt",
                  file_path=receipt_path,
              )
          )

      session.add(
          ActionLog(
              user_id=user.id,
              action_type="analyze",
              input_type=input_type,
              raw_summary=data.summary,
              ai_response=data.model_dump(mode="json"),
          )
      )
      await session.flush()


action_processor = ActionProcessor()
