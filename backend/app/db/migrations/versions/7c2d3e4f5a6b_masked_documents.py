"""Immutable reviewed masked documents."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '7c2d3e4f5a6b'
down_revision = '6b1c2d3e4f5a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('masked_document_revisions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('document_id', sa.Uuid(), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('source_hash', sa.String(64), nullable=False),
        sa.Column('blocks', postgresql.JSONB(), nullable=False),
        sa.Column('editor_documents', postgresql.JSONB(), nullable=False),
        sa.Column('encrypted_mapping', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Uuid(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('approved_by', sa.Uuid(), sa.ForeignKey('users.id')),
        sa.Column('approved_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.create_index('ix_masked_document_revisions_document_id', 'masked_document_revisions', ['document_id'])


def downgrade():
    op.drop_table('masked_document_revisions')
