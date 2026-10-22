from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceRecord
    from app.models.classroom import Classroom


class Student(Base):
    __tablename__ = "students"
    # College roll number: the student's unique ID across the whole college.
    __table_args__ = (UniqueConstraint("roll_number", name="uq_students_roll_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    roll_number: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False)
    face_embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    classroom: Mapped[Classroom] = relationship(back_populates="students")
    attendance_records: Mapped[list[AttendanceRecord]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    photos: Mapped[list[StudentPhoto]] = relationship(
        back_populates="student", cascade="all, delete-orphan", order_by="StudentPhoto.id"
    )

    @property
    def face_enrolled(self) -> bool:
        return self.face_embedding is not None


class StudentPhoto(Base):
    """An enrollment photo kept in the private S3 bucket (key only; never a public URL)."""

    __tablename__ = "student_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    s3_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student: Mapped[Student] = relationship(back_populates="photos")
