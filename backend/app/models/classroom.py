from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceSession
    from app.models.lecture import Lecture
    from app.models.section import Section
    from app.models.student import Student
    from app.models.user import User


class Classroom(Base):
    __tablename__ = "classrooms"
    __table_args__ = (
        UniqueConstraint("course", "section_id", name="uq_classrooms_course_section"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course: Mapped[str] = mapped_column(String(120), nullable=False)
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id"), nullable=False, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    # Shown on the dashboard next to the course name; empty when not set.
    course_code: Mapped[str] = mapped_column(String(20), nullable=False, default="", server_default="")
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")

    teacher: Mapped[User] = relationship(back_populates="classrooms")
    section_group: Mapped[Section] = relationship(back_populates="classrooms")
    attendance_sessions: Mapped[list[AttendanceSession]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )
    lectures: Mapped[list[Lecture]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )

    @property
    def section(self) -> str:
        """The section's name (what the API shows as `section`)."""
        return self.section_group.name

    @property
    def students(self) -> list[Student]:
        """The section's students: shared by every class of the section."""
        return self.section_group.students
