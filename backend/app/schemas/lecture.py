from datetime import time
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


SessionType = Literal["lecture", "lab", "tutorial"]


def _no_timezone(value: time | None) -> time | None:
    # Slots are wall-clock times; an offset would also break the comparison of start and end.
    if value is not None and value.tzinfo is not None:
        raise ValueError("times must not include a timezone")
    return value


class LectureCreate(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday ... 6 = Sunday")
    start_time: time
    end_time: time
    room: str = Field(default="", max_length=40)
    session_type: SessionType = "lecture"

    @field_validator("start_time", "end_time")
    @classmethod
    def no_timezone(cls, value: time) -> time:
        return _no_timezone(value)

    @model_validator(mode="after")
    def end_after_start(self) -> "LectureCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class LectureUpdate(BaseModel):
    """Change a weekly slot: any of its day, times, venue or kind."""

    weekday: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = Field(default=None, max_length=40)
    session_type: SessionType | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def no_timezone(cls, value: time | None) -> time | None:
        return _no_timezone(value)


class LectureOut(BaseModel):
    id: int
    classroom_id: int
    weekday: int
    start_time: time
    end_time: time
    room: str
    session_type: str = "lecture"

    model_config = {"from_attributes": True}


class ScheduledLectureOut(LectureOut):
    """A lecture with the details of its class, for the dashboard's schedule."""

    course: str
    section: str
    course_code: str
    department: str


class LectureMove(BaseModel):
    """Where one slot moves to: its new weekday and times (venue and kind stay)."""

    lecture_id: int
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @field_validator("start_time", "end_time")
    @classmethod
    def no_timezone(cls, value: time) -> time:
        return _no_timezone(value)

    @model_validator(mode="after")
    def end_after_start(self) -> "LectureMove":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class LectureMoves(BaseModel):
    """Several slots moved at once (the admin's drag-and-drop timetable); all or nothing."""

    moves: list[LectureMove] = Field(min_length=1, max_length=200)
