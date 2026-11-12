import hashlib
import hmac
import base64
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool
from cryptography.fernet import Fernet

from app.core.config import settings
from app.core.exceptions import ValidationError
from app.core.security import hash_password
from app.features.auth.email import require_email_delivery, send_auth_code
from app.features.auth.models import AuthChallenge, AuthEmailOutbox
from app.features.auth.service import AuthService
from app.features.users.models import User
from app.features.users.repository import UserRepository

logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def code_digest(challenge_id: uuid.UUID, code: str, purpose: str) -> str:
    return hmac.new(
        (settings.AUTH_CODE_PEPPER or settings.SECRET_KEY).encode(), f"{challenge_id}:{purpose}:{code}".encode(), hashlib.sha256
    ).hexdigest()


def flow_token(challenge_id: uuid.UUID, purpose: str) -> str:
    value = f"{challenge_id}.{purpose}"
    signature = hmac.new((settings.AUTH_CODE_PEPPER or settings.SECRET_KEY).encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{signature}"


def parse_flow(token: str, purpose: str) -> uuid.UUID:
    try:
        raw_id, flow_purpose, signature = token.split(".", 2)
        expected = hmac.new((settings.AUTH_CODE_PEPPER or settings.SECRET_KEY).encode(), f"{raw_id}.{flow_purpose}".encode(), hashlib.sha256).hexdigest()
        if flow_purpose != purpose or not hmac.compare_digest(signature, expected):
            raise ValueError
        return uuid.UUID(raw_id)
    except (ValueError, AttributeError):
        raise ValidationError("Code is invalid or expired. Request a new code.")


def _cipher() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256((settings.AUTH_CODE_PEPPER or settings.SECRET_KEY).encode() + b":auth-outbox").digest())
    return Fernet(key)


class RecoveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def issue(self, email: str, purpose: str, *, expose_flow: bool = False):
        require_email_delivery()
        user = await self.repo.get_by_email(email)
        if not user or not user.is_active or (purpose == "password_reset" and not user.hashed_password):
            return None
        # Serialize issuance per account so only the most recent code is valid.
        await self.db.execute(
            select(User.id).where(User.id == user.id).with_for_update()
        )
        now = utcnow()
        recent = await self.db.scalar(
            select(AuthChallenge)
            .where(
                AuthChallenge.user_id == user.id,
                AuthChallenge.purpose == purpose,
                AuthChallenge.created_at > now - timedelta(seconds=settings.AUTH_RESEND_COOLDOWN_SECONDS),
            )
            .limit(1)
        )
        if recent:
            return flow_token(recent.id, purpose) if expose_flow else None
        await self.db.execute(
            update(AuthChallenge)
            .where(
                AuthChallenge.user_id == user.id,
                AuthChallenge.purpose == purpose,
                AuthChallenge.used_at.is_(None),
            )
            .values(used_at=now)
        )
        challenge_id = uuid.uuid4()
        code = f"{secrets.randbelow(100_000_000):08d}"
        challenge = AuthChallenge(
            id=challenge_id,
            user_id=user.id,
            purpose=purpose,
            code_hash=code_digest(challenge_id, code, purpose),
            attempts=0,
            created_at=now,
            expires_at=now + timedelta(minutes=settings.AUTH_VERIFICATION_TTL_MINUTES),
        )
        outbox = AuthEmailOutbox(
            user_id=user.id, challenge_id=challenge_id, purpose=purpose,
            recipient_email=user.email,
            encrypted_payload=_cipher().encrypt(json.dumps({"code": code}).encode()).decode(),
            next_attempt_at=now,
        )
        self.db.add_all([challenge, outbox])
        await self.db.commit()
        try:
            # The committed intent owns retry identity; callers never queue OTPs.
            await send_auth_code(user.email, code, purpose, idempotency_key=f"auth-email/{outbox.id}")
            outbox.status = "accepted"
            outbox.accepted_at = utcnow()
            outbox.encrypted_payload = ""
            await self.db.commit()
        except Exception:
            # Neither codes nor email addresses belong in logs. Preserve a generic
            # public response for existing and non-existing accounts alike.
            logger.error("Authentication email delivery failed")
            # Do not burn a possibly delivered code on an uncertain provider
            # response. A worker/reconciler can safely retry this intent using
            # the same Resend idempotency key.
            outbox.status = "pending"
            outbox.last_error_code = "DELIVERY_RETRY_REQUIRED"
            outbox.next_attempt_at = utcnow() + timedelta(seconds=60)
            await self.db.commit()
        return flow_token(challenge_id, purpose) if expose_flow else None

    async def deliver_outbox(self, outbox_id: uuid.UUID) -> None:
        outbox = await self.db.get(AuthEmailOutbox, outbox_id, with_for_update=True)
        if not outbox or outbox.status == "accepted":
            return
        challenge = await self.db.get(AuthChallenge, outbox.challenge_id)
        if not challenge or challenge.used_at or challenge.expires_at <= utcnow():
            if outbox:
                outbox.status = "expired"
                await self.db.commit()
            return
        try:
            code = json.loads(_cipher().decrypt(outbox.encrypted_payload.encode()).decode())["code"]
            message_id = await send_auth_code(outbox.recipient_email, code, outbox.purpose, idempotency_key=f"auth-email/{outbox.id}")
            outbox.status, outbox.provider_message_id, outbox.accepted_at = "accepted", message_id, utcnow()
            outbox.encrypted_payload = ""
        except Exception:
            outbox.status = "pending"
            outbox.next_attempt_at = utcnow() + timedelta(seconds=60)
        await self.db.commit()

    async def consume(self, email: str, code: str, purpose: str, *, flow: str | None = None):
        user = await self.repo.get_by_email(email)
        invalid = ValidationError("Code is invalid or expired. Request a new code.")
        if not user or not user.is_active:
            raise invalid
        await self.db.execute(
            select(User.id).where(User.id == user.id).with_for_update()
        )
        query = (
            select(AuthChallenge)
            .where(
                AuthChallenge.user_id == user.id,
                AuthChallenge.purpose == purpose,
                AuthChallenge.used_at.is_(None),
            )
            .order_by(AuthChallenge.created_at.desc())
            .limit(1)
            .with_for_update()
        )
        if flow:
            query = query.where(AuthChallenge.id == parse_flow(flow, purpose))
        challenge = await self.db.scalar(query)
        if not challenge or challenge.expires_at <= utcnow() or challenge.attempts >= 5:
            raise invalid
        if not hmac.compare_digest(
            challenge.code_hash, code_digest(challenge.id, code, purpose)
        ):
            challenge.attempts += 1
            await self.db.commit()
            raise invalid
        challenge.used_at = utcnow()
        return user

    async def reset_password(self, email: str, code: str, password: str):
        user = await self.consume(email, code, "password_reset")
        await self.repo.update_password(
            user, await run_in_threadpool(hash_password, password)
        )
        await AuthService(self.db).logout_all(user.id)

    async def verify_email(self, flow: str, code: str):
        challenge_id = parse_flow(flow, "email_verification")
        challenge = await self.db.get(AuthChallenge, challenge_id)
        invalid = ValidationError("Code is invalid or expired. Request a new code.")
        if not challenge:
            raise invalid
        user = await self.consume((await self.repo.get_by_id(challenge.user_id)).email, code, "email_verification", flow=flow)
        user.is_email_verified = True
        user.email_verified_at = utcnow()
        await self.db.execute(update(AuthChallenge).where(AuthChallenge.user_id == user.id, AuthChallenge.purpose == "email_verification", AuthChallenge.used_at.is_(None)).values(used_at=utcnow()))
        from app.features.chambers.service import provision_personal_chamber
        await provision_personal_chamber(self.db, user=user)
        await self.db.commit()
