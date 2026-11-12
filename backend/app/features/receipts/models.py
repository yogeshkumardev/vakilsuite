from __future__ import annotations
import enum
import uuid
from datetime import datetime
from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.base import Base


class CustodyKind(str, enum.Enum):
    original = "original"
    copy = "copy"


class MatterCustodyItem(Base):
    __tablename__ = "matter_custody_items"
    __table_args__ = (
        Index("ix_matter_custody_items_chamber_matter", "chamber_id", "matter_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chambers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    matter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    kind: Mapped[CustodyKind] = mapped_column(
        SAEnum(CustodyKind, name="custody_kind"), nullable=False
    )
    physical_location: Mapped[str] = mapped_column(String(300), nullable=False)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )
