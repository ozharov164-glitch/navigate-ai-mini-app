"""Конфигурация приложения из переменных окружения."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "НавигаторAI"
    app_env: str = "production"
    debug: bool = False
    secret_key: str = "change-me"
    encryption_key: str = "change-me-32-byte-base64-fernet-key!!"

    bot_token: str = ""
    bot_username: str = "NavigAI_bot"
    webhook_url: str = ""
    webhook_secret: str = ""
    mini_app_url: str = "https://example.com"
    api_base_url: str = "http://localhost:8000"
    allow_private_only: bool = True

    database_url: str = "postgresql+asyncpg://navigai:navigai@localhost:5432/navigai"
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 3600

    cors_origins: str = "https://web.telegram.org"

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    ai_model: str = "deepseek/deepseek-v3.2"
    ai_max_tokens: int = 4096
    ai_cache_ttl: int = 1800
    ai_system_prompt: str = (
        "Ты — НавигаторAI, мощный личный AI-навигатор жизни пользователя. "
        "Проанализируй сообщение (транскрипт голоса + описание фото). "
        "Верни ТОЛЬКО валидный JSON с ключами: tasks, expenses, routes, reminders, "
        "summary, smart_insights. Будь максимально точным и полезным для "
        "российского пользователя 2026 года."
    )

    yandex_maps_api_key: str = ""
    yandex_geocoder_url: str = "https://geocode-maps.yandex.ru/1.x/"
    yandex_router_url: str = "https://api.routing.yandex.net/v2/route"
    yandex_static_map_url: str = "https://static-maps.yandex.ru/1.x/"

    stars_basic_price: int = 199
    stars_premium_price: int = 399
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_return_url: str = ""
    yookassa_basic_price_rub: int = 199
    yookassa_premium_price_rub: int = 399

    free_daily_actions: int = 20
    referral_bonus_days: int = 14

    morning_digest_hour: int = 8
    evening_summary_hour: int = 21
    default_timezone: str = "Europe/Moscow"

    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 20

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
