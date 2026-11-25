"""departments: managed list of college departments

Revision ID: e5c1a7b39d20
Revises: d4b8e21a6f09
Create Date: 2026-11-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5c1a7b39d20'
down_revision: Union[str, Sequence[str], None] = 'd4b8e21a6f09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEPARTMENTS = [
    "Basic & Engineering Sciences (Dera Bassi Campus)",
    "Department of Chemical Engineering",
    "Department of Civil Engineering",
    "Department of Electrical & Instrumentation Engineering",
    "Department of Electronics & Communication Engineering",
    "Department of Mechanical Engineering Department",
    "Department of Biotechnology",
    "Department of Chemistry & Biochemistry (DST-FIST Sponsored)",
    "Department of Computer Science & Engineering",
    "Department of Energy and Environment (DST-FIST Sponsored)",
    "Department of Humanities & Social Sciences",
    "Department of Mathematics",
    "Department of Physics & Materials Science",
]


def upgrade() -> None:
    """Upgrade schema."""
    table = op.create_table('departments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('uq_departments_name_lower', 'departments', [sa.text('lower(name)')], unique=True)
    op.bulk_insert(table, [{"name": name} for name in DEPARTMENTS])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_departments_name_lower', table_name='departments')
    op.drop_table('departments')
