"""Тесты парсинга AI JSON."""
import json

from backend.app.schemas.ai import AIAnalysisResponse
from backend.app.services.ai_service import _extract_json, _safe_analysis


def test_extract_json_from_markdown():
    raw = '```json\n{"summary": "ok", "tasks": [], "expenses": [], "reminders": [], "smart_insights": []}\n```'
    data = _extract_json(raw)
    assert data["summary"] == "ok"


def test_safe_analysis_valid():
    parsed = {
        "tasks": [{"title": "Купить молоко", "priority": "medium"}],
        "expenses": [],
        "reminders": [],
        "summary": "Добавлена задача",
        "smart_insights": ["tip"],
    }
    result = _safe_analysis(parsed)
    assert isinstance(result, AIAnalysisResponse)
    assert len(result.tasks) == 1


def test_safe_analysis_partial_invalid():
    parsed = {"summary": "частично", "tasks": [{"bad": True}]}
    result = _safe_analysis(parsed, fallback_summary="fallback")
    assert result.summary in ("частично", "fallback", "Сообщение обработано")
