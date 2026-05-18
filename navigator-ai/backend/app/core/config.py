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
    bot_owner_telegram_id: int = 7595981350
    webhook_url: str = ""
    webhook_secret: str = ""
    mini_app_url: str = "https://ozharov164-glitch.github.io/navigate-ai-mini-app/"
    api_base_url: str = "http://localhost:8000"
    allow_private_only: bool = True

    database_url: str = "postgresql+asyncpg://navigai:navigai@localhost:5432/navigai"
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 3600

    cors_origins: str = (
        "https://ozharov164-glitch.github.io,"
        "https://web.telegram.org"
    )

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    ai_model: str = "deepseek/deepseek-v3.2"
    ai_max_tokens: int = 2048
    ai_cache_ttl: int = 3600
    ai_json_retries: int = 2
    ai_json_retries_premium: int = 1
    ai_budget_mode: bool = True
    ai_worker_evening_llm: bool = False
    ai_vision_max_tokens: int = 800
    ai_transcribe_max_tokens: int = 512
    ai_system_prompt: str = (
        "Ты — НавигаторAI, тихий премиальный личный AI-оператор повседневной жизни. "
        "Отвечай ТОЛЬКО валидным JSON без markdown. "
        'Схема: {"tasks":[{"title":"str","description":"str|null","due_date":"ISO8601 UTC|null",'
        '"priority":"low|medium|high"}],"expenses":[{"amount":number,"category":"str",'
        '"merchant":"str|null","description":"str|null","currency":"RUB"}],'
        '"reminders":[{"title":"str","remind_at":"ISO8601 UTC"}],'
        '"summary":"краткий итог на русском","smart_insights":["строка"]}. '
        "Все даты в UTC. Если данных мало — пустые массивы и понятный summary."
    )

    whisper_enabled: bool = False
    whisper_url: str = "http://whisper:8000"
    whisper_model: str = "small"

    premium_only_multimedia: bool = True

    stars_basic_price: int = 199
    stars_premium_price: int = 399
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_return_url: str = ""
    yookassa_basic_price_rub: int = 199
    yookassa_premium_price_rub: int = 399

    free_daily_actions: int = 10
    premium_daily_actions: int = 50
    referral_bonus_days: int = 14
    referral_referred_bonus_days: int = 7

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
