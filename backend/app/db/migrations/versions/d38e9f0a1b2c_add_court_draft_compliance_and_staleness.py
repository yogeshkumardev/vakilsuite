"""Persist court-draft content identity, compliance, and stale state.

Revision ID: d38e9f0a1b2c
Revises: c27d8e9f0a1b
"""

from alembic import op
import sqlalchemy as sa


revision = "d38e9f0a1b2c"
down_revision = "c27d8e9f0a1b"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("court_drafts", sa.Column("content_hash", sa.String(length=64), nullable=True))
    op.add_column("court_drafts", sa.Column("compliance_report", sa.JSON(), nullable=True))
    op.add_column("court_drafts", sa.Column("stale_reason", sa.String(length=80), nullable=True))
    op.add_column("court_drafts", sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False))
    # Existing skeleton drafts were saved before content identity existed. They are
    # deliberately stale rather than silently becoming downloadable artifacts.
    op.execute("UPDATE court_drafts SET status = 'stale', stale_reason = 'MIGRATION_REVIEW_REQUIRED' WHERE content_hash IS NULL")
    op.execute("UPDATE court_drafts SET content_hash = repeat('0', 64) WHERE content_hash IS NULL")
    op.alter_column("court_drafts", "content_hash", nullable=False)


def downgrade():
    op.drop_column("court_drafts", "updated_at")
    op.drop_column("court_drafts", "stale_reason")
    op.drop_column("court_drafts", "compliance_report")
    op.drop_column("court_drafts", "content_hash")
