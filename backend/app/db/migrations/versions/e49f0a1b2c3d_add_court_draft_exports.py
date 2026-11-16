"""Add court draft download audit rows and audit event value.

Revision ID: e49f0a1b2c3d
Revises: d38e9f0a1b2c
"""
from alembic import op
import sqlalchemy as sa

revision = "e49f0a1b2c3d"
down_revision = "d38e9f0a1b2c"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE chamber_audit_event_type ADD VALUE IF NOT EXISTS 'draft.download'")
    op.create_table("draft_downloads",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("court_draft_id", sa.Uuid(), nullable=False),
        sa.Column("export_job_id", sa.Uuid(), nullable=False),
        sa.Column("chamber_id", sa.Uuid(), nullable=False),
        sa.Column("downloaded_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["court_draft_id"], ["court_drafts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["export_job_id"], ["jobs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["chamber_id"], ["chambers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["downloaded_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_draft_downloads_draft_created", "draft_downloads", ["court_draft_id", "created_at"])


def downgrade():
    op.drop_index("ix_draft_downloads_draft_created", table_name="draft_downloads")
    op.drop_table("draft_downloads")
