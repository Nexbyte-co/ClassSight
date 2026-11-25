from datetime import date, time

from pydantic import BaseModel

from app.models import AttendanceStatus


class StudentMeOut(BaseModel):
    id: int
    name: str
    email: str | None
    roll_number: str
    section_id: int
    section_name: str
    face_enrolled: bool


class PortalLecture(BaseModel):
    id: int
    weekday: int  # 0 = Monday ... 6 = Sunday
    start_time: time
    end_time: time
    room: str


class PortalClass(BaseModel):
    id: int
    course: str
    course_code: str
    department: str
    teacher_name: str
    lectures: list[PortalLecture]


class PortalRecord(BaseModel):
    classroom_id: int
    session_date: date
    status: AttendanceStatus


class StudentOverviewOut(BaseModel):
    student: StudentMeOut
    classes: list[PortalClass]
    records: list[PortalRecord]
