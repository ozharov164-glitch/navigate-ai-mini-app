"""Dashboard и CRUD для Mini App."""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.security import decrypt_sensitive
from backend.app.models.content import (
    ActionLog,
    Digest,
    DocumentVault,
    Expense,
    Reminder,
    Route,
    SmartInsight,
    Task,
    UserTemplate,
)
from backend.app.models.user import User, UserPlace
from backend.app.schemas.dashboard import (
    AnalyzeIn,
    DashboardOut,
    DbInsightOut,
    DocumentOut,
    ExpenseOut,
    GamificationOut,
    AchievementOut,
    InsightOut,
    PlaceIn,
    PlaceOut,
    PrivacyInfo,
    ReminderOut,
    RouteOut,
    TaskOut,
    TaskUpdate,
    UserSettingsUpdate,
    UserTemplateIn,
    UserTemplateOut,
)
from backend.app.services.gamification_service import gamification_service
from backend.app.services.product_insights_service import product_insights_service
from backend.app.core.uploads import read_upload_limited
from backend.app.services.action_processor import action_processor
from backend.app.services.user_service import user_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
settings = get_settings()


def _route_provider(route: Route) -> str:
    """Провайдер маршрута из route_data JSON."""
    if route.route_data and isinstance(route.route_data, dict):
        p = route.route_data.get("provider", "")
        if route.route_data.get("fallback"):
            return "fallback"
        if p in ("yandex", "osrm"):
            return p
    return "fallback"


def _route_out(route: Route) -> RouteOut:
    out = RouteOut.model_validate(route)
    return out.model_copy(update={"route_provider": _route_provider(route)})


@router.get("", response_model=DashboardOut)
async def get_dashboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    tasks = (
        await db.execute(
            select(Task)
            .where(Task.user_id == user.id, Task.completed.is_(False))
            .order_by(Task.due_date.nulls_last(), Task.created_at.desc())
            .limit(20)
        )
    ).scalars().all()

    month_start = date.today().replace(day=1)
    expenses = (
        await db.execute(
            select(Expense)
            .where(Expense.user_id == user.id, Expense.expense_date >= month_start)
            .order_by(Expense.expense_date.desc())
            .limit(100)
        )
    ).scalars().all()

    routes = (
        await db.execute(
            select(Route).where(Route.user_id == user.id).order_by(Route.created_at.desc()).limit(10)
        )
    ).scalars().all()

    insights = (
        await db.execute(
            select(SmartInsight)
            .where(SmartInsight.user_id == user.id)
            .order_by(SmartInsight.created_at.desc())
            .limit(10)
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

    is_premium = user_service.is_premium(user)
    limit = user_service.daily_limit(user)
    used = user_service.daily_actions_used(user)
    left = user_service.daily_actions_left(user)

    g = await gamification_service.build_profile(db, user)
    db_insights = await product_insights_service.build(db, user)
    templates = (
        await db.execute(
            select(UserTemplate)
            .where(UserTemplate.user_id == user.id)
            .order_by(UserTemplate.created_at.desc())
            .limit(10)
        )
    ).scalars().all()

    return DashboardOut(
        tasks_today=[TaskOut.model_validate(t) for t in tasks],
        expenses_month=[ExpenseOut.model_validate(e) for e in expenses],
        routes_recent=[_route_out(r) for r in routes],
        insights=[InsightOut.model_validate(i) for i in insights],
        db_insights=[DbInsightOut.model_validate(i) for i in db_insights],
        gamification=GamificationOut(
            streak=g["streak"],
            level=g["level"],
            xp=g["xp"],
            xp_in_level=g["xp_in_level"],
            xp_to_next=g["xp_to_next"],
            achievements=[AchievementOut.model_validate(a) for a in g["achievements"]],
            tasks_completed=g["tasks_completed"],
            ai_actions_total=g["ai_actions_total"],
        ),
        summary_latest=last_log.raw_summary if last_log else None,
        saved_minutes_today=user.saved_minutes_today,
        saved_rub_today=user.saved_rub_today,
        tier=user.tier,
        daily_actions_left=left,
        daily_actions_limit=limit,
        daily_actions_used=used,
        is_premium=is_premium,
        theme=user.theme or "dark",
        user_templates=[UserTemplateOut.model_validate(t) for t in templates],
    )


@router.get("/templates", response_model=list[UserTemplateOut])
async def list_templates(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(UserTemplate).where(UserTemplate.user_id == user.id).order_by(UserTemplate.created_at.desc())
        )
    ).scalars().all()
    return [UserTemplateOut.model_validate(t) for t in rows]


@router.post("/templates", response_model=UserTemplateOut)
async def create_template(
    body: UserTemplateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = (
        await db.execute(select(func.count(UserTemplate.id)).where(UserTemplate.user_id == user.id))
    ).scalar() or 0
    if count >= 15:
        raise HTTPException(400, "Максимум 15 шаблонов")
    t = UserTemplate(
        user_id=user.id,
        title=body.title.strip(),
        prompt=body.prompt.strip(),
        template_key=body.template_key,
        icon=body.icon or "sparkles",
    )
    db.add(t)
    await db.flush()
    return UserTemplateOut.model_validate(t)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = (
        await db.execute(
            select(UserTemplate).where(UserTemplate.id == template_id, UserTemplate.user_id == user.id)
        )
    ).scalar_one_or_none()
    if t:
        await db.delete(t)
    return {"ok": True}


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
            db, user, text=body.text, template=body.template,
            latitude=body.latitude, longitude=body.longitude, input_type="text",
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


@router.patch("/tasks/{task_id}")
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
        was_done = task.completed
        task.completed = body.completed
        if body.completed and not was_done:
            gamification_service.add_task_xp(user)
    if body.title:
        task.title = body.title
    return TaskOut.model_validate(task)


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Task).where(Task.user_id == user.id).order_by(Task.created_at.desc()).limit(100))).scalars().all()
    return [TaskOut.model_validate(t) for t in rows]


