"""Тесты безопасности."""
import pytest

from backend.app.core.security import decrypt_sensitive, encrypt_sensitive, validate_telegram_init_data


def test_encrypt_decrypt_roundtrip():
    plain = "ул. Ленина, 10"
    enc = encrypt_sensitive(plain)
    assert decrypt_sensitive(enc) == plain


def test_validate_init_data_invalid():
    assert validate_telegram_init_data("") is None
    assert validate_telegram_init_data("user=%7B%22id%22%3A1%7D&hash=bad") is None


@pytest.mark.anyio
async def test_bot_internal_requires_secret(client):
    r = await client.post(
        "/api/internal/bot/ensure-user",
        json={"telegram_id": 999},
        headers={"X-Bot-Secret": "wrong"},
    )
    assert r.status_code == 403


@pytest.mark.anyio
async def test_bot_internal_with_secret(client):
    r = await client.post(
        "/api/internal/bot/ensure-user",
        json={"telegram_id": 999001},
        headers={"X-Bot-Secret": "test-webhook-secret"},
    )
    assert r.status_code == 200
    assert "referral_code" in r.json()
