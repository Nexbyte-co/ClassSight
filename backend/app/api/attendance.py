import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import (
    AttendanceRecord,
    AttendanceSession,
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
    FaceSuggestion,
    NfcTapOut,
    RecognizedStudent,
)
from app.schemas.student import NfcCardIn
from app.services import face_recognition, s3_service
from app.services.enrollment import roster_filter, student_for_card

logger = logging.getLogger(__name__)

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

    students = db.query(Student).filter(*roster_filter(classroom)).all()
    students_by_id = {student.id: student for student in students}

    candidates = [
        (student.id, student.face_embedding)
        for student in students
        if student.face_embedding is not None
    ]
    logger.info(
        "process session %d: %d student(s), %d enrolled",
        session.id,
        len(students),
        len(candidates),
    )
    if candidates:
        image_bytes = s3_service.get_object_bytes(
            s3_service.key_from_url(session.photo_url)
        )
        try:
            result = face_recognition.recognize_faces(image_bytes, candidates)
        except face_recognition.InvalidImageError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded session photo could not be read as an image",
            ) from exc
    else:
        result = face_recognition.RecognitionResult(decisions=[])

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

    suggestions = [
        FaceSuggestion(
            student_id=d.candidate_id,
            roll_number=students_by_id[d.candidate_id].roll_number,
            name=students_by_id[d.candidate_id].name,
            confidence=d.confidence,
            box=list(d.box),
            reason=d.reason,
        )
        for d in result.suggestions
        if d.candidate_id in students_by_id and d.box is not None
    ]

    return AttendanceProcessOut(
        session_id=session.id,
        recognized_students=recognized,
        unrecognized_face_count=result.unrecognized_face_count,
        suggestions=suggestions,
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
        .filter(*roster_filter(classroom), Student.id.in_(student_ids))
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


@router.post("/nfc", response_model=NfcTapOut)
def nfc_tap(
    classroom_id: int,
    payload: NfcCardIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NfcTapOut:
    """Who a tapped NFC card belongs to, for a class the user can take attendance in. Nothing is saved here:
    the page marks the student present and saves with the rest of the record (POST /confirm)."""
    classroom = _authorize_classroom(db.get(Classroom, classroom_id), current_user)
    student = student_for_card(db, classroom, payload.uid)
    return NfcTapOut(student_id=student.id, roll_number=student.roll_number, name=student.name)


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
