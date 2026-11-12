"""Add stable annexure slots and immutable file-version page mappings."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2d3e4f506172"
down_revision = "2c3d4e5f6071"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("annexure_items", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False), sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False), sa.Column("slot_code", sa.String(32), nullable=False), sa.Column("label", sa.String(500), nullable=False), sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")), sa.UniqueConstraint("case_id", "slot_code", name="uq_annexure_item_slot"))
    op.create_table("annexure_document_ranges", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("annexure_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("annexure_items.id", ondelete="CASCADE"), nullable=False), sa.Column("file_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("document_file_versions.id", ondelete="RESTRICT"), nullable=False), sa.Column("first_page", sa.Integer()), sa.Column("last_page", sa.Integer()), sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")))
    op.create_index("ix_annexure_document_ranges_annexure_current", "annexure_document_ranges", ["annexure_item_id", "is_current"])
    op.execute("CREATE UNIQUE INDEX uq_annexure_current_mapping ON annexure_document_ranges (annexure_item_id) WHERE is_current")

def downgrade():
    raise RuntimeError("Annexure history must not be silently removed")
