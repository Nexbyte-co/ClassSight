"""subbatches: optional subbatch on students and classes

Revision ID: c8e3a1b52d74
Revises: b7d2f9a40c63
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c8e3a1b52d74'
down_revision: Union[str, Sequence[str], None] = 'b7d2f9a40c63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("students", sa.Column("subbatch", sa.String(10), nullable=False, server_default=""))
    op.add_column("classrooms", sa.Column("subbatch", sa.String(10), nullable=False, server_default=""))
    op.drop_constraint("uq_classrooms_course_section", "classrooms", type_="unique")
    op.create_unique_constraint(
        "uq_classrooms_course_section", "classrooms", ["course", "section_id", "subbatch"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_classrooms_course_section", "classrooms", type_="unique")
    op.create_unique_constraint("uq_classrooms_course_section", "classrooms", ["course", "section_id"])
    op.drop_column("classrooms", "subbatch")
    op.drop_column("students", "subbatch")
