"""Enforce one active original-page OCR job for each document."""

from alembic import op


revision = "4a7b5c6d7e8f"
down_revision = "4962738495a6"
branch_labels = None
depends_on = None


def upgrade():
    # Old retry storms may have produced more than one active row. Queued rows
    # have no provider outcome. A displaced running row is conservatively kept
    # as an unknown paid outcome instead of being retried automatically.
    op.execute(
        """
        WITH ranked AS (
            SELECT id, status,
                   row_number() OVER (
                       PARTITION BY payload ->> 'document_id'
                       ORDER BY (status = 'running') DESC, queued_at, created_at, id
                   ) AS position
            FROM jobs
            WHERE job_type = 'original_page_ocr'
              AND status IN ('queued', 'running')
              AND payload ->> 'document_id' IS NOT NULL
        )
        UPDATE jobs AS job
        SET status = 'failed',
            error_message = CASE
                WHEN ranked.status = 'running' THEN 'PROVIDER_OUTCOME_UNKNOWN_NO_RETRY'
                ELSE 'OCR_ACTIVE_JOB_SUPERSEDED'
            END,
            completed_at = now()
        FROM ranked
        WHERE job.id = ranked.id AND ranked.position > 1
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_jobs_active_original_page_ocr_document
        ON jobs ((payload ->> 'document_id'))
        WHERE job_type = 'original_page_ocr'
          AND status IN ('queued', 'running')
          AND payload ->> 'document_id' IS NOT NULL
        """
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_jobs_active_original_page_ocr_document")
