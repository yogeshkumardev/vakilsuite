"""Store scanned-document rich text before explicit review."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
revision='4862738495a6'
down_revision='4762738495a6'
branch_labels=None
depends_on=None


def upgrade():
    op.add_column('original_text_sources',sa.Column('editor_document',JSONB(),nullable=True))
    op.add_column('original_text_sources',sa.Column('editor_version',sa.Integer(),nullable=False,server_default='1'))


def downgrade():
    op.drop_column('original_text_sources','editor_version')
    op.drop_column('original_text_sources','editor_document')
