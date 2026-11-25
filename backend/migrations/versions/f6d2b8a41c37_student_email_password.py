"""students: optional email and password hash

Revision ID: f6d2b8a41c37
Revises: e5c1a7b39d20
Create Date: 2026-11-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6d2b8a41c37'
down_revision: Union[str, Sequence[str], None] = 'e5c1a7b39d20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('email', sa.String(length=320), nullable=True))
    op.add_column('students', sa.Column('password_hash', sa.String(length=255), nullable=True))
    op.create_unique_constraint('uq_students_email', 'students', ['email'])


def downgrade() -> None:
    op.drop_constraint('uq_students_email', 'students', type_='unique')
    op.drop_column('students', 'password_hash')
    op.drop_column('students', 'email')
