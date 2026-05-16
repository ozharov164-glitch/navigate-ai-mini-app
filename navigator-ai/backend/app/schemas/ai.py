"""Схемы для AI-анализа DeepSeek."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AITaskItem(BaseModel):
    title: str
    description: str | None = None
    due_date: datetime | None = None
    priority: str = "medium"


class AIExpenseItem(BaseModel):
    amount: float
    category: str
    merchant: str | None = None
    description: str | None = None
    currency: str = "RUB"


class AIRouteItem(BaseModel):
    from_address: str
    to_address: str
    transport_mode: str = "auto"  # auto, transit, pedestrian


class AIReminderItem(BaseModel):
    title: str
    remind_at: datetime


class AIAnalysisRequest(BaseModel):
    user_id: int
    text: str | None = None
    voice_transcript: str | None = None
    photo_description: str | None = None
    photo_base64: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    user_places: list[dict[str, Any]] = Field(default_factory=list)
    template: str | None = None  # receipt, day_plan, week_analysis


class AIAnalysisResponse(BaseModel):
    tasks: list[AITaskItem] = Field(default_factory=list)
    expenses: list[AIExpenseItem] = Field(default_factory=list)
    routes: list[AIRouteItem] = Field(default_factory=list)
    reminders: list[AIReminderItem] = Field(default_factory=list)
    summary: str = ""
    smart_insights: list[str] = Field(default_factory=list)
