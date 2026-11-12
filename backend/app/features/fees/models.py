from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class FeeEntryType(str, enum.Enum):
    payment = "payment"
    refund = "refund"
    expense = "expense"
    reversal = "reversal"


class FeeAgreement(Base):
    __tablename__ = "fee_agreements"
    __table_args__ = (
        Index("ix_fee_agreements_chamber_matter", "chamber_id", "matter_id"),
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
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False
    )
    agreed_amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default="INR"
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )


class FeeLedgerEntry(Base):
    __tablename__ = "fee_ledger_entries"
    __table_args__ = (
        UniqueConstraint(
            "chamber_id", "idempotency_key", name="uq_fee_ledger_chamber_key"
        ),
        Index("ix_fee_ledger_matter_created", "matter_id", "created_at"),
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
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False
    )
    agreement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fee_agreements.id", ondelete="RESTRICT"),
        nullable=False,
    )
    entry_type: Mapped[FeeEntryType] = mapped_column(
        SAEnum(FeeEntryType, name="fee_entry_type"), nullable=False
    )
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False)
    reverses_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fee_ledger_entries.id", ondelete="RESTRICT")
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )
