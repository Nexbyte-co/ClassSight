from typing import Annotated

from pydantic import BaseModel, StringConstraints


class DepartmentCreate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class DepartmentOut(BaseModel):
    id: int
    name: str
