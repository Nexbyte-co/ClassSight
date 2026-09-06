from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceRecord
    from app.models.classroom import Classroom


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("classroom_id", "roll_number", name="uq_students_classroom_roll_number"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    roll_number: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False)
    face_embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    classroom: Mapped[Classroom] = relationship(back_populates="students")
    attendance_records: Mapped[list[AttendanceRecord]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
