"""degree programmes: only the TIET undergraduate programmes and MCA remain

Clears a degree programme saved on a batch or subject when it is no longer in the list.

Revision ID: a6c1e8f93b52
Revises: f4a9c6d81e30
Create Date: 2026-11-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a6c1e8f93b52'
down_revision: Union[str, Sequence[str], None] = 'f4a9c6d81e30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALLOWED = [
    'BE Computer Engineering (TIET UG)',
    'BE CSE (TIET UG)',
    'BE CSBS (TIET UG)',
    'BE AI & ML (TIET UG)',
    'BE AI & DS (TIET UG)',
    'BE Electrical (TIET UG)',
    'BE Electrical & Computer (TIET UG)',
    'BE ECE (TIET UG)',
    'BE Electronics & Computer (TIET UG)',
    'BE EIC (TIET UG)',
    'BE Mechanical (TIET UG)',
    'BE Mechatronics (TIET UG)',
    'BE Chemical (TIET UG)',
    'BE Civil (TIET UG)',
    'BE Biomedical (TIET UG)',
    'BE Production (TIET UG)',
    'BE Software Engineering & Management (TIET UG)',
    'BE Robotics & AI (TIET UG)',
    'BE VLSI (TIET UG)',
    'BTech Biotechnology (TIET UG)',
    'BTech Biochemical Engineering (TIET UG)',
    'BE Lateral Entry (TIET UG)',
    'International Engineering Programme (TIET UG)',
    'Integrated BE-MBA (TIET UG)',
    'MCA (TIET PG)',
]


def upgrade() -> None:
    allowed = sa.bindparam("allowed", ALLOWED, expanding=True)
    for table in ("sections", "classrooms"):
        op.get_bind().execute(
            sa.text(f"UPDATE {table} SET degree_programme = '' WHERE degree_programme <> '' AND degree_programme NOT IN :allowed").bindparams(allowed)
        )


def downgrade() -> None:
    # The cleared values cannot be restored.
    pass
