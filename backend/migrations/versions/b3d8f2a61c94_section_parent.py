"""sections: parent batch (a subbatch such as 3C23 belongs to 3C2)

Revision ID: b3d8f2a61c94
Revises: a1b7c3d90e42
Create Date: 2026-11-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3d8f2a61c94'
down_revision: Union[str, Sequence[str], None] = 'a1b7c3d90e42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sections", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_sections_parent", "sections", "sections", ["parent_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_sections_parent_id", "sections", ["parent_id"])
    # Existing batches: the parent is the longest other name this one starts with.
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, name FROM sections")).fetchall()
    for sid, name in rows:
        best = None
        for oid, other in rows:
            if oid != sid and len(other) < len(name) and name.lower().startswith(other.lower()):
                if best is None or len(other) > len(best[1]):
                    best = (oid, other)
        if best:
            conn.execute(sa.text("UPDATE sections SET parent_id = :p WHERE id = :i"), {"p": best[0], "i": sid})


def downgrade() -> None:
    op.drop_index("ix_sections_parent_id", table_name="sections")
    op.drop_constraint("fk_sections_parent", "sections", type_="foreignkey")
    op.drop_column("sections", "parent_id")
