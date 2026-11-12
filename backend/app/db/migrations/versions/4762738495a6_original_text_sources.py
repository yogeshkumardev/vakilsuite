"""Track native PDF text and reviewed scanned-page provenance separately."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "4762738495a6"
down_revision = "4662738495a6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "original_text_sources",
        sa.Column(
            "file_version_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("document_file_versions.id"),
            primary_key=True,
        ),
        sa.Column("source_sha256", sa.String(64), nullable=False),
        sa.Column("pages", pg.JSONB(), nullable=False),
        sa.Column(
            "revision_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("working_document_revisions.id"),
            unique=True,
        ),
        sa.Column("revision_sha256", sa.String(64)),
        sa.Column("mode", sa.String(32), nullable=False),
        sa.Column("reviewed_by", pg.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )

    op.execute("""CREATE FUNCTION protect_original_source() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF OLD.revision_id IS NOT NULL THEN RAISE EXCEPTION 'Published original sources are immutable'; END IF; RETURN NEW; END; $$""")
    op.execute("""CREATE TRIGGER original_source_immutable BEFORE UPDATE ON original_text_sources
    FOR EACH ROW EXECUTE FUNCTION protect_original_source()""")


def downgrade():
    op.drop_table("original_text_sources")
    op.execute("DROP FUNCTION protect_original_source()")
