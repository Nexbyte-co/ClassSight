from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    roll_number: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)


class StudentOut(BaseModel):
    id: int
    roll_number: str
    name: str
    classroom_id: int

    model_config = {"from_attributes": True}
