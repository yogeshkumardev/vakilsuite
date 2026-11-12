"""Add immutable legal authority manifests.

Revision ID: 4462738495a6
Revises: 4362738495a6
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "4462738495a6"
down_revision = "4362738495a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "legal_authority_manifests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("context_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("references_json", postgresql.JSONB(), nullable=False),
        sa.Column("schema_version", sa.String(32), nullable=False, server_default="v1"),
        sa.Column("is_stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_legal_authority_manifests_case_created", "legal_authority_manifests", ["case_id", "created_at"])


def downgrade() -> None:
    raise NotImplementedError("Authority manifests are immutable audit records.")
