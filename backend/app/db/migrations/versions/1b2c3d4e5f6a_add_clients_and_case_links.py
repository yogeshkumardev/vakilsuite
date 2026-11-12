"""Add chamber-scoped clients and transitional case links.

Revision ID: 1b2c3d4e5f6a
Revises: 1a2b3c4d5e6f
Create Date: 2026-10-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "1b2c3d4e5f6a"
down_revision: Union[str, Sequence[str], None] = "1a2b3c4d5e6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    client_case_role = postgresql.ENUM(
        "client", "co_client", "representative", "billing_contact", name="client_case_role"
    )
    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("full_name", sa.String(length=300), nullable=False),
        sa.Column("normalized_name", sa.String(length=300), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_clients_chamber_normalized_name", "clients", ["chamber_id", "normalized_name"])
    op.create_index("ix_clients_chamber_phone", "clients", ["chamber_id", "phone"])
    op.create_index("ix_clients_chamber_email", "clients", ["chamber_id", "email"])
    op.create_table(
        "client_case_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", client_case_role, nullable=False, server_default="client"),
        sa.Column("linked_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("linked_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("client_id", "case_id", name="uq_client_case_links_client_case"),
    )
    op.create_index("ix_client_case_links_case_id", "client_case_links", ["case_id"])
    op.create_index("ix_client_case_links_client_id", "client_case_links", ["client_id"])


def downgrade() -> None:
    op.drop_table("client_case_links")
    op.drop_table("clients")
    postgresql.ENUM(name="client_case_role").drop(op.get_bind(), checkfirst=True)
