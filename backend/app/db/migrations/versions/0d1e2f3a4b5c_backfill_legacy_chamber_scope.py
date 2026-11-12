"""Backfill deterministic private chambers for the legacy fake dataset.

Revision ID: 0d1e2f3a4b5c
Revises: 0c1d2e3f4a5b
Create Date: 2026-10-28 00:00:00.000000

The owner approved this policy for the current fake local data only: every
existing user receives a deterministic private chamber.  Existing case and
file identifiers, R2 keys and content are not changed.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0d1e2f3a4b5c"
down_revision: Union[str, Sequence[str], None] = "0c1d2e3f4a5b"
branch_labels = None
depends_on = None


def _deterministic_id_sql(namespace: str, user_id_expression: str) -> str:
    """Return a deterministic UUID expression derived from a user UUID."""
    digest = f"md5('{namespace}:' || {user_id_expression}::text)"
    return (
        "(substr(" + digest + ", 1, 8) || '-' || "
        "substr(" + digest + ", 9, 4) || '-' || "
        "substr(" + digest + ", 13, 4) || '-' || "
        "substr(" + digest + ", 17, 4) || '-' || "
        "substr(" + digest + ", 21, 12))::uuid"
    )


def upgrade() -> None:
    # Expand first: deployed writers that do not yet provide chamber_id keep
    # working until S02-03 scopes every resource path.
    op.add_column("cases", sa.Column("chamber_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("documents", sa.Column("chamber_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("jobs", sa.Column("chamber_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("workflow_runs", sa.Column("chamber_id", postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key("fk_cases_chamber_id_chambers", "cases", "chambers", ["chamber_id"], ["id"], ondelete="RESTRICT")
    op.create_foreign_key("fk_documents_chamber_id_chambers", "documents", "chambers", ["chamber_id"], ["id"], ondelete="RESTRICT")
    op.create_foreign_key("fk_jobs_chamber_id_chambers", "jobs", "chambers", ["chamber_id"], ["id"], ondelete="RESTRICT")
    op.create_foreign_key("fk_workflow_runs_chamber_id_chambers", "workflow_runs", "chambers", ["chamber_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_cases_chamber_id", "cases", ["chamber_id"])
    op.create_index("ix_documents_chamber_id", "documents", ["chamber_id"])
    op.create_index("ix_jobs_chamber_id", "jobs", ["chamber_id"])
    op.create_index("ix_workflow_runs_chamber_id", "workflow_runs", ["chamber_id"])

    chamber_id = _deterministic_id_sql("legacy-chamber", "u.id")
    op.execute(
        sa.text(
            f"""
            INSERT INTO chambers (id, name, slug, owner_user_id)
            SELECT
                {chamber_id},
                'Legacy Chamber ' || left(u.id::text, 8),
                'legacy-' || replace(u.id::text, '-', ''),
                u.id
            FROM users AS u
            ON CONFLICT (slug) DO NOTHING
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            INSERT INTO chamber_memberships (id, chamber_id, user_id, role, status)
            SELECT
                {_deterministic_id_sql('legacy-membership', 'u.id')},
                {_deterministic_id_sql('legacy-chamber', 'u.id')},
                u.id,
                'owner'::chamber_role,
                'active'::membership_status
            FROM users AS u
            ON CONFLICT (chamber_id, user_id) DO NOTHING
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            UPDATE cases AS c
            SET chamber_id = {_deterministic_id_sql('legacy-chamber', 'u.id')}
            FROM users AS u
            WHERE c.lawyer_id = u.id AND c.chamber_id IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE documents AS d
            SET chamber_id = c.chamber_id
            FROM cases AS c
            WHERE d.case_id = c.id AND d.chamber_id IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE jobs AS j
            SET chamber_id = COALESCE(
                (SELECT c.chamber_id FROM cases AS c WHERE c.id = j.case_id),
                {_deterministic_id_sql('legacy-chamber', 'u.id')}
            )
            FROM users AS u
            WHERE j.owner_id = u.id AND j.chamber_id IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE workflow_runs AS w
            SET chamber_id = {_deterministic_id_sql('legacy-chamber', 'u.id')}
            FROM users AS u
            WHERE w.owner_id = u.id AND w.chamber_id IS NULL
            """
        )
    )


def downgrade() -> None:
    # Chambers/memberships are durable audit/access records.  A downgrade only
    # removes the additive links; it never deletes chamber rows that might have
    # been used after this migration.
    op.drop_index("ix_workflow_runs_chamber_id", table_name="workflow_runs")
    op.drop_index("ix_jobs_chamber_id", table_name="jobs")
    op.drop_index("ix_documents_chamber_id", table_name="documents")
    op.drop_index("ix_cases_chamber_id", table_name="cases")
    op.drop_constraint("fk_workflow_runs_chamber_id_chambers", "workflow_runs", type_="foreignkey")
    op.drop_constraint("fk_jobs_chamber_id_chambers", "jobs", type_="foreignkey")
    op.drop_constraint("fk_documents_chamber_id_chambers", "documents", type_="foreignkey")
    op.drop_constraint("fk_cases_chamber_id_chambers", "cases", type_="foreignkey")
    op.drop_column("workflow_runs", "chamber_id")
    op.drop_column("jobs", "chamber_id")
    op.drop_column("documents", "chamber_id")
    op.drop_column("cases", "chamber_id")
