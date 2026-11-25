from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

SUBBATCH_PATTERN = r"^[A-Za-z0-9]{0,10}$"

MAX_PER_WEEK = 20


class ProgrammeIn(BaseModel):
    """A degree programme a subject is allotted to, and the first year of the batch it is meant for."""

    degree_programme: str = Field(min_length=1, max_length=160)
    start_year: int | None = Field(default=None, ge=1990, le=2100)


class ProgrammeOut(BaseModel):
    degree_programme: str
    start_year: int | None = None

    model_config = {"from_attributes": True}


class ClassroomCreate(BaseModel):
    course: str = Field(min_length=1, max_length=120)
    section: str = Field(default="", max_length=40)  # batch name; empty = no batch yet (admin only)
    teacher_id: int | None = None  # empty = no teacher yet (admin only)
    course_code: str = Field(default="", max_length=20)
    department: str = Field(default="", max_length=120)
    # How many of each kind of session the subject has per week; a single lecture unless said otherwise.
    lecture_count: int = Field(default=1, ge=0, le=MAX_PER_WEEK)
    lab_count: int = Field(default=0, ge=0, le=MAX_PER_WEEK)
    tutorial_count: int = Field(default=0, ge=0, le=MAX_PER_WEEK)
    category: Literal["core", "elective"] = "core"
    degree_programme: str = Field(default="", max_length=160)
    # Every programme the subject is allotted to; when given it wins over `degree_programme`.
    programmes: list[ProgrammeIn] = Field(default_factory=list, max_length=30)
    subbatch: str = Field(default="", pattern=SUBBATCH_PATTERN)  # empty = the whole batch

    @field_validator("subbatch")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def at_least_one_session(self) -> "ClassroomCreate":
        if self.lecture_count + self.lab_count + self.tutorial_count == 0:
            raise ValueError("Choose at least one lecture, lab or tutorial")
        return self


class ClassroomOut(BaseModel):
    id: int
    course: str
    section: str
    teacher_id: int | None
    course_code: str
    department: str
    lecture_count: int
    lab_count: int
    tutorial_count: int
    credits: float  # 1 per lecture and lab, 0.5 per tutorial (per week)
    category: str
    degree_programme: str  # the first allotted programme, or empty
    programmes: list[ProgrammeOut] = []
    subbatch: str = ""

    model_config = {"from_attributes": True}


class ClassroomUpdate(BaseModel):
    """Admin changes to a class: rename it, hand it to another teacher, change its sessions per week, its
    category or the programmes it is allotted to."""

    course: str | None = Field(default=None, min_length=1, max_length=120)
    course_code: str | None = Field(default=None, max_length=20)
    teacher_id: int | None = None
    lecture_count: int | None = Field(default=None, ge=0, le=MAX_PER_WEEK)
    lab_count: int | None = Field(default=None, ge=0, le=MAX_PER_WEEK)
    tutorial_count: int | None = Field(default=None, ge=0, le=MAX_PER_WEEK)
    category: Literal["core", "elective"] | None = None
    degree_programme: str | None = Field(default=None, max_length=160)
    programmes: list[ProgrammeIn] | None = Field(default=None, max_length=30)  # replaces the whole list
    section: str | None = Field(default=None, max_length=40)  # attach an existing batch by name
