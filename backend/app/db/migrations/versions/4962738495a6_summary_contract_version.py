"""Version summary contracts and preserve requested output language."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "4962738495a6"
down_revision = "4862738495a6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "summary_runs",
        sa.Column(
            "schema_version",
            sa.String(40),
            nullable=False,
            server_default="case-summary-v1",
        ),
    )
    op.add_column(
        "summary_runs",
        sa.Column(
            "output_language", sa.String(50), nullable=False, server_default="en-IN"
        ),
    )

    op.create_table(
        "reviewed_source_provenance",
        sa.Column(
            "revision_id",
            UUID(as_uuid=True),
            sa.ForeignKey("working_document_revisions.id"),
            primary_key=True,
        ),
        sa.Column(
            "file_version_id",
            UUID(as_uuid=True),
            sa.ForeignKey("document_file_versions.id"),
            nullable=False,
        ),
        sa.Column("revision_sha256", sa.String(64), nullable=False),
        sa.Column("source_sha256", sa.String(64), nullable=False),
        sa.Column("page_paths", JSONB(), nullable=False),
        sa.Column(
            "reviewed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("mode", sa.String(32), nullable=False),
    )
    op.execute(
        "CREATE FUNCTION protect_reviewed_provenance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Reviewed provenance is immutable'; END; $$"
    )
    op.execute(
        "CREATE TRIGGER reviewed_provenance_immutable BEFORE UPDATE OR DELETE ON reviewed_source_provenance FOR EACH ROW EXECUTE FUNCTION protect_reviewed_provenance()"
    )


def downgrade():
    op.drop_table("reviewed_source_provenance")
    op.execute("DROP FUNCTION protect_reviewed_provenance()")
    op.drop_column("summary_runs", "output_language")
    op.drop_column("summary_runs", "schema_version")
