"""teacher designation, typed weekly slots, many degree programmes per subject

Revision ID: d9a4c7e12f58
Revises: c8e3a1b52d74
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd9a4c7e12f58'
down_revision: Union[str, Sequence[str], None] = 'c8e3a1b52d74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("designation", sa.String(60), nullable=False, server_default=""))

    op.add_column("lectures", sa.Column("session_type", sa.String(10), nullable=False, server_default="lecture"))
    op.create_check_constraint("ck_lectures_session_type", "lectures", "session_type IN ('lecture', 'lab', 'tutorial')")
    op.drop_constraint("uq_lectures_classroom_weekday", "lectures", type_="unique")
    op.create_unique_constraint("uq_lectures_classroom_weekday_type", "lectures", ["classroom_id", "weekday", "session_type"])

    op.create_table(
        "classroom_programmes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("classroom_id", sa.Integer(), sa.ForeignKey("classrooms.id"), nullable=False, index=True),
        sa.Column("degree_programme", sa.String(160), nullable=False),
        sa.Column("start_year", sa.SmallInteger(), nullable=True),
        sa.UniqueConstraint("classroom_id", "degree_programme", name="uq_classroom_programmes"),
    )
    # Every subject that already has a programme keeps it as its first allotted programme.
    op.execute(
        "INSERT INTO classroom_programmes (classroom_id, degree_programme) "
        "SELECT id, degree_programme FROM classrooms WHERE degree_programme <> ''"
    )


def downgrade() -> None:
    op.drop_table("classroom_programmes")
    op.drop_constraint("uq_lectures_classroom_weekday_type", "lectures", type_="unique")
    # Slots of another kind on the same weekday would break the old rule: keep one per class per weekday.
    op.execute(
        "DELETE FROM lectures a USING lectures b "
        "WHERE a.classroom_id = b.classroom_id AND a.weekday = b.weekday AND a.id > b.id"
    )
    op.create_unique_constraint("uq_lectures_classroom_weekday", "lectures", ["classroom_id", "weekday"])
    op.drop_constraint("ck_lectures_session_type", "lectures", type_="check")
    op.drop_column("lectures", "session_type")
    op.drop_column("users", "designation")
