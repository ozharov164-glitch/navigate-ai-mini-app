"""Pytest fixtures."""
import os

import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("FREE_DAILY_ACTIONS", "10")
os.environ.setdefault("PREMIUM_DAILY_ACTIONS", "50")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ENCRYPTION_KEY", "7O+lAAgOSEojxUi86hHzLlDEZQn2PuGvlEJQwMqxy/M=")
os.environ.setdefault("BOT_TOKEN", "123456:TEST")
os.environ.setdefault("WEBHOOK_SECRET", "test-webhook-secret")
os.environ.setdefault("OPENROUTER_API_KEY", "")


@pytest.fixture
async def db_tables():
    import backend.app.models.content  # noqa: F401
    import backend.app.models.user  # noqa: F401
    from backend.app.core.database import Base, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture
async def client(db_tables):
    from backend.app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
