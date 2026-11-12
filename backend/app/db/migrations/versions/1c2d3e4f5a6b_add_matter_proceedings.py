"""Add proceedings below the stable legacy-case matter UUID.

Revision ID: 1c2d3e4f5a6b
Revises: 1b2c3d4e5f6a
Create Date: 2026-10-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "1c2d3e4f5a6b"
down_revision: Union[str, Sequence[str], None] = "1b2c3d4e5f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    status = postgresql.ENUM("active", "stayed", "disposed", name="proceeding_status")
    op.create_table(
        "proceedings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("court_name", sa.String(length=255), nullable=True),
        sa.Column("status", status, nullable=False, server_default="active"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_proceedings_chamber_matter", "proceedings", ["chamber_id", "matter_id"])


def downgrade() -> None:
    op.drop_table("proceedings")
    postgresql.ENUM(name="proceeding_status").drop(op.get_bind(), checkfirst=True)
