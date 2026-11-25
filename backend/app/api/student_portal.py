from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_student
from app.db.session import get_db
from app.models import AttendanceRecord, AttendanceSession, Classroom, Student
from app.services import s3_service
from app.services.enrollment import S3_ERRORS
from app.services.sections import ancestor_ids
from app.schemas.student_portal import (
    PortalClass,
    PortalLecture,
    PortalRecord,
    StudentMeOut,
    StudentOverviewOut,
)

# Everything here is scoped to the signed-in student: there is no id in the URL to tamper with.
router = APIRouter(prefix="/student", tags=["student"])


def _me(student: Student) -> StudentMeOut:
    return StudentMeOut(
        id=student.id,
        name=student.name,
        email=student.email,
        roll_number=student.roll_number,
        section_id=student.section_id,
        section_name=student.section.name,
        face_enrolled=student.face_enrolled,
    )


@router.get("/me", response_model=StudentMeOut)
def read_me(student: Student = Depends(get_current_student)) -> StudentMeOut:
    return _me(student)


@router.get("/me/photo")
def my_photo(student: Student = Depends(get_current_student)) -> Response:
    """The student's own first enrolled photo (the one the admin set), used as their avatar."""
    photo = min(student.photos, key=lambda p: p.id, default=None)
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No enrolled photo")
    try:
        data = s3_service.get_object_bytes(photo.s3_key)
    except S3_ERRORS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Photo storage is unavailable") from None
    media = "image/png" if photo.s3_key.lower().endswith(".png") else "image/jpeg"
    return Response(content=data, media_type=media, headers={"Cache-Control": "private, max-age=300"})


@router.get("/overview", response_model=StudentOverviewOut)
def overview(
    student: Student = Depends(get_current_student), db: Session = Depends(get_db)
) -> StudentOverviewOut:
    """The student's batch timetable (all classes of their section) and their own attendance."""
    classrooms = (
        db.query(Classroom)
        .options(joinedload(Classroom.teacher), joinedload(Classroom.lectures))
        .filter(
            Classroom.section_id.in_(ancestor_ids(db, student.section_id)),
            Classroom.subbatch.in_(["", student.subbatch]),
        )
        .order_by(Classroom.course, Classroom.id)
        .all()
    )
    classes = [
        PortalClass(
            id=c.id,
            course=c.course,
            course_code=c.course_code,
            department=c.department,
            teacher_name=c.teacher.name if c.teacher else "",
            lectures=[
                PortalLecture(
                    id=lec.id,
                    weekday=lec.weekday,
                    start_time=lec.start_time,
                    end_time=lec.end_time,
                    room=lec.room,
                )
                for lec in sorted(c.lectures, key=lambda x: (x.weekday, x.start_time))
            ],
        )
        for c in classrooms
    ]
    rows = (
        db.query(AttendanceSession.classroom_id, AttendanceSession.session_date, AttendanceRecord.status)
        .join(AttendanceRecord, AttendanceRecord.session_id == AttendanceSession.id)
        .filter(
            AttendanceRecord.student_id == student.id,
            AttendanceSession.classroom_id.in_([c.id for c in classrooms] or [0]),
        )
        .order_by(AttendanceSession.session_date)
        .all()
    )
    records = [PortalRecord(classroom_id=a, session_date=b, status=s) for a, b, s in rows]
    return StudentOverviewOut(student=_me(student), classes=classes, records=records)
