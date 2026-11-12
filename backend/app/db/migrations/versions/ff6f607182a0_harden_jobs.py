"""Harden job idempotency and worker leases.

Revision ID: ff6f607182a0
Revises: fe5f607182a0
Create Date: 2026-09-30 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ff6f607182a0"
down_revision: Union[str, Sequence[str], None] = "fe5f607182a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("idempotency_key", sa.String(128), nullable=True))
    op.add_column("jobs", sa.Column("leased_until", sa.DateTime(), nullable=True))
    op.create_index(
        "uq_jobs_owner_type_idempotency",
        "jobs",
        ["owner_id", "job_type", "idempotency_key"],
        unique=True,
    )
    op.create_index(
        "uq_jobs_celery_task_id", "jobs", ["celery_task_id"], unique=True
    )
    op.create_check_constraint(
        "ck_jobs_attempt_count_nonnegative", "jobs", "attempt_count >= 0"
    )
    op.create_check_constraint(
        "ck_jobs_max_attempts_positive", "jobs", "max_attempts > 0"
    )
    op.create_check_constraint(
        "ck_jobs_attempt_within_limit", "jobs", "attempt_count <= max_attempts"
    )


def downgrade() -> None:
    op.drop_constraint("ck_jobs_attempt_within_limit", "jobs", type_="check")
    op.drop_constraint("ck_jobs_max_attempts_positive", "jobs", type_="check")
    op.drop_constraint("ck_jobs_attempt_count_nonnegative", "jobs", type_="check")
    op.drop_index("uq_jobs_celery_task_id", table_name="jobs")
    op.drop_index("uq_jobs_owner_type_idempotency", table_name="jobs")
    op.drop_column("jobs", "leased_until")
    op.drop_column("jobs", "idempotency_key")
