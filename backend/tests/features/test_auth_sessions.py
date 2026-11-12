from app.core.security import create_session_refresh_token, hash_refresh_token
from app.features.auth.models import AuthDeviceType
from app.features.auth.schemas import LoginRequest, RefreshTokenResponse
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError
from starlette.requests import Request
from redis.exceptions import ConnectionError as RedisConnectionError

from app.core.dependencies import get_current_user
from app.core.exceptions import AuthInvalidError, AppError, ForbiddenError
from app.core.security import create_access_token, decode_access_token
from app.features.auth.schemas import RegisterRequest
from app.features.auth import guards


def test_refresh_token_hash_is_stable_and_does_not_store_raw_token():
    token = create_session_refresh_token()

    first_hash = hash_refresh_token(token)
    second_hash = hash_refresh_token(token)

    assert first_hash == second_hash
    assert first_hash != token
    assert len(first_hash) == 64


def test_login_request_accepts_android_device_metadata():
    request = LoginRequest(
        email="Lawyer@Example.com",
        password="password123",
        device_type="android",
        device_name=" Pixel 7 ",
        device_id=" device-123 ",
    )

    assert request.device_type == AuthDeviceType.android
    assert request.device_name == "Pixel 7"
    assert request.device_id == "device-123"


def test_refresh_response_includes_rotated_refresh_token_and_session_id():
    payload = RefreshTokenResponse(
        access_token="access",
        refresh_token="refresh",
        session_id="00000000-0000-0000-0000-000000000001",
    )

    assert payload.token_type == "bearer"
    assert payload.refresh_token == "refresh"
    assert str(payload.session_id) == "00000000-0000-0000-0000-000000000001"


@pytest.mark.parametrize("password", ["short", "x" * 129, "\u0905" * 129])
def test_registration_rejects_short_or_excessively_long_passwords(password):
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@example.com", full_name="Advocate", password=password)


def test_registration_rejects_blank_name_and_cannot_assign_admin():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@example.com", full_name="   ", password="password123")
    body = RegisterRequest(
        email="a@example.com",
        full_name="Advocate",
        password="a secure password",
        role="admin",
    )
    assert "role" not in body.model_dump()


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["revoked", "expired", "wrong_owner", "missing"])
async def test_access_token_requires_active_owned_session(kind):
    user_id, session_id = uuid.uuid4(), uuid.uuid4()
    token = create_access_token(user_id, "lawyer", session_id)
    assert decode_access_token(token)["sid"] == str(session_id)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session = SimpleNamespace(
        user_id=user_id, revoked_at=None, expires_at=now + timedelta(days=1)
    )
    if kind == "revoked":
        session.revoked_at = now
    elif kind == "expired":
        session.expires_at = now - timedelta(seconds=1)
    elif kind == "wrong_owner":
        session.user_id = uuid.uuid4()
    else:
        session = None
    db = AsyncMock()
    db.get.return_value = session
    with pytest.raises(AuthInvalidError):
        await get_current_user(
            authorization=f"Bearer {token}", access_token=None, db=db
        )


@pytest.mark.asyncio
async def test_legacy_access_token_without_session_is_rejected():
    token = create_access_token(uuid.uuid4(), "lawyer")
    with pytest.raises(AuthInvalidError):
        await get_current_user(
            authorization=f"Bearer {token}", access_token=None, db=AsyncMock()
        )


@pytest.mark.asyncio
async def test_auth_throttle_and_origin_check(monkeypatch):
    class UnavailableRedis:
        def pipeline(self, **kwargs):
            raise RedisConnectionError()

    monkeypatch.setattr(guards, "_redis", UnavailableRedis())
    monkeypatch.setattr(guards, "_fallback", {})
    monkeypatch.setattr(guards.settings, "APP_ENV", "development")
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/login",
            "headers": [],
            "client": ("127.0.0.1", 1234),
            "scheme": "http",
            "server": ("test", 80),
            "query_string": b"",
        }
    )
    for _ in range(30):
        await guards.guard_auth_request(request)
    with pytest.raises(AppError) as caught:
        await guards.guard_auth_request(request)
    assert caught.value.status_code == 429
    request.scope["headers"] = [(b"origin", b"https://untrusted.example")]
    # Recreate the request to avoid Starlette's cached header view.
    with pytest.raises(ForbiddenError):
        await guards.guard_auth_request(Request(request.scope))
