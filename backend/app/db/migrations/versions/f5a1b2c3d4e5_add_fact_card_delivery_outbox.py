"""Persist delivery intents for summary map-stage fact cards.

Revision ID: f5a1b2c3d4e5
Revises: e49f0a1b2c3d
"""

from alembic import op
import sqlalchemy as sa


revision = "f5a1b2c3d4e5"
down_revision = "e49f0a1b2c3d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "fact_card_deliveries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("summary_run_id", sa.Uuid(), nullable=False),
        sa.Column("document_fact_card_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="queued", nullable=False),
        sa.Column("delivery_attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("leased_until", sa.DateTime(), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["summary_run_id"], ["summary_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_fact_card_id"], ["document_fact_cards.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("summary_run_id", "document_fact_card_id", name="uq_fact_card_delivery_run_card"),
    )
    op.create_index(
        "ix_fact_card_deliveries_dispatch",
        "fact_card_deliveries",
        ["status", "leased_until"],
    )


def downgrade():
    op.drop_index("ix_fact_card_deliveries_dispatch", table_name="fact_card_deliveries")
    op.drop_table("fact_card_deliveries")
