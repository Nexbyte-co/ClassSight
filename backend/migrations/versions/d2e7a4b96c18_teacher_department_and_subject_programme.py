"""teacher department, subject degree programme, subjects without a batch

Revision ID: d2e7a4b96c18
Revises: c1d6f3e85a97
Create Date: 2026-11-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd2e7a4b96c18'
down_revision: Union[str, Sequence[str], None] = 'c1d6f3e85a97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('department', sa.String(length=120), server_default='', nullable=False))
    op.add_column('classrooms', sa.Column('degree_programme', sa.String(length=160), server_default='', nullable=False))
    op.alter_column('classrooms', 'section_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM classrooms WHERE section_id IS NULL")
    op.alter_column('classrooms', 'section_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('classrooms', 'degree_programme')
    op.drop_column('users', 'department')
