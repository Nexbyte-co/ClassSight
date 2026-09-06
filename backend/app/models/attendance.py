from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.classroom import Classroom
    from app.models.student import Student


class AttendanceStatus(StrEnum):
    PRESENT = "present"
    ABSENT = "absent"
    EXCUSED = "excused"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        UniqueConstraint("classroom_id", "session_date", name="uq_attendance_sessions_classroom_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    classroom: Mapped[Classroom] = relationship(back_populates="attendance_sessions")
    records: Mapped[list[AttendanceRecord]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_records_session_student"),
        CheckConstraint(
            "recognition_confidence IS NULL OR recognition_confidence BETWEEN 0 AND 1",
            name="ck_attendance_records_confidence_range",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(
            AttendanceStatus,
            name="attendance_status",
            values_callable=lambda status: [member.value for member in status],
        ),
        nullable=False,
    )
    recognition_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    session: Mapped[AttendanceSession] = relationship(back_populates="records")
    student: Mapped[Student] = relationship(back_populates="attendance_records")
