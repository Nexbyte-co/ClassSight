from __future__ import annotations

from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.classroom import Classroom


class Lecture(Base):
    """A weekly lecture slot of a class. One slot per class per weekday, matching the
    one attendance session per class per day."""

    __tablename__ = "lectures"
    __table_args__ = (
        UniqueConstraint("classroom_id", "weekday", name="uq_lectures_classroom_weekday"),
        CheckConstraint("weekday >= 0 AND weekday <= 6", name="ck_lectures_weekday"),
        CheckConstraint("end_time > start_time", name="ck_lectures_end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0 = Monday ... 6 = Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    room: Mapped[str] = mapped_column(String(40), nullable=False, default="", server_default="")

    classroom: Mapped[Classroom] = relationship(back_populates="lectures")
