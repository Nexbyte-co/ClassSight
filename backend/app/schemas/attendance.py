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


class AttendanceProcessOut(BaseModel):
    session_id: int
    recognized_students: list[RecognizedStudent]
    unrecognized_face_count: int


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


class ClassroomAnalyticsOut(BaseModel):
    classroom_id: int
    total_sessions: int
    total_students: int
    average_attendance_rate: float
    present_count: int
    absent_count: int
    excused_count: int