@router.get("/expenses", response_model=list[ExpenseOut])
async def list_expenses(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Expense).where(Expense.user_id == user.id).order_by(Expense.expense_date.desc()).limit(200))).scalars().all()
    return [ExpenseOut.model_validate(e) for e in rows]


@router.get("/routes", response_model=list[RouteOut])
async def list_routes(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Route).where(Route.user_id == user.id).order_by(Route.created_at.desc()).limit(50))).scalars().all()
    return [_route_out(r) for r in rows]


@router.get("/reminders", response_model=list[ReminderOut])
async def list_reminders(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Reminder).where(Reminder.user_id == user.id).order_by(Reminder.remind_at))).scalars().all()
    return [ReminderOut.model_validate(r) for r in rows]


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(DocumentVault).where(DocumentVault.user_id == user.id).order_by(DocumentVault.created_at.desc()))).scalars().all()
    return [DocumentOut.model_validate(d) for d in rows]


@router.get("/digests")
async def list_digests(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Digest).where(Digest.user_id == user.id).order_by(Digest.created_at.desc()).limit(30))).scalars().all()
    return [{"id": d.id, "type": d.digest_type, "content": d.content, "insights": d.insights, "date": str(d.digest_date)} for d in rows]


@router.get("/budget-stats")
async def budget_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Expense.category, func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == user.id)
        .group_by(Expense.category)
    )
    by_category = [{"category": r[0], "total": float(r[1])} for r in result.all()]
    total = sum(c["total"] for c in by_category)
    forecast = total * 1.1  # простой прогноз +10%
    return {"by_category": by_category, "total": total, "forecast": forecast}


@router.get("/places", response_model=list[PlaceOut])
async def list_places(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    places = await user_service.get_places_decrypted(db, user.id)
    result = await db.execute(select(UserPlace).where(UserPlace.user_id == user.id))
    out = []
    for p, dec in zip(result.scalars().all(), places):
        out.append(PlaceOut(id=p.id, name=p.name, address=dec["address"], lat=p.lat, lon=p.lon))
    return out


@router.post("/places", response_model=PlaceOut)
async def add_place(body: PlaceIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    place = await user_service.add_place(db, user.id, body.name, body.address, body.lat, body.lon)
    return PlaceOut(id=place.id, name=place.name, address=body.address, lat=place.lat, lon=place.lon)


@router.delete("/places/{place_id}")
async def delete_place(place_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    place = (await db.execute(select(UserPlace).where(UserPlace.id == place_id, UserPlace.user_id == user.id))).scalar_one_or_none()
    if place:
        await db.delete(place)
    return {"ok": True}


@router.patch("/settings")
async def update_settings(body: UserSettingsUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.theme:
        user.theme = body.theme
    if body.timezone:
        user.timezone = body.timezone
    if body.proactive_enabled is not None:
        user.proactive_enabled = body.proactive_enabled
    return {
        "ok": True,
        "theme": user.theme,
    }


@router.get("/privacy", response_model=PrivacyInfo)
async def privacy_info():
    return PrivacyInfo(
        stored_items=[
            "Задачи, расходы, маршруты, напоминания",
            "Фото документов (зашифрованные заметки)",
            "Адреса «Мои места» (шифрование Fernet)",
            "Логи AI-анализа (JSON, без сырого голоса после обработки)",
        ],
        retention_policy="Данные хранятся на вашем VPS до удаления. Резервные копии — по вашей политике.",
        encryption="AES-256 (Fernet) для адресов и чувствительных полей",
    )


@router.delete("/privacy/delete-all")
async def delete_all(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    from backend.app.models.content import ActionLog, Digest, DocumentVault, Expense, Reminder, Route, SmartInsight, Task
    from backend.app.models.user import UserPlace

    uid = user.id
    for model in (Task, Expense, Route, Reminder, SmartInsight, ActionLog, Digest, DocumentVault, UserPlace):
        await db.execute(delete(model).where(model.user_id == uid))
    user.daily_actions_count = 0
    user.saved_minutes_today = 0
    user.saved_rub_today = 0
    user.onboarding_completed = False
    return {"ok": True, "message": "Все данные удалены"}
