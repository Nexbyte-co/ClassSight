"""lecture slots and course code / department on classrooms

Revision ID: c3a9f10d7e55
Revises: b7d2e4f1a903
Create Date: 2026-11-01 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3a9f10d7e55'
down_revision: Union[str, Sequence[str], None] = 'b7d2e4f1a903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('classrooms', sa.Column('course_code', sa.String(length=20), server_default='', nullable=False))
    op.add_column('classrooms', sa.Column('department', sa.String(length=120), server_default='', nullable=False))
    op.create_table('lectures',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=False),
    sa.Column('weekday', sa.SmallInteger(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('room', sa.String(length=40), server_default='', nullable=False),
    sa.CheckConstraint('end_time > start_time', name='ck_lectures_end_after_start'),
    sa.CheckConstraint('weekday >= 0 AND weekday <= 6', name='ck_lectures_weekday'),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('classroom_id', 'weekday', name='uq_lectures_classroom_weekday')
    )
    op.create_index(op.f('ix_lectures_classroom_id'), 'lectures', ['classroom_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_lectures_classroom_id'), table_name='lectures')
    op.drop_table('lectures')
    op.drop_column('classrooms', 'department')
    op.drop_column('classrooms', 'course_code')
