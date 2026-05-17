"""Dashboard и CRUD для Mini App."""
from datetime import date, datetime, time, timezone

import pytz
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.uploads import read_upload_limited
from backend.app.models.content import (
    ActionLog,
    Digest,
    DocumentVault,
    Expense,
    Reminder,
    SmartInsight,
    Task,
)
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    AnalyzeIn,
    DashboardOut,
    DbInsightOut,
    ExpenseIn,
    ExpenseOut,
    InsightOut,
    PrivacyInfo,
    ReminderOut,
    TaskOut,
    TaskUpdate,
    UserSettingsUpdate,
)
from backend.app.services.action_processor import action_processor
from backend.app.services.product_insights_service import product_insights_service
from backend.app.services.user_service import user_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
settings = get_settings()


def _user_today_bounds(user: User) -> tuple[datetime, datetime]:
    """Границы «сегодня» в UTC по часовому поясу пользователя."""
    tz = pytz.timezone(user.timezone or settings.default_timezone)
    local_now = datetime.now(tz)
    start_local = datetime.combine(local_now.date(), time.min, tzinfo=tz)
    end_local = datetime.combine(local_now.date(), time.max, tzinfo=tz)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


@router.get("", response_model=DashboardOut)
async def get_dashboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    day_start, day_end = _user_today_bounds(user)
    month_start = date.today().replace(day=1)

    tasks_today = (
        await db.execute(
            select(Task)
            .where(
                Task.user_id == user.id,
                Task.archived.is_(False),
                Task.completed.is_(False),
                or_(Task.due_date.is_(None), Task.due_date <= day_end),
            )
            .order_by(Task.due_date.nulls_last(), Task.priority.desc(), Task.created_at.desc())
            .limit(30)
        )
    ).scalars().all()

    tasks_completed_today = (
        await db.execute(
            select(Task)
            .where(
                Task.user_id == user.id,
                Task.completed.is_(True),
                Task.archived.is_(False),
                Task.completed_at.isnot(None),
                Task.completed_at >= day_start,
                Task.completed_at <= day_end,
            )
            .order_by(Task.completed_at.desc())
            .limit(20)
        )
    ).scalars().all()

    expenses = (
        await db.execute(
            select(Expense)
            .where(Expense.user_id == user.id, Expense.expense_date >= month_start)
            .order_by(Expense.expense_date.desc())
            .limit(100)
        )
    ).scalars().all()

    insights = (
        await db.execute(
            select(SmartInsight)
            .where(SmartInsight.user_id == user.id)
            .order_by(SmartInsight.created_at.desc())
            .limit(5)
        )
    ).scalars().all()

    last_log = (
        await db.execute(
            select(ActionLog)
            .where(ActionLog.user_id == user.id)
            .order_by(ActionLog.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    db_insights = await product_insights_service.build(db, user)

    return DashboardOut(
        tasks_today=[TaskOut.model_validate(t) for t in tasks_today],
        tasks_completed_today=[TaskOut.model_validate(t) for t in tasks_completed_today],
        expenses_month=[ExpenseOut.model_validate(e) for e in expenses],
        insights=[InsightOut.model_validate(i) for i in insights],
        db_insights=[DbInsightOut.model_validate(i) for i in db_insights],
        summary_latest=last_log.raw_summary if last_log else None,
        saved_minutes_today=user.saved_minutes_today,
        saved_rub_today=user.saved_rub_today,
        tier=user.tier,
        daily_actions_left=user_service.daily_actions_left(user),
        daily_actions_limit=user_service.daily_limit(user),
        daily_actions_used=user_service.daily_actions_used(user),
        is_premium=user_service.is_premium(user),
        theme=user.theme or "dark",
        timezone=user.timezone or settings.default_timezone,
    )


@router.post("/analyze")
async def analyze_text(
    body: AnalyzeIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await user_service.check_daily_limit(db, user):
        raise HTTPException(429, user_service.limit_message(user))
    try:
        return await action_processor.process_message(
            db, user, text=body.text, template=body.template, input_type="text"
        )
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post("/analyze-voice")
async def analyze_voice(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user_service.can_use_multimedia(user):
        raise HTTPException(403, user_service.multimedia_denied_message())
    if not await user_service.check_daily_limit(db, user):
        raise HTTPException(429, user_service.limit_message(user))
    content, filename = await read_upload_limited(file, kind="audio")
    try:
        from backend.app.services.ai_service import ai_service

        transcript = await ai_service.transcribe_voice(content, filename)
        return await action_processor.process_message(
            db, user, text=transcript, voice_transcript=transcript, input_type="voice"
        )
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post("/analyze-photo")
async def analyze_photo(
    file: UploadFile = File(...),
    text: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user_service.can_use_multimedia(user):
        raise HTTPException(403, user_service.multimedia_denied_message())
    if not await user_service.check_daily_limit(db, user):
        raise HTTPException(429, user_service.limit_message(user))
    import base64
    from pathlib import Path

    import aiofiles

    content, filename = await read_upload_limited(file, kind="image")
    from backend.app.services.ai_service import ai_service

    photo_description = await ai_service.describe_photo(content)
    photo_base64 = base64.b64encode(content).decode()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    receipt_path = str(Path(settings.upload_dir) / f"{user.id}_{filename}")
    async with aiofiles.open(receipt_path, "wb") as f:
        await f.write(content)
    try:
        return await action_processor.process_message(
            db,
            user,
            text=text or photo_description,
            photo_description=photo_description,
            photo_base64=photo_base64,
            input_type="photo",
            receipt_path=receipt_path,
        )
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    body: TaskUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = (await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user.id))).scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Задача не найдена")
    if body.completed is not None:
        task.completed = body.completed
        task.completed_at = datetime.now(timezone.utc) if body.completed else None
    if body.archived is not None:
        task.archived = body.archived
    if body.title:
        task.title = body.title
    return TaskOut.model_validate(task)


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Task)
            .where(Task.user_id == user.id, Task.archived.is_(False))
            .order_by(Task.created_at.desc())
            .limit(200)
        )
    ).scalars().all()
    return [TaskOut.model_validate(t) for t in rows]


@router.get("/expenses", response_model=list[ExpenseOut])
async def list_expenses(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Expense).where(Expense.user_id == user.id).order_by(Expense.expense_date.desc()).limit(200)
        )
    ).scalars().all()
    return [ExpenseOut.model_validate(e) for e in rows]


