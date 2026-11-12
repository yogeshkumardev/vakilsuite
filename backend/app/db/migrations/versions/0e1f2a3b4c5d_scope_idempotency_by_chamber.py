"""Scope job and workflow idempotency keys by chamber.

Revision ID: 0e1f2a3b4c5d
Revises: 0d1e2f3a4b5c
Create Date: 2026-10-28 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0e1f2a3b4c5d"
down_revision: Union[str, Sequence[str], None] = "0d1e2f3a4b5c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_jobs_owner_type_idempotency", table_name="jobs")
    op.create_index(
        "uq_jobs_chamber_owner_type_idempotency",
        "jobs",
        ["chamber_id", "owner_id", "job_type", "idempotency_key"],
        unique=True,
    )
    op.drop_index("uq_workflow_runs_owner_type_idempotency", table_name="workflow_runs")
    op.create_index(
        "uq_workflow_runs_chamber_owner_type_idempotency",
        "workflow_runs",
        ["chamber_id", "owner_id", "workflow_type", "idempotency_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_workflow_runs_chamber_owner_type_idempotency", table_name="workflow_runs")
    op.create_index(
        "uq_workflow_runs_owner_type_idempotency",
        "workflow_runs",
        ["owner_id", "workflow_type", "idempotency_key"],
        unique=True,
    )
    op.drop_index("uq_jobs_chamber_owner_type_idempotency", table_name="jobs")
    op.create_index(
        "uq_jobs_owner_type_idempotency",
        "jobs",
        ["owner_id", "job_type", "idempotency_key"],
        unique=True,
    )
