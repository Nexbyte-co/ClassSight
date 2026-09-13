from pydantic import BaseModel, Field


class ClassroomCreate(BaseModel):
    course: str = Field(min_length=1, max_length=120)
    section: str = Field(min_length=1, max_length=40)
    teacher_id: int


class ClassroomOut(BaseModel):
    id: int
    course: str
    section: str
    teacher_id: int

    model_config = {"from_attributes": True}
