"""teacher requests and the admin activity feed

Revision ID: c4e9a2f71b38
Revises: b3d8f2a61c94
Create Date: 2026-11-22 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4e9a2f71b38'
down_revision: Union[str, Sequence[str], None] = 'b3d8f2a61c94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

KINDS = ("face_reenroll", "batch_change", "degree_programme", "nfc_card", "subject_add", "schedule_change", "other")
STATUSES = ("open", "in_progress", "fixed")


def upgrade() -> None:
    op.create_table(
        "teacher_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.Enum(*KINDS, name="request_kind"), nullable=False),
        sa.Column("subject", sa.String(160), nullable=False, server_default=""),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum(*STATUSES, name="request_status"), nullable=False, server_default="open"),
        sa.Column("claimed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_teacher_requests_teacher_id", "teacher_requests", ["teacher_id"])
    op.create_index("ix_teacher_requests_status", "teacher_requests", ["status"])
    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("detail", sa.String(400), nullable=False, server_default=""),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_activity_events_created_at", "activity_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_activity_events_created_at", table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_index("ix_teacher_requests_status", table_name="teacher_requests")
    op.drop_index("ix_teacher_requests_teacher_id", table_name="teacher_requests")
    op.drop_table("teacher_requests")
    sa.Enum(name="request_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="request_kind").drop(op.get_bind(), checkfirst=True)
