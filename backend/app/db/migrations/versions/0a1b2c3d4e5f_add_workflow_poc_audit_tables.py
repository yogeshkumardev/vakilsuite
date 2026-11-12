"""Add durable workflow review and idempotency audit records.

Revision ID: 0a1b2c3d4e5f
Revises: ff6f607182a0
Create Date: 2026-10-27 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0a1b2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = "ff6f607182a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workflow_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("workflow_type", sa.String(100), nullable=False),
        sa.Column("graph_version", sa.String(80), nullable=False),
        sa.Column("thread_id", sa.String(160), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("input_manifest_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.Enum("pending_review", "running", "completed", "rejected", "failed", name="workflow_run_status"), nullable=False, server_default="pending_review"),
        sa.Column("result_summary", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_workflow_runs_owner_id", "workflow_runs", ["owner_id"])
    op.create_index("ix_workflow_runs_status", "workflow_runs", ["status"])
    op.create_index("uq_workflow_runs_owner_type_idempotency", "workflow_runs", ["owner_id", "workflow_type", "idempotency_key"], unique=True)
    op.create_index("uq_workflow_runs_thread_id", "workflow_runs", ["thread_id"], unique=True)

    op.create_table(
        "workflow_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", name="workflow_review_status"), nullable=False, server_default="pending"),
        sa.Column("review_summary", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("decided_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_workflow_reviews_run_id", "workflow_reviews", ["run_id"])
    op.create_index("uq_workflow_reviews_run_sequence", "workflow_reviews", ["run_id", "sequence"], unique=True)

    op.create_table(
        "workflow_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation_name", sa.String(100), nullable=False),
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("result_summary", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_workflow_operations_run_id", "workflow_operations", ["run_id"])
    op.create_index("uq_workflow_operations_run_name_input", "workflow_operations", ["run_id", "operation_name", "input_hash"], unique=True)

    op.create_table(
        "workflow_resume_intents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("status", sa.Enum("pending", "processing", "processed", "failed", name="workflow_resume_intent_status"), nullable=False, server_default="pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_workflow_resume_intents_status", "workflow_resume_intents", ["status"])
    op.create_index("uq_workflow_resume_intents_review", "workflow_resume_intents", ["review_id"], unique=True)
    op.create_index("uq_workflow_resume_intents_idempotency", "workflow_resume_intents", ["run_id", "idempotency_key"], unique=True)


def downgrade() -> None:
    op.drop_table("workflow_resume_intents")
    op.drop_table("workflow_operations")
    op.drop_table("workflow_reviews")
    op.drop_table("workflow_runs")
    op.execute("DROP TYPE IF EXISTS workflow_review_status")
    op.execute("DROP TYPE IF EXISTS workflow_resume_intent_status")
    op.execute("DROP TYPE IF EXISTS workflow_run_status")
