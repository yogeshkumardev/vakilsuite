import base64
import hashlib
import hmac

from app.core.security import hash_password, pwd_context, verify_password_and_upgrade
from app.features.auth import webhooks


def test_new_passwords_use_argon2id():
    assert pwd_context.identify(hash_password("a long secure password")) == "argon2"


def test_successful_bcrypt_login_returns_argon2_upgrade():
    old_hash = pwd_context.handler("bcrypt").hash("a long secure password")
    valid, replacement = verify_password_and_upgrade("a long secure password", old_hash)
    assert valid and replacement
    assert pwd_context.identify(replacement) == "argon2"


def test_resend_signature_verification_rejects_tampering(monkeypatch):
    secret = base64.b64encode(b"a" * 32).decode()
    monkeypatch.setattr(webhooks.settings, "RESEND_WEBHOOK_SECRET", f"whsec_{secret}")
    raw, event_id, timestamp = b'{"type":"email.delivered"}', "evt_1", "1700000000"
    signature = base64.b64encode(hmac.new(b"a" * 32, f"{event_id}.{timestamp}.".encode() + raw, hashlib.sha256).digest()).decode()
    assert webhooks._verify_signature(raw, event_id, timestamp, f"v1,{signature}")
    assert not webhooks._verify_signature(raw + b"x", event_id, timestamp, f"v1,{signature}")
