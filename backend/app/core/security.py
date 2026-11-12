import uuid
import logging
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Password Hashing (Hardened)
# ─────────────────────────────────────────────────────────────
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    argon2__type="ID", argon2__memory_cost=19456, argon2__time_cost=2,
    argon2__parallelism=1, bcrypt__rounds=12, deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        logger.warning("Password verification failed")
        return False


def verify_password_and_upgrade(plain: str, hashed: str) -> tuple[bool, str | None]:
    """Verify legacy bcrypt and return an Argon2id replacement when needed."""
    try:
        return pwd_context.verify_and_update(plain, hashed)
    except Exception:
        logger.warning("Password verification failed")
        return False, None


# ─────────────────────────────────────────────────────────────
# JWT Helpers
# ─────────────────────────────────────────────────────────────
def _base_payload(user_id: uuid.UUID) -> dict[str, Any]:
    return {
        "sub": str(user_id),
        "iss": "vakilsuite",
        "aud": "vakilsuite-users",
        "jti": str(uuid.uuid4()),
    }


def create_access_token(
    user_id: uuid.UUID, role: str, session_id: uuid.UUID | None = None
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        **_base_payload(user_id),
        "role": role,
        "exp": expire,
        "type": "access",
        "sid": str(session_id) if session_id else None,
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    payload = {
        **_base_payload(user_id),
        "exp": expire,
        "type": "refresh",
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def refresh_token_expires_at() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )


def create_session_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# Token Decoding (Hardened)
# ─────────────────────────────────────────────────────────────
def _decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience="vakilsuite-users",
            issuer="vakilsuite",
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode failed: {str(e)}")
        return None


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    payload = _decode_token(token)
    if not payload:
        return None

    if payload.get("type") != "access":
        logger.warning("Invalid token type for access token")
        return None

    return payload


def decode_refresh_token(token: str) -> Optional[dict[str, Any]]:
    payload = _decode_token(token)
    if not payload:
        return None

    if payload.get("type") != "refresh":
        logger.warning("Invalid token type for refresh token")
        return None

    return payload


# Session ownership, expiry, and revocation are enforced by get_current_user.
