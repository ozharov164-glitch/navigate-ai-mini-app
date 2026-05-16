"""Экспорт iCal и PDF (премиум)."""
import io
from datetime import datetime, timedelta, timezone

from icalendar import Calendar, Event
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.content import Expense, Task


class ExportService:
  async def export_ical(self, session: AsyncSession, user_id: int) -> bytes:
      cal = Calendar()
      cal.add("prodid", "-//NavigAI//НавигаторAI//RU")
      cal.add("version", "2.0")

      result = await session.execute(
          select(Task).where(Task.user_id == user_id, Task.due_date.isnot(None))
      )
      for task in result.scalars().all():
          event = Event()
          event.add("summary", task.title)
          if task.description:
              event.add("description", task.description)
          due = task.due_date
          if due.tzinfo is None:
              due = due.replace(tzinfo=timezone.utc)
          event.add("dtstart", due)
          event.add("dtend", due + timedelta(hours=1))
          cal.add_component(event)

      return cal.to_ical()

  async def export_pdf_report(self, session: AsyncSession, user_id: int) -> bytes:
      """PDF-отчёт — только для премиум."""
      buffer = io.BytesIO()
      c = canvas.Canvas(buffer, pagesize=A4)
      width, height = A4
      y = height - 2 * cm

      c.setFont("Helvetica-Bold", 16)
      c.drawString(2 * cm, y, "НавигаторAI — Отчёт")
      y -= 1 * cm
      c.setFont("Helvetica", 11)
      c.drawString(2 * cm, y, f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
      y -= 1.5 * cm

      tasks = (await session.execute(select(Task).where(Task.user_id == user_id).limit(50))).scalars().all()
      c.setFont("Helvetica-Bold", 12)
      c.drawString(2 * cm, y, "Задачи")
      y -= 0.8 * cm
      c.setFont("Helvetica", 10)
      for t in tasks:
          status = "✓" if t.completed else "○"
          line = f"{status} {t.title[:60]}"
          c.drawString(2 * cm, y, line)
          y -= 0.5 * cm
          if y < 3 * cm:
              c.showPage()
              y = height - 2 * cm

      expenses = (await session.execute(select(Expense).where(Expense.user_id == user_id).limit(50))).scalars().all()
      y -= 0.5 * cm
      c.setFont("Helvetica-Bold", 12)
      c.drawString(2 * cm, y, "Расходы")
      y -= 0.8 * cm
      c.setFont("Helvetica", 10)
      total = 0.0
      for e in expenses:
          total += e.amount
          c.drawString(2 * cm, y, f"{e.category}: {e.amount:.0f} ₽")
          y -= 0.5 * cm

      c.setFont("Helvetica-Bold", 11)
      c.drawString(2 * cm, y - 0.3 * cm, f"Итого: {total:.0f} ₽")
      c.save()
      buffer.seek(0)
      return buffer.read()


export_service = ExportService()
