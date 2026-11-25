from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class RequestKind(StrEnum):
    """What a teacher can ask the admins to change."""

    FACE_REENROLL = "face_reenroll"
    BATCH_CHANGE = "batch_change"
    DEGREE_PROGRAMME = "degree_programme"
    NFC_CARD = "nfc_card"
    SUBJECT_ADD = "subject_add"
    SCHEDULE_CHANGE = "schedule_change"
    OTHER = "other"


class RequestStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"  # an admin pressed "Doing": other admins can't act on it
    FIXED = "fixed"


def _enum(cls, name):
    return Enum(cls, name=name, values_callable=lambda e: [m.value for m in e])


class TeacherRequest(Base):
    """A change a teacher asked for. It stays on the admin dashboard until an admin marks it fixed."""

    __tablename__ = "teacher_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[RequestKind] = mapped_column(_enum(RequestKind, "request_kind"), nullable=False)
    subject: Mapped[str] = mapped_column(String(160), nullable=False, default="", server_default="")
    details: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        _enum(RequestStatus, "request_status"), nullable=False, default=RequestStatus.OPEN, index=True
    )
    claimed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    teacher: Mapped[User] = relationship(foreign_keys=[teacher_id])
    claimed_by: Mapped[User | None] = relationship(foreign_keys=[claimed_by_id])
    resolved_by: Mapped[User | None] = relationship(foreign_keys=[resolved_by_id])


class ActivityEvent(Base):
    """One line of the admin dashboard's "Recent activity": what changed, by whom, when.

    The text is saved as written, so it still reads right after the thing itself is deleted."""

    __tablename__ = "activity_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    # teacher_added, student_added, batch_added, batch_removed, subject_added, subject_removed, request_fixed, ...
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str] = mapped_column(String(400), nullable=False, default="", server_default="")
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
