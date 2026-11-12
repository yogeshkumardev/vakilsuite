from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class ChamberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    staff = "staff"
    reviewer = "reviewer"


class MembershipStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"


class Chamber(Base):
    __tablename__ = "chambers"
    __table_args__ = (
        Index("uq_chambers_slug", "slug", unique=True),
        Index("ix_chambers_owner_user_id", "owner_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now()
    )


class ChamberMembership(Base):
    __tablename__ = "chamber_memberships"
    __table_args__ = (
        Index("uq_chamber_memberships_chamber_user", "chamber_id", "user_id", unique=True),
        Index("ix_chamber_memberships_user_status", "user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    role: Mapped[ChamberRole] = mapped_column(
        SAEnum(ChamberRole, name="chamber_role"), nullable=False
    )
    status: Mapped[MembershipStatus] = mapped_column(
        SAEnum(MembershipStatus, name="membership_status"),
        nullable=False,
        default=MembershipStatus.active,
        server_default=MembershipStatus.active.value,
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now()
    )
