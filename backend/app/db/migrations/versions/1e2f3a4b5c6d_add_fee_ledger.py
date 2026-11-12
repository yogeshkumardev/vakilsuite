"""Add fee agreements and immutable postings."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "1e2f3a4b5c6d"
down_revision = "1d2e3f4a5b6c"
branch_labels = None
depends_on = None


def upgrade():
    fee_entry_type = postgresql.ENUM(
        "payment", "refund", "expense", "reversal", name="fee_entry_type"
    )
    fee_entry_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "fee_agreements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("agreed_amount_paise", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "fee_ledger_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("agreement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fee_agreements.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("entry_type", postgresql.ENUM(name="fee_entry_type", create_type=False), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("reverses_entry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fee_ledger_entries.id", ondelete="RESTRICT")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("chamber_id", "idempotency_key", name="uq_fee_ledger_chamber_key"),
    )
    op.create_index("ix_fee_agreements_chamber_matter", "fee_agreements", ["chamber_id", "matter_id"])
    op.create_index("ix_fee_ledger_matter_created", "fee_ledger_entries", ["matter_id", "created_at"])


def downgrade():
    raise RuntimeError("Fee ledger downgrades are unsafe after postings exist")
