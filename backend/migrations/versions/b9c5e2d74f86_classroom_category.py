"""classrooms: core or elective

Revision ID: b9c5e2d74f86
Revises: a8f4d1c63e75
Create Date: 2026-11-17 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b9c5e2d74f86'
down_revision: Union[str, Sequence[str], None] = 'a8f4d1c63e75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing subjects count as core.
    op.add_column('classrooms', sa.Column('category', sa.String(length=10), server_default='core', nullable=False))
    op.create_check_constraint('ck_classrooms_category', 'classrooms', "category IN ('core', 'elective')")


def downgrade() -> None:
    op.drop_constraint('ck_classrooms_category', 'classrooms', type_='check')
    op.drop_column('classrooms', 'category')
