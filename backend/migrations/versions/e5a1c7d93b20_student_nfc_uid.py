"""nfc_uid on students (NFC ID card serial number, unique)

Revision ID: e5a1c7d93b20
Revises: d7b3e9f42a16
Create Date: 2026-11-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5a1c7d93b20'
down_revision: Union[str, Sequence[str], None] = 'd7b3e9f42a16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("students", sa.Column("nfc_uid", sa.String(40), nullable=True))
    op.create_unique_constraint("uq_students_nfc_uid", "students", ["nfc_uid"])


def downgrade() -> None:
    op.drop_constraint("uq_students_nfc_uid", "students", type_="unique")
    op.drop_column("students", "nfc_uid")
