from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    Classroom,
    Student,
    User,
    UserRole,
)
from app.schemas.attendance import (
    AttendanceConfirmRequest,
    AttendanceLogOut,
    AttendanceProcessOut,
    AttendanceRecordOut,
    AttendanceSessionCreate,
    AttendanceSessionOut,
    AttendanceUploadOut,
    ClassroomAnalyticsOut,
    RecognizedStudent,
)
from app.services import face_recognition, s3_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _authorize_classroom(
    classroom: Classroom | None, current_user: User
) -> Classroom:
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if current_user.role == UserRole.ADMIN:
        return classroom
    if current_user.role == UserRole.TEACHER and classroom.teacher_id == current_user.id:
        return classroom
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this classroom",
    )


def _get_owned_session(
    session_id: int, db: Session, current_user: User
) -> tuple[AttendanceSession, Classroom]:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    classroom = db.get(Classroom, session.classroom_id)
    _authorize_classroom(classroom, current_user)
    return session, classroom


@router.post("/session", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceSession:
    classroom = db.get(Classroom, payload.classroom_id)
    _authorize_classroom(classroom, current_user)

    existing = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.classroom_id == payload.classroom_id,
            AttendanceSession.session_date == payload.session_date,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An attendance session already exists for this classroom and date",
        )

    session = AttendanceSession(
        classroom_id=payload.classroom_id, session_date=payload.session_date
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/upload", response_model=AttendanceUploadOut)
async def upload_session_photo(
    session_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceUploadOut:
    session, classroom = _get_owned_session(session_id, db, current_user)

    if file.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only JPEG and PNG images are supported",
        )

    content = await file.read()
    photo_url = s3_service.upload_session_photo(
        classroom_id=classroom.id,
        session_id=session.id,
        content=content,
        content_type=file.content_type,
    )
    session.photo_url = photo_url
    db.commit()
    return AttendanceUploadOut(session_id=session.id, photo_url=photo_url)


@router.post("/process", response_model=AttendanceProcessOut)
def process_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceProcessOut:
    session, classroom = _get_owned_session(session_id, db, current_user)
    if session.photo_url is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload a session photo before processing",
        )

    students = db.query(Student).filter(Student.classroom_id == classroom.id).all()
    students_by_id = {student.id: student for student in students}

    result = face_recognition.recognize_faces(
        photo_url=session.photo_url, candidate_student_ids=list(students_by_id)
    )

    recognized = [
        RecognizedStudent(
            student_id=match.student_id,
            roll_number=students_by_id[match.student_id].roll_number,
            name=students_by_id[match.student_id].name,
            confidence=match.confidence,
        )
        for match in result.matches
        if match.student_id in students_by_id
    ]

    return AttendanceProcessOut(
        session_id=session.id,
        recognized_students=recognized,
        unrecognized_face_count=result.unrecognized_face_count,
    )


@router.post("/confirm", response_model=list[AttendanceRecordOut])
def confirm_session(
    session_id: int,
    payload: AttendanceConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AttendanceRecord]:
    session, classroom = _get_owned_session(session_id, db, current_user)

    student_ids = [record.student_id for record in payload.records]
    valid_student_ids = {
        student.id
        for student in db.query(Student.id)
        .filter(Student.classroom_id == classroom.id, Student.id.in_(student_ids))
        .all()
    }
    unknown_ids = set(student_ids) - valid_student_ids
    if unknown_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Students not in this classroom: {sorted(unknown_ids)}",
        )

    db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.id).delete()

    records = [
        AttendanceRecord(
            session_id=session.id,
            student_id=record.student_id,
            status=record.status,
            recognition_confidence=record.recognition_confidence,
        )
        for record in payload.records
    ]
    db.add_all(records)
    db.commit()
    for record in records:
        db.refresh(record)
    return records


@router.get("/logs", response_model=list[AttendanceLogOut])
def list_logs(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AttendanceLogOut]:
    classroom = db.get(Classroom, classroom_id)
    _authorize_classroom(classroom, current_user)

    sessions = (
        db.query(AttendanceSession)
        .filter(AttendanceSession.classroom_id == classroom_id)
        .order_by(AttendanceSession.session_date.desc())
        .all()
    )
    return [
        AttendanceLogOut(session=session, records=session.records) for session in sessions
    ]


@router.get("/analytics", response_model=ClassroomAnalyticsOut)
def get_analytics(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClassroomAnalyticsOut:
    classroom = db.get(Classroom, classroom_id)
    _authorize_classroom(classroom, current_user)

    total_sessions = (
        db.query(func.count(AttendanceSession.id))
        .filter(AttendanceSession.classroom_id == classroom_id)
        .scalar()
        or 0
    )
    total_students = (
        db.query(func.count(Student.id)).filter(Student.classroom_id == classroom_id).scalar()
        or 0
    )

    status_counts = dict.fromkeys(AttendanceStatus, 0)
    rows = (
        db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .filter(AttendanceSession.classroom_id == classroom_id)
        .group_by(AttendanceRecord.status)
        .all()
    )
    for record_status, count in rows:
        status_counts[record_status] = count

    total_records = sum(status_counts.values())
    average_attendance_rate = (
        status_counts[AttendanceStatus.PRESENT] / total_records if total_records else 0.0
    )

    return ClassroomAnalyticsOut(
        classroom_id=classroom_id,
        total_sessions=total_sessions,
        total_students=total_students,
        average_attendance_rate=average_attendance_rate,
        present_count=status_counts[AttendanceStatus.PRESENT],
        absent_count=status_counts[AttendanceStatus.ABSENT],
        excused_count=status_counts[AttendanceStatus.EXCUSED],
    )
