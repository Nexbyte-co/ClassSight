"""degree programmes: only programmes with a batch-name letter remain

Clears a degree programme saved on a batch or subject when it is no longer in the list.

Revision ID: b7d2f9a40c63
Revises: a6c1e8f93b52
Create Date: 2026-11-19 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7d2f9a40c63'
down_revision: Union[str, Sequence[str], None] = 'a6c1e8f93b52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALLOWED = [
    'BE Chemical (TIET UG)',
    'BE Civil (TIET UG)',
    'BE Computer Engineering (TIET UG)',
    'BE EIC (TIET UG)',
    'BE ECE (TIET UG)',
    'BTech Biotechnology (TIET UG)',
    'BE Mechanical (TIET UG)',
    'BE Mechatronics (TIET UG)',
    'BE Biomedical (TIET UG)',
    'BE Electronics & Computer (TIET UG)',
    'BE CSE (TIET UG)',
    'BE CSBS (TIET UG)',
    'BE Electrical & Computer (TIET UG)',
    'BE Civil with Computer (TIET UG)',
    'BE VLSI (TIET UG)',
    'BE Robotics & AI (TIET UG)',
    'BE AI & DS (TIET UG)',
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
