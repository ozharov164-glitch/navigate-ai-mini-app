# Multi-stage Dockerfile для НавигаторAI
FROM python:3.12-slim AS python-base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY bot ./bot
COPY alembic.ini .
COPY alembic ./alembic

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# --- Backend + Worker ---
FROM python-base AS backend
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# --- Telegram Bot ---
FROM python-base AS bot
CMD ["python", "-m", "bot.main"]
