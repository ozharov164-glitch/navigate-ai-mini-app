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
    archived: bool = False
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    completed: bool | None = None
    archived: bool | None = None
    title: str | None = None


class ExpenseIn(BaseModel):
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    merchant: str | None = None
    description: str | None = None
    expense_date: date | None = None


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


class DbInsightOut(BaseModel):
    id: str
    title: str
    body: str
    icon: str


class DashboardOut(BaseModel):
    tasks_today: list[TaskOut]
    tasks_completed_today: list[TaskOut] = Field(default_factory=list)
    reminders_upcoming: list[ReminderOut] = Field(default_factory=list)
    expenses_month: list[ExpenseOut]
    insights: list[InsightOut]
    db_insights: list[DbInsightOut] = Field(default_factory=list)
    summary_latest: str | None
    saved_minutes_today: int
    saved_rub_today: int
    tier: str
    daily_actions_left: int
    daily_actions_limit: int
    daily_actions_used: int
    is_premium: bool
    theme: str = "dark"
    timezone: str = "Europe/Moscow"
    proactive_enabled: bool = True
    referral_code: str = ""
    referrals_count: int = 0


class AnalyzeIn(BaseModel):
    text: str | None = None
    template: str | None = None


class PrivacyInfo(BaseModel):
    stored_items: list[str] = Field(default_factory=list)
    retention_policy: str
    encryption: str
    server_location: str = "Ваш VPS (self-hosted)"


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    timezone: str | None = None
    proactive_enabled: bool | None = None
