"""Add immutable minimal chamber audit events.

Revision ID: 0f1a2b3c4d5e
Revises: 0e1f2a3b4c5d
Create Date: 2026-10-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0f1a2b3c4d5e"
down_revision: Union[str, Sequence[str], None] = "0e1f2a3b4c5d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chamber_audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("event_type", sa.Enum(
            "chamber.created",
            "membership.added",
            "membership.role_changed",
            "membership.revoked",
            "case_access.granted",
            "case_access.revoked",
            "case.archived",
            "case.soft_deleted",
            name="chamber_audit_event_type",
        ), nullable=False),
        sa.Column("resource_type", sa.String(40), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("occurred_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_chamber_audit_events_chamber_occurred", "chamber_audit_events", ["chamber_id", "occurred_at"])
    op.create_index("ix_chamber_audit_events_resource", "chamber_audit_events", ["resource_type", "resource_id"])
    op.create_index("ix_chamber_audit_events_actor_occurred", "chamber_audit_events", ["actor_user_id", "occurred_at"])


def downgrade() -> None:
    op.drop_table("chamber_audit_events")
    op.execute("DROP TYPE IF EXISTS chamber_audit_event_type")
