from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.classroom import Classroom


class ClassroomProgramme(Base):
    """A degree programme a class (subject) is allotted to, with the first year of the batch it is meant for.
    A subject can be allotted to several programmes; `Classroom.degree_programme` mirrors the first one."""

    __tablename__ = "classroom_programmes"
    __table_args__ = (UniqueConstraint("classroom_id", "degree_programme", name="uq_classroom_programmes"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    degree_programme: Mapped[str] = mapped_column(String(160), nullable=False)
    start_year: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    classroom: Mapped[Classroom] = relationship(back_populates="programmes")
