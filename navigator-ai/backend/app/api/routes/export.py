"""Экспорт iCal и PDF."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.services.export_service import export_service
from backend.app.services.user_service import user_service

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/ical")
async def export_ical(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await export_service.export_ical(db, user.id)
    return Response(
        content=data,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=navigai.ics"},
    )


@router.get("/pdf")
async def export_pdf(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user_service.is_premium(user):
        raise HTTPException(403, "PDF-отчёт доступен только в премиум")
    data = await export_service.export_pdf_report(db, user.id)
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=navigai-report.pdf"},
    )
