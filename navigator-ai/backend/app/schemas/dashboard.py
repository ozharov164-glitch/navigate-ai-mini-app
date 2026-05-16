"""Схемы для Mini App API."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class TaskOut(BaseModel):
    id: int
    title: str
    description: str | None
    due_date: datetime | None
    priority: str
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    completed: bool | None = None
    title: str | None = None


class ExpenseOut(BaseModel):
    id: int
    amount: float
    currency: str
    category: str
    merchant: str | None
    description: str | None
    expense_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class RouteOut(BaseModel):
    id: int
    from_address: str
    to_address: str
    transport_mode: str
    duration_minutes: int | None
    distance_km: float | None
    traffic_level: str | None
    static_map_url: str | None
    yandex_maps_url: str | None
    route_provider: str | None = None  # yandex | osrm | fallback | link_only
    created_at: datetime

    model_config = {"from_attributes": True}


class UserTemplateOut(BaseModel):
    id: int
    title: str
    prompt: str
    template_key: str | None
    icon: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserTemplateIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    prompt: str = Field(..., min_length=3, max_length=2000)
    template_key: str | None = None
    icon: str = "sparkles"


class ReminderOut(BaseModel):
    id: int
    title: str
    remind_at: datetime
    sent: bool

    model_config = {"from_attributes": True}


class InsightOut(BaseModel):
    id: int
    insight: str
    category: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: int
    title: str
    doc_type: str
    expiry_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlaceIn(BaseModel):
    name: str
    address: str
    lat: float | None = None
    lon: float | None = None


class PlaceOut(BaseModel):
    id: int
    name: str
    address: str
    lat: float | None
    lon: float | None

    model_config = {"from_attributes": True}


class AchievementOut(BaseModel):
    id: str
    title: str
    description: str
    unlocked: bool


class GamificationOut(BaseModel):
    streak: int
    level: int
    xp: int
    xp_in_level: int
    xp_to_next: int
    achievements: list[AchievementOut]
    tasks_completed: int = 0
    ai_actions_total: int = 0


class DbInsightOut(BaseModel):
    id: str
    title: str
    body: str
    icon: str


class DashboardOut(BaseModel):
    tasks_today: list[TaskOut]
    expenses_month: list[ExpenseOut]
    routes_recent: list[RouteOut]
    insights: list[InsightOut]
    db_insights: list[DbInsightOut] = Field(default_factory=list)
    user_templates: list[UserTemplateOut] = Field(default_factory=list)
    gamification: GamificationOut | None = None
    summary_latest: str | None
    saved_minutes_today: int
    saved_rub_today: int
    tier: str
    daily_actions_left: int
    daily_actions_limit: int
    daily_actions_used: int
    is_premium: bool
    theme: str = "dark"
    route_provider: str = "auto"


class AnalyzeIn(BaseModel):
    text: str | None = None
    template: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class PrivacyInfo(BaseModel):
    stored_items: list[str] = Field(default_factory=list)
    retention_policy: str
    encryption: str
    server_location: str = "Ваш VPS (self-hosted)"


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    timezone: str | None = None
    proactive_enabled: bool | None = None
    route_provider: str | None = None  # auto | yandex | osrm
