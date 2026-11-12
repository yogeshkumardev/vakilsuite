"""Add additive chamber/membership foundation without existing-data backfill.

Revision ID: 0c1d2e3f4a5b
Revises: 0b1c2d3e4f5a
Create Date: 2026-10-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0c1d2e3f4a5b"
down_revision: Union[str, Sequence[str], None] = "0b1c2d3e4f5a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chambers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("uq_chambers_slug", "chambers", ["slug"], unique=True)
    op.create_index("ix_chambers_owner_user_id", "chambers", ["owner_user_id"])
    op.create_table(
        "chamber_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("role", sa.Enum("owner", "admin", "staff", "reviewer", name="chamber_role"), nullable=False),
        sa.Column("status", sa.Enum("active", "revoked", name="membership_status"), nullable=False, server_default="active"),
        sa.Column("joined_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("uq_chamber_memberships_chamber_user", "chamber_memberships", ["chamber_id", "user_id"], unique=True)
    op.create_index("ix_chamber_memberships_user_status", "chamber_memberships", ["user_id", "status"])


def downgrade() -> None:
    op.drop_table("chamber_memberships")
    op.drop_table("chambers")
    op.execute("DROP TYPE IF EXISTS membership_status")
    op.execute("DROP TYPE IF EXISTS chamber_role")
