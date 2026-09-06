from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceSession
    from app.models.student import Student
    from app.models.user import User


class Classroom(Base):
    __tablename__ = "classrooms"
    __table_args__ = (
        UniqueConstraint("course", "section", name="uq_classrooms_course_section"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course: Mapped[str] = mapped_column(String(120), nullable=False)
    section: Mapped[str] = mapped_column(String(40), nullable=False)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    teacher: Mapped[User] = relationship(back_populates="classrooms")
    students: Mapped[list[Student]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )
    attendance_sessions: Mapped[list[AttendanceSession]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )
