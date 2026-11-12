"""Add legal research review resume outbox.

Revision ID: 4562738495a6
Revises: 4462738495a6
"""
from alembic import op
import sqlalchemy as sa

revision = "4562738495a6"
down_revision = "4462738495a6"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("legal_research_resume_intents", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("review_id", sa.Uuid(), sa.ForeignKey("legal_authority_reviews.id", ondelete="CASCADE"), nullable=False), sa.Column("status", sa.String(32), nullable=False, server_default="pending"), sa.Column("idempotency_key", sa.String(128), nullable=False, unique=True), sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"), sa.Column("error_code", sa.String(80), nullable=True), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")), sa.UniqueConstraint("review_id", name="uq_legal_research_resume_intents_review"))

def downgrade() -> None:
    raise NotImplementedError("Legal research outbox records are retained.")
