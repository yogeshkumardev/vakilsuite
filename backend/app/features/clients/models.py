from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ClientCaseRole(str, enum.Enum):
    client = "client"
    co_client = "co_client"
    representative = "representative"
    billing_contact = "billing_contact"


class Client(Base):
    """A contact identity within a chamber; similar names are intentionally valid."""

    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_clients_chamber_normalized_name", "chamber_id", "normalized_name"),
        Index("ix_clients_chamber_phone", "chamber_id", "phone"),
        Index("ix_clients_chamber_email", "chamber_id", "email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    # This is search assistance only. It is deliberately not unique: matching
    # names must never silently merge two legal client identities.
    normalized_name: Mapped[str] = mapped_column(String(300), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), nullable=False, default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(), nullable=False, default=func.now(), onupdate=func.now(), server_default=func.now()
    )


class ClientCaseLink(Base):
    """A client can be linked to multiple cases and a case to multiple clients."""

    __tablename__ = "client_case_links"
    __table_args__ = (
        UniqueConstraint("client_id", "case_id", name="uq_client_case_links_client_case"),
        Index("ix_client_case_links_case_id", "case_id"),
        Index("ix_client_case_links_client_id", "client_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[ClientCaseRole] = mapped_column(
        SAEnum(ClientCaseRole, name="client_case_role"),
        nullable=False,
        default=ClientCaseRole.client,
        server_default=ClientCaseRole.client.value,
    )
    linked_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(), nullable=False, default=func.now(), server_default=func.now()
    )
    client: Mapped[Client] = relationship("Client")
