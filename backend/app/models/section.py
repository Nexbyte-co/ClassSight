from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Index, String, func
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

    classrooms: Mapped[list[Classroom]] = relationship(back_populates="section_group")
    students: Mapped[list[Student]] = relationship(
        back_populates="section", cascade="all, delete-orphan"
    )


# "3C2" and "3c2" are the same section.
Index("uq_sections_name_lower", func.lower(Section.name), unique=True)
