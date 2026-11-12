"""Add physical original/copy custody checklist."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "1f2a3b4c5d6e"
down_revision = "1e2f3a4b5c6d"
branch_labels = None
depends_on = None


def upgrade():
    kind = postgresql.ENUM("original", "copy", name="custody_kind")
    kind.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "matter_custody_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "chamber_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chambers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "matter_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(name="custody_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("physical_location", sa.String(300), nullable=False),
        sa.Column(
            "recorded_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "recorded_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_matter_custody_items_chamber_matter",
        "matter_custody_items",
        ["chamber_id", "matter_id"],
    )


def downgrade():
    raise RuntimeError("Custody record downgrades are unsafe")
