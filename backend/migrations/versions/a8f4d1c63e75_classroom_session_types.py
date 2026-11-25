"""classrooms: which session types (lecture, lab, tutorial) a subject has

Revision ID: a8f4d1c63e75
Revises: f6d2b8a41c37
Create Date: 2026-11-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a8f4d1c63e75'
down_revision: Union[str, Sequence[str], None] = 'f6d2b8a41c37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing subjects keep behaving as plain lectures.
    op.add_column('classrooms', sa.Column('has_lecture', sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column('classrooms', sa.Column('has_lab', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('classrooms', sa.Column('has_tutorial', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    op.drop_column('classrooms', 'has_tutorial')
    op.drop_column('classrooms', 'has_lab')
    op.drop_column('classrooms', 'has_lecture')
