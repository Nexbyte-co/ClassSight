"""college-wide roll number and student photos

Revision ID: b7d2e4f1a903
Revises: 44dd15e91a66
Create Date: 2026-10-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d2e4f1a903'
down_revision: Union[str, Sequence[str], None] = '44dd15e91a66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Fails if two classrooms already share a roll number; resolve those rows first.
    op.drop_constraint('uq_students_classroom_roll_number', 'students', type_='unique')
    op.create_unique_constraint('uq_students_roll_number', 'students', ['roll_number'])

    op.create_table('student_photos',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('s3_key', sa.String(length=1024), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_student_photos_student_id'), 'student_photos', ['student_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_student_photos_student_id'), table_name='student_photos')
    op.drop_table('student_photos')
    op.drop_constraint('uq_students_roll_number', 'students', type_='unique')
    op.create_unique_constraint(
        'uq_students_classroom_roll_number', 'students', ['classroom_id', 'roll_number']
    )
