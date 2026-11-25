from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceSession
    from app.models.classroom_programme import ClassroomProgramme
    from app.models.lecture import Lecture
    from app.models.section import Section
    from app.models.student import Student
    from app.models.user import User


class Classroom(Base):
    __tablename__ = "classrooms"
    __table_args__ = (
        UniqueConstraint("course", "section_id", "subbatch", name="uq_classrooms_course_section"),
        CheckConstraint("category IN ('core', 'elective')", name="ck_classrooms_category"),
        CheckConstraint(
            "lecture_count >= 0 AND lab_count >= 0 AND tutorial_count >= 0 "
            "AND lecture_count + lab_count + tutorial_count > 0",
            name="ck_classrooms_session_counts",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course: Mapped[str] = mapped_column(String(120), nullable=False)
    # NULL = the subject exists but has not been given a batch yet (admins attach one later).
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"), nullable=True, index=True)
    # NULL = no teacher assigned yet (an admin gives the subject to a teacher later).
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    # Shown on the dashboard next to the course name; empty when not set.
    course_code: Mapped[str] = mapped_column(String(20), nullable=False, default="", server_default="")
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")

    # Empty = the whole batch (lectures); "A" = only that subbatch's students (usually a lab or tutorial).
    subbatch: Mapped[str] = mapped_column(String(10), nullable=False, default="", server_default="")

    # How many lectures, labs and tutorials this subject has per week in this batch (0 = none of that kind;
    # at least one kind is above 0).
    lecture_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1, server_default="1")
    lab_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0, server_default="0")
    tutorial_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0, server_default="0")

    # One entry of app.core.degree_programmes.DEGREE_PROGRAMMES, or empty.
    degree_programme: Mapped[str] = mapped_column(String(160), nullable=False, default="", server_default="")
    # Exactly one of "core" or "elective".
    category: Mapped[str] = mapped_column(String(10), nullable=False, default="core", server_default="core")

    teacher: Mapped[User | None] = relationship(back_populates="classrooms")
    section_group: Mapped[Section | None] = relationship(back_populates="classrooms")
    attendance_sessions: Mapped[list[AttendanceSession]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )
    lectures: Mapped[list[Lecture]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan"
    )
    # Every degree programme the subject is allotted to (the first is also `degree_programme`).
    programmes: Mapped[list[ClassroomProgramme]] = relationship(
        back_populates="classroom", cascade="all, delete-orphan", order_by="ClassroomProgramme.id"
    )

    @property
    def credits(self) -> float:
        """Subject credits per week: 1 for every lecture and every lab, 0.5 for every tutorial."""
        return (self.lecture_count + self.lab_count) * 1.0 + self.tutorial_count * 0.5

    @property
    def section(self) -> str:
        """The section's name (what the API shows as `section`)."""
        return self.section_group.name if self.section_group else ""

    @property
    def students(self) -> list[Student]:
        """The students who attend this class: the whole section, or just its subbatch."""
        if not self.section_group:
            return []
        everyone = self.section_group.family_students()  # the batch and its subbatches
        if not self.subbatch:
            return everyone
        return [s for s in everyone if s.subbatch == self.subbatch]
