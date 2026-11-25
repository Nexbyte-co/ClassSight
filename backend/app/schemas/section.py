from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class _Years(BaseModel):
    start_year: int | None = Field(default=None, ge=1990, le=2100)
    end_year: int | None = Field(default=None, ge=1990, le=2100)

    @model_validator(mode="after")
    def years_make_sense(self):
        if (self.start_year is None) != (self.end_year is None):
            raise ValueError("Give both the first and the last year, or neither")
        if self.start_year is not None and not 1 <= self.end_year - self.start_year <= 7:
            raise ValueError("A batch lasts between 1 and 7 years")
        return self


class SectionCreate(_Years):
    name: Name
    degree_programme: str = Field(default="", max_length=160)


class SectionOut(BaseModel):
    id: int
    name: str
    student_count: int
    parent_id: int | None = None  # the batch this one is a subbatch of
    degree_programme: str = ""
    start_year: int | None = None
    end_year: int | None = None


class SectionUpdate(_Years):
    name: Name
    degree_programme: str = Field(default="", max_length=160)
