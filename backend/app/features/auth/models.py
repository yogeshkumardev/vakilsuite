import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class AuthDeviceType(str, enum.Enum):
    web = "web"
    android = "android"
    ios = "ios"
    unknown = "unknown"


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    __table_args__ = (
        Index("ix_auth_sessions_user_id", "user_id"),
        Index("ix_auth_sessions_refresh_token_hash", "refresh_token_hash"),
        Index("ix_auth_sessions_device_id", "device_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    device_type: Mapped[AuthDeviceType] = mapped_column(
        SAEnum(AuthDeviceType, name="auth_device_type"),
        nullable=False,
        default=AuthDeviceType.unknown,
        server_default=AuthDeviceType.unknown.value,
    )
    device_name: Mapped[str | None] = mapped_column(String(255))
    device_id: Mapped[str | None] = mapped_column(String(255))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    ip_address: Mapped[str | None] = mapped_column(String(64))
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now()
    )


class AuthChallenge(Base):
    __tablename__ = "auth_challenges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    purpose: Mapped[str] = mapped_column(String(30))
    code_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime())
    used_at: Mapped[datetime | None] = mapped_column(DateTime())
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now())


class AuthEmailOutbox(Base):
    """Committed delivery intent. Celery receives only this UUID, never an OTP."""
    __tablename__ = "auth_email_outbox"
    __table_args__ = (Index("ix_auth_email_outbox_pending", "status", "next_attempt_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("auth_challenges.id", ondelete="CASCADE"), nullable=False, unique=True)
    purpose: Mapped[str] = mapped_column(String(30), nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_payload: Mapped[str] = mapped_column(Text(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now())
    provider_message_id: Mapped[str | None] = mapped_column(String(255))
    last_error_code: Mapped[str | None] = mapped_column(String(80))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime())
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now())
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime())


class SpentRefreshToken(Base):
    __tablename__ = "auth_spent_refresh_tokens"
    __table_args__ = (Index("ix_auth_spent_refresh_hash", "token_hash", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("auth_sessions.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now())


class AuthWebhookEvent(Base):
    __tablename__ = "auth_webhook_events"
    event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now())
