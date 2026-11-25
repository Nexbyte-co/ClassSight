from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models import AttendanceStatus


class AttendanceSessionCreate(BaseModel):
    classroom_id: int
    session_date: date


class AttendanceSessionOut(BaseModel):
    id: int
    classroom_id: int
    session_date: date
    photo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceUploadOut(BaseModel):
    session_id: int
    photo_url: str


class RecognizedStudent(BaseModel):
    student_id: int
    roll_number: str
    name: str
    confidence: float = Field(ge=0, le=1)


class FaceSuggestion(BaseModel):
    """A face the model could not accept but thinks may be this student: "is this <name>?"."""

    student_id: int
    roll_number: str
    name: str
    confidence: float = Field(ge=0, le=1)  # how similar the face is to the student's enrolled face
    box: list[float] = Field(min_length=4, max_length=4)  # x1, y1, x2, y2 as fractions of the photo
    reason: str  # below_threshold | ambiguous


class AttendanceProcessOut(BaseModel):
    session_id: int
    recognized_students: list[RecognizedStudent]
    unrecognized_face_count: int
    suggestions: list[FaceSuggestion] = []


class AttendanceRecordIn(BaseModel):
    student_id: int
    status: AttendanceStatus
    recognition_confidence: float | None = Field(default=None, ge=0, le=1)


class AttendanceConfirmRequest(BaseModel):
    records: list[AttendanceRecordIn]


class AttendanceRecordOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    status: AttendanceStatus
    recognition_confidence: float | None

    model_config = {"from_attributes": True}


class AttendanceLogOut(BaseModel):
    session: AttendanceSessionOut
    records: list[AttendanceRecordOut]


class NfcTapOut(BaseModel):
    """The student a tapped NFC card belongs to."""

    student_id: int
    roll_number: str
    name: str

