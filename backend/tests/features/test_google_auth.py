from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.core.exceptions import AuthInvalidError, ConflictError, ForbiddenError
from app.features.auth import service as module
from app.features.auth.models import AuthDeviceType


@pytest.fixture
def google(monkeypatch):
    monkeypatch.setattr(module.settings, "GOOGLE_CLIENT_ID", "web-client")
    claims = {"sub": "google-sub", "email": "User@Example.com", "email_verified": True, "name": "Test User"}
    verify = Mock(return_value=claims)
    monkeypatch.setattr(module.id_token, "verify_oauth2_token", verify)
    service = module.AuthService(AsyncMock())
    user = SimpleNamespace(id="user", email="user@example.com", provider_id=None, is_active=True)
    service.repo = SimpleNamespace(get_by_provider_id=AsyncMock(return_value=None), get_by_email=AsyncMock(return_value=None), create=AsyncMock(return_value=user))
    service._auth_result = AsyncMock(return_value={"access_token": "access"})
    return service, claims, verify, user


@pytest.mark.asyncio
@pytest.mark.parametrize("device", [AuthDeviceType.web, AuthDeviceType.android])
async def test_google_creates_account_and_preserves_device_metadata(google, device):
    service, _, verify, _ = google
    await service.login_with_google("signed-token", device_type=device, device_id="phone")
    assert verify.call_args.args[2] == "web-client"
    assert service.repo.create.call_args.kwargs["email"] == "user@example.com"
    assert service.repo.create.call_args.kwargs["hashed_password"] is None
    assert service._auth_result.call_args.kwargs["device_type"] == device
    assert service._auth_result.call_args.kwargs["device_id"] == "phone"


@pytest.mark.asyncio
async def test_google_links_existing_account_without_duplicate(google):
    service, _, _, user = google
    service.repo.get_by_email.return_value = user
    await service.login_with_google("signed-token")
    service.repo.create.assert_not_called()
    assert user.provider_id == "google-sub"


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["invalid", "unverified", "inactive", "conflict"])
async def test_google_rejects_unsafe_login(google, failure):
    service, claims, verify, user = google
    service.repo.get_by_email.return_value = user
    expected = AuthInvalidError
    if failure == "invalid":
        verify.side_effect = ValueError("bad signature or audience")
    elif failure == "unverified":
        claims["email_verified"] = False
    elif failure == "inactive":
        user.is_active = False
        expected = ForbiddenError
    else:
        user.provider_id = "another-sub"
        expected = ConflictError
    with pytest.raises(expected):
        await service.login_with_google("token")
    service._auth_result.assert_not_called()
