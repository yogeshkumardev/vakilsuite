"""Add immutable chamber provider-policy versions.

Revision ID: 1a2b3c4d5e6f
Revises: 0f1a2b3c4d5e
Create Date: 2026-10-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "0f1a2b3c4d5e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chamber_provider_policy_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("policy_json", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("previous_policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chamber_provider_policy_versions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "uq_chamber_provider_policy_versions_active",
        "chamber_provider_policy_versions",
        ["chamber_id"],
        unique=True,
        postgresql_where=sa.text("is_active"),
    )
    op.create_index(
        "uq_chamber_provider_policy_versions_chamber_version",
        "chamber_provider_policy_versions",
        ["chamber_id", "version"],
        unique=True,
    )
    op.create_index(
        "ix_chamber_provider_policy_versions_chamber_created",
        "chamber_provider_policy_versions",
        ["chamber_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_table("chamber_provider_policy_versions")
