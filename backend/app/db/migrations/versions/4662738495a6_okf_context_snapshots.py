"""Store immutable case-bound OKF context snapshots."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "4662738495a6"
down_revision = "4562738495a6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("okf_context_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("manifest_sha256", sa.String(64), nullable=False),
        sa.Column("selection", postgresql.JSONB(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("case_id", "manifest_sha256"))
    op.create_index("ix_okf_context_snapshots_case_id", "okf_context_snapshots", ["case_id"])
    op.execute("""CREATE FUNCTION prevent_okf_snapshot_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'OKF snapshots are immutable'; END; $$""")
    op.execute("""CREATE TRIGGER okf_snapshot_immutable BEFORE UPDATE ON okf_context_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_okf_snapshot_update()""")


def downgrade():
    op.drop_table("okf_context_snapshots")
    op.execute("DROP FUNCTION prevent_okf_snapshot_update()")
