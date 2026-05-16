"""Шифрование чувствительных данных и валидация Telegram initData."""
import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qsl

from cryptography.fernet import Fernet
from jose import jwt

from backend.app.core.config import get_settings

settings = get_settings()


def _fernet() -> Fernet:
    key = settings.encryption_key.encode()
    if len(key) != 44:
        key = base64.urlsafe_b64encode(hashlib.sha256(key).digest())
    return Fernet(key)


def encrypt_sensitive(value: str) -> str:
    """Шифрует чувствительные поля (адреса, суммы в vault)."""
    return _fernet().encrypt(value.encode()).decode()


def decrypt_sensitive(value: str) -> str:
    return _fernet().decrypt(value.encode()).decode()


def validate_telegram_init_data(init_data: str, bot_token: str | None = None) -> dict[str, Any] | None:
    """Проверка подписи Telegram WebApp initData."""
    token = bot_token or settings.bot_token
    if not init_data or not token:
        return None

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    data_check = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated, received_hash):
        return None

    auth_date = int(parsed.get("auth_date", 0))
    if datetime.now(timezone.utc).timestamp() - auth_date > 86400:
        return None

    user_raw = parsed.get("user")
    if user_raw:
        parsed["user"] = json.loads(user_raw)
    return parsed


def create_access_token(user_id: int, expires_hours: int = 24) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=expires_hours),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return int(payload.get("sub", 0))
    except Exception:
        return None
