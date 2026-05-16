"""FastAPI — НавигаторAI Backend."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.routes import bot_internal, dashboard, export, payments
from backend.app.core.config import get_settings
from backend.app.core.logging_config import setup_logging
from backend.app.core.rate_limit import RateLimitMiddleware
from backend.app.core.redis_client import get_redis
from backend.app.core.security import validate_encryption_key

settings = get_settings()
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_encryption_key()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    await get_redis()
    logger.info("НавигаторAI backend запущен env=%s", settings.app_env)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.debug else None,
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(bot_internal.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled error path=%s",
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(status_code=500, content={"detail": "Внутренняя ошибка сервера"})
