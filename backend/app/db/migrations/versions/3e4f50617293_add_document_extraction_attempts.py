"""Add durable provider-attempt ledger for document extraction (S06-07)."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "3e4f50617293"
down_revision = "3d4e5f607182"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE TYPE document_extraction_attempt_status AS ENUM ('reserved', 'submitted', 'succeeded', 'failed', 'unknown')")
    op.create_table("document_extraction_attempts", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False), sa.Column("file_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("document_file_versions.id", ondelete="RESTRICT"), nullable=False), sa.Column("sequence", sa.Integer(), nullable=False), sa.Column("provider", sa.String(32), nullable=False), sa.Column("model", sa.String(160), nullable=False), sa.Column("status", postgresql.ENUM(name="document_extraction_attempt_status", create_type=False), nullable=False, server_default="reserved"), sa.Column("input_manifest_digest", sa.String(64), nullable=False), sa.Column("provider_request_id", sa.String(255)), sa.Column("output_sha256", sa.String(64)), sa.Column("error_code", sa.String(80)), sa.Column("outcome_unknown", sa.Boolean(), nullable=False, server_default=sa.text("false")), sa.Column("reserved_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")), sa.Column("reconciled_at", sa.DateTime()))
    op.create_unique_constraint("uq_document_extraction_attempt_sequence", "document_extraction_attempts", ["job_id", "sequence"])
    op.create_index("ix_document_extraction_attempts_job", "document_extraction_attempts", ["job_id"])
    op.create_index("ix_document_extraction_attempts_status", "document_extraction_attempts", ["status"])

def downgrade():
    raise RuntimeError("Provider attempt audit records must not be silently removed")
