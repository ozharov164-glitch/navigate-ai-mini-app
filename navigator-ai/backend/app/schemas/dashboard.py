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
    created_at: datetime

    model_config = {"from_attributes": True}


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


class DashboardOut(BaseModel):
    tasks_today: list[TaskOut]
    expenses_month: list[ExpenseOut]
    routes_recent: list[RouteOut]
    insights: list[InsightOut]
    summary_latest: str | None
    saved_minutes_today: int
    saved_rub_today: int
    tier: str
    daily_actions_left: int
    is_premium: bool


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