@router.post("/expenses", response_model=ExpenseOut)
async def create_expense(
    body: ExpenseIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp = Expense(
        user_id=user.id,
        amount=body.amount,
        category=body.category.strip(),
        merchant=body.merchant,
        description=body.description,
        expense_date=body.expense_date or date.today(),
    )
    db.add(exp)
    await db.flush()
    return ExpenseOut.model_validate(exp)


@router.get("/reminders", response_model=list[ReminderOut])
async def list_reminders(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(Reminder).where(Reminder.user_id == user.id).order_by(Reminder.remind_at))
    ).scalars().all()
    return [ReminderOut.model_validate(r) for r in rows]


@router.get("/budget-stats")
async def budget_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Expense.category, func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == user.id)
        .group_by(Expense.category)
    )
    by_category = [{"category": r[0], "total": float(r[1])} for r in result.all()]
    total = sum(c["total"] for c in by_category)
    return {"by_category": by_category, "total": total, "forecast": total * 1.1}


@router.patch("/settings")
async def update_settings(
    body: UserSettingsUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if body.theme:
        user.theme = body.theme
    if body.timezone:
        try:
            pytz.timezone(body.timezone)
            user.timezone = body.timezone
        except pytz.UnknownTimeZoneError:
            raise HTTPException(400, "Неизвестный часовой пояс") from None
    if body.proactive_enabled is not None:
        user.proactive_enabled = body.proactive_enabled
    return {"ok": True, "theme": user.theme, "timezone": user.timezone, "proactive_enabled": user.proactive_enabled}


@router.get("/privacy", response_model=PrivacyInfo)
async def privacy_info():
    return PrivacyInfo(
        stored_items=[
            "Задачи, расходы, напоминания",
            "Фото документов (на вашем VPS)",
            "Логи AI-анализа (JSON, без сырого голоса)",
        ],
        retention_policy="Данные хранятся на вашем VPS до удаления.",
        encryption="AES-256 (Fernet) для чувствительных полей",
    )


@router.delete("/privacy/delete-all")
async def delete_all(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user.id
    for model in (Task, Expense, Reminder, SmartInsight, ActionLog, Digest, DocumentVault):
        await db.execute(delete(model).where(model.user_id == uid))
    user.daily_actions_count = 0
    user.saved_minutes_today = 0
    user.saved_rub_today = 0
    user.onboarding_completed = False
    return {"ok": True, "message": "Все данные удалены"}
