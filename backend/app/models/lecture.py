from __future__ import annotations

from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.classroom import Classroom


class Lecture(Base):
    """A weekly slot of a class: a lecture, a lab or a tutorial. A class may have several slots of one
    kind on a weekday, but not two of the same kind starting at the same time (attendance is still one session per
    class per day)."""

    __tablename__ = "lectures"
    __table_args__ = (
        UniqueConstraint("classroom_id", "weekday", "session_type", "start_time", name="uq_lectures_classroom_weekday_type_start"),
        CheckConstraint("session_type IN ('lecture', 'lab', 'tutorial')", name="ck_lectures_session_type"),
        CheckConstraint("weekday >= 0 AND weekday <= 6", name="ck_lectures_weekday"),
        CheckConstraint("end_time > start_time", name="ck_lectures_end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0 = Monday ... 6 = Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    session_type: Mapped[str] = mapped_column(String(10), nullable=False, default="lecture", server_default="lecture")
    room: Mapped[str] = mapped_column(String(40), nullable=False, default="", server_default="")

    classroom: Mapped[Classroom] = relationship(back_populates="lectures")
