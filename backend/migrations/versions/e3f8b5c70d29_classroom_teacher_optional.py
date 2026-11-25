"""classrooms: teacher is optional (a subject can exist before it is given to a teacher)

Revision ID: e3f8b5c70d29
Revises: d2e7a4b96c18
Create Date: 2026-11-18 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e3f8b5c70d29'
down_revision: Union[str, Sequence[str], None] = 'd2e7a4b96c18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('classrooms', 'teacher_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM classrooms WHERE teacher_id IS NULL")
    op.alter_column('classrooms', 'teacher_id', existing_type=sa.Integer(), nullable=False)
