from datetime import time

from pydantic import BaseModel, Field, field_validator, model_validator


# Classes only run in this window (wall-clock, inclusive); the frontend timetable shows the same range.
DAY_START = time(8, 0)
DAY_END = time(20, 0)


class LectureCreate(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday ... 6 = Sunday")
    start_time: time
    end_time: time
    room: str = Field(default="", max_length=40)

    @field_validator("start_time", "end_time")
    @classmethod
    def no_timezone(cls, value: time) -> time:
        # Lectures are wall-clock times; an offset would also break the comparison below.
        if value.tzinfo is not None:
            raise ValueError("times must not include a timezone")
        return value

    @model_validator(mode="after")
    def end_after_start(self) -> "LectureCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        if self.start_time < DAY_START or self.end_time > DAY_END:
            raise ValueError("lectures must be between 08:00 and 20:00")
        return self


class LectureOut(BaseModel):
    id: int
    classroom_id: int
    weekday: int
    start_time: time
    end_time: time
    room: str

    model_config = {"from_attributes": True}


class ScheduledLectureOut(LectureOut):
    """A lecture with the details of its class, for the dashboard's schedule."""

    course: str
    section: str
    course_code: str
    department: str
