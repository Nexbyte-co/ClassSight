from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.classroom import Classroom
    from app.models.student import Student


class Section(Base):
    """A group of students (for example "3C2"). Its name is unique, ignoring case.

    Students belong to a section; every class (a course taught to the section) shares the
    section's students, so a student is added and enrolled once."""

    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    # The batch's degree programme (one of app.core.degree_programmes) and the years it studies, e.g. 2024-2028.
    degree_programme: Mapped[str] = mapped_column(String(160), nullable=False, default="", server_default="")
    start_year: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    end_year: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # A subbatch's batch: 3C23 belongs to 3C2 (the longest other batch name its own name starts with).
    # Classes of the batch are attended by the students of its subbatches too.
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True
    )

    parent: Mapped[Section | None] = relationship(back_populates="children", remote_side="Section.id")
    children: Mapped[list[Section]] = relationship(back_populates="parent")
    classrooms: Mapped[list[Classroom]] = relationship(back_populates="section_group")
    students: Mapped[list[Student]] = relationship(
        back_populates="section", cascade="all, delete-orphan"
    )


    def family_students(self) -> list[Student]:
        """This batch's own students plus those of every subbatch below it."""
        students = list(self.students)
        for child in self.children:
            students.extend(child.family_students())
        return students


# "3C2" and "3c2" are the same section.
Index("uq_sections_name_lower", func.lower(Section.name), unique=True)
