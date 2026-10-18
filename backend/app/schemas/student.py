from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    roll_number: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)


class FaceEnrollmentOut(BaseModel):
    student_id: int
    photos_used: int


class StudentOut(BaseModel):
    id: int
    roll_number: str
    name: str
    classroom_id: int
    face_enrolled: bool

    model_config = {"from_attributes": True}


class StudentPhotoOut(BaseModel):
    id: int
    url: str  # presigned, expires after a few minutes
    created_at: datetime


class StudentProfileOut(StudentOut):
    photos: list[StudentPhotoOut]


class VerifiedStudent(BaseModel):
    id: int
    roll_number: str
    name: str


class VerificationOut(BaseModel):
    verified: bool
    student: VerifiedStudent | None
    confidence: float | None = Field(default=None, ge=0, le=1)
    reason: Literal["matched", "below_threshold", "ambiguous", "no_enrolled_students"]
