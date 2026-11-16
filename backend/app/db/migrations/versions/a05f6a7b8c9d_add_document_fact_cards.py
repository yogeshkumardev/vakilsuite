"""Add revision-bound document fact cards."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a05f6a7b8c9d"
down_revision = "9e4f5a6b7c8d"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("document_fact_cards", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False), sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False), sa.Column("working_document_revision_id", sa.Uuid(), sa.ForeignKey("working_document_revisions.id", ondelete="RESTRICT"), nullable=False), sa.Column("source_sha256", sa.String(64), nullable=False), sa.Column("status", sa.String(24), nullable=False, server_default="pending"), sa.Column("content", postgresql.JSONB()), sa.Column("error_code", sa.String(80)), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()), sa.UniqueConstraint("chamber_id", "working_document_revision_id", name="uq_fact_card_revision"))
    op.create_index("ix_fact_cards_case_status", "document_fact_cards", ["case_id", "status"])

def downgrade():
    op.drop_table("document_fact_cards")
