from typing import Annotated

from pydantic import BaseModel, StringConstraints


class SectionCreate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class SectionOut(BaseModel):
    id: int
    name: str
    student_count: int
