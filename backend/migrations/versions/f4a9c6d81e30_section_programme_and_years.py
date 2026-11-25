"""sections: degree programme and the years the batch studies

Revision ID: f4a9c6d81e30
Revises: e3f8b5c70d29
Create Date: 2026-11-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f4a9c6d81e30'
down_revision: Union[str, Sequence[str], None] = 'e3f8b5c70d29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sections', sa.Column('degree_programme', sa.String(length=160), server_default='', nullable=False))
    op.add_column('sections', sa.Column('start_year', sa.SmallInteger(), nullable=True))
    op.add_column('sections', sa.Column('end_year', sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column('sections', 'end_year')
    op.drop_column('sections', 'start_year')
    op.drop_column('sections', 'degree_programme')
