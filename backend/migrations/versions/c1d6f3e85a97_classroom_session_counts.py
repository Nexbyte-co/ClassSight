"""classrooms: number of lectures, labs and tutorials per week (replaces the yes/no flags)

Revision ID: c1d6f3e85a97
Revises: b9c5e2d74f86
Create Date: 2026-11-17 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1d6f3e85a97'
down_revision: Union[str, Sequence[str], None] = 'b9c5e2d74f86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('classrooms', sa.Column('lecture_count', sa.SmallInteger(), server_default='1', nullable=False))
    op.add_column('classrooms', sa.Column('lab_count', sa.SmallInteger(), server_default='0', nullable=False))
    op.add_column('classrooms', sa.Column('tutorial_count', sa.SmallInteger(), server_default='0', nullable=False))
    # A kind that was switched on becomes "1 per week".
    op.execute(
        "UPDATE classrooms SET lecture_count = CASE WHEN has_lecture THEN 1 ELSE 0 END, "
        "lab_count = CASE WHEN has_lab THEN 1 ELSE 0 END, "
        "tutorial_count = CASE WHEN has_tutorial THEN 1 ELSE 0 END"
    )
    op.drop_column('classrooms', 'has_tutorial')
    op.drop_column('classrooms', 'has_lab')
    op.drop_column('classrooms', 'has_lecture')
    op.create_check_constraint(
        'ck_classrooms_session_counts',
        'classrooms',
        'lecture_count >= 0 AND lab_count >= 0 AND tutorial_count >= 0 '
        'AND lecture_count + lab_count + tutorial_count > 0',
    )


def downgrade() -> None:
    op.drop_constraint('ck_classrooms_session_counts', 'classrooms', type_='check')
    op.add_column('classrooms', sa.Column('has_lecture', sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column('classrooms', sa.Column('has_lab', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('classrooms', sa.Column('has_tutorial', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.execute(
        "UPDATE classrooms SET has_lecture = lecture_count > 0, has_lab = lab_count > 0, "
        "has_tutorial = tutorial_count > 0"
    )
    op.drop_column('classrooms', 'tutorial_count')
    op.drop_column('classrooms', 'lab_count')
    op.drop_column('classrooms', 'lecture_count')
