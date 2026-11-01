from datetime import time

from pydantic import BaseModel, Field, field_validator, model_validator


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
