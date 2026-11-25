"""lectures: several slots of one kind on a weekday

Revision ID: a1b7c3d90e42
Revises: d9a4c7e12f58
Create Date: 2026-11-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b7c3d90e42'
down_revision: Union[str, Sequence[str], None] = 'd9a4c7e12f58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_lectures_classroom_weekday_type", "lectures", type_="unique")
    op.create_unique_constraint(
        "uq_lectures_classroom_weekday_type_start", "lectures", ["classroom_id", "weekday", "session_type", "start_time"]
    )


def downgrade() -> None:
    # Keep one slot per class, weekday and kind (the earliest) before the old rule comes back.
    op.execute(
        "DELETE FROM lectures a USING lectures b WHERE a.classroom_id = b.classroom_id AND a.weekday = b.weekday "
        "AND a.session_type = b.session_type AND a.id > b.id"
    )
    op.drop_constraint("uq_lectures_classroom_weekday_type_start", "lectures", type_="unique")
    op.create_unique_constraint("uq_lectures_classroom_weekday_type", "lectures", ["classroom_id", "weekday", "session_type"])
