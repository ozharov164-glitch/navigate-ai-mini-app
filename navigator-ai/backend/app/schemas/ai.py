"""Схемы для AI-анализа DeepSeek."""
from datetime import datetime

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


class AIReminderItem(BaseModel):
    title: str
    remind_at: datetime


class AIAnalysisResponse(BaseModel):
    tasks: list[AITaskItem] = Field(default_factory=list)
    expenses: list[AIExpenseItem] = Field(default_factory=list)
    reminders: list[AIReminderItem] = Field(default_factory=list)
    summary: str = ""
    smart_insights: list[str] = Field(default_factory=list)
