from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

SUBBATCH_PATTERN = r"^[A-Za-z0-9]{0,10}$"


def _subbatch(v: str | None) -> str | None:
    return v.strip().upper() if v is not None else v


class StudentCreate(BaseModel):
    roll_number: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    subbatch: str = Field(default="", pattern=SUBBATCH_PATTERN)

    _norm = field_validator("subbatch")(_subbatch)


class StudentUpdate(BaseModel):
    roll_number: str | None = Field(default=None, min_length=1, max_length=40)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    section_id: int | None = None
    subbatch: str | None = Field(default=None, pattern=SUBBATCH_PATTERN)

    _norm = field_validator("subbatch")(_subbatch)


class FaceEnrollmentOut(BaseModel):
    student_id: int
    photos_used: int


class StudentOut(BaseModel):
    id: int
    roll_number: str
    name: str
    section_id: int
    subbatch: str = ""
    email: str | None = None
    face_enrolled: bool
    nfc_linked: bool = False

    model_config = {"from_attributes": True}


class StudentPhotoOut(BaseModel):
    id: int
    url: str  # presigned, expires after a few minutes
    created_at: datetime


class StudentProfileOut(StudentOut):
    photos: list[StudentPhotoOut]
    nfc_uid: str | None = None  # admin only (this profile is only served under /sections)


def normalize_nfc_uid(value: str) -> str:
    """'04:a2:3b:1c' / '04 A2 3B 1C' / '04a23b1c' -> '04A23B1C'. A card UID is 4, 7 or 10 bytes; up to 20 allowed."""
    uid = "".join(ch for ch in value if ch not in ": -").upper()
    if not uid or any(ch not in "0123456789ABCDEF" for ch in uid) or len(uid) % 2 or not 8 <= len(uid) <= 40:
        raise ValueError("Enter the card's serial number in hex, e.g. 04:A2:3B:1C:5D:80")
    return uid


class NfcCardIn(BaseModel):
    uid: str = Field(min_length=1, max_length=80)

    @field_validator("uid")
    @classmethod
    def _uid(cls, v: str) -> str:
        return normalize_nfc_uid(v)


class NfcCardOut(BaseModel):
    student_id: int
    nfc_uid: str | None


class VerifiedStudent(BaseModel):
    id: int
    roll_number: str
    name: str


class VerificationOut(BaseModel):
    verified: bool
    student: VerifiedStudent | None
    confidence: float | None = Field(default=None, ge=0, le=1)
    reason: Literal["matched", "below_threshold", "ambiguous", "no_enrolled_students"]
