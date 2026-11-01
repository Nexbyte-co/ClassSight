import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_owned_classroom, require_roles
from app.db.session import get_db
from app.models import Classroom, Section, Student, User, UserRole
from app.schemas.classroom import ClassroomCreate, ClassroomOut
from app.schemas.student import StudentOut, VerificationOut, VerifiedStudent
from app.services import face_recognition
from app.services.enrollment import read_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


@router.get("", response_model=list[ClassroomOut])
def list_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN)),
) -> list[Classroom]:
    query = db.query(Classroom).options(joinedload(Classroom.section_group))
    if current_user.role == UserRole.TEACHER:
        query = query.filter(Classroom.teacher_id == current_user.id)
    return query.order_by(Classroom.id).all()


def _get_or_create_section(db: Session, name: str) -> tuple[Section, bool]:
    """The section with this name (ignoring case) and whether it was just created."""
    name = name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Section name is required"
        )

    def find() -> Section | None:
        return db.query(Section).filter(func.lower(Section.name) == name.lower()).first()

    section = find()
    if section is not None:
        return section, False
    section = Section(name=name)
    db.add(section)
    try:
        db.flush()
    except IntegrityError:  # another request created it first
        db.rollback()
        section = find()
        if section is None:
            raise
        return section, False
    return section, True


@router.post("", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
def create_classroom(
    payload: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN)),
) -> Classroom:
    if current_user.role == UserRole.TEACHER and payload.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers can only create classrooms assigned to themselves",
        )

    teacher = db.get(User, payload.teacher_id)
    if teacher is None or teacher.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="teacher_id must reference an existing teacher",
        )

    section, created = _get_or_create_section(db, payload.section)
    # A section's students are shared by all its classes, so a teacher may only join a section
    # they already teach (or start a new one). Attaching to anyone else's is for admins.
    if not created and current_user.role == UserRole.TEACHER:
        teaches_it = (
            db.query(Classroom.id)
            .filter(Classroom.section_id == section.id, Classroom.teacher_id == current_user.id)
            .first()
        )
        if teaches_it is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="That section already exists. Ask an admin to add a class to it.",
            )
    existing = (
        db.query(Classroom)
        .filter(func.lower(Classroom.course) == payload.course.strip().lower(), Classroom.section_id == section.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A classroom with this course and section already exists",
        )

    classroom = Classroom(
        course=payload.course.strip(),
        section_id=section.id,
        teacher_id=payload.teacher_id,
        course_code=payload.course_code.strip(),
        department=payload.department.strip(),
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


@router.get("/{classroom_id}", response_model=ClassroomOut)
def get_classroom(classroom: Classroom = Depends(get_owned_classroom)) -> Classroom:
    return classroom


@router.get("/{classroom_id}/students", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db), classroom: Classroom = Depends(get_owned_classroom)
) -> list[Student]:
    return (
        db.query(Student)
        .filter(Student.section_id == classroom.section_id)
        .order_by(Student.roll_number)
        .all()
    )


@router.post("/{classroom_id}/verify", response_model=VerificationOut)
def verify_student(
    file: UploadFile,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> VerificationOut:
    """Identify the one student in a captured photo among this classroom's enrolled students."""
    content = read_image(file)
    candidates = [
        (student.id, face_recognition.embedding_from_bytes(student.face_embedding))
        for student in db.query(Student).filter(
            Student.section_id == classroom.section_id, Student.face_embedding.is_not(None)
        )
    ]
    logger.info("verify classroom %d: %d enrolled candidate(s)", classroom.id, len(candidates))
    if not candidates:
        return VerificationOut(
            verified=False, student=None, confidence=None, reason="no_enrolled_students"
        )

    try:
        faces = face_recognition.extract_main_face(content)
    except face_recognition.InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    logger.info("verify classroom %d: %d face(s) found", classroom.id, len(faces))
    if len(faces) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Expected exactly one face in the photo, found {len(faces)}",
        )

    # One face and >= 1 candidate, so the face is always assigned (never UNASSIGNED).
    decision = face_recognition.match_embeddings(faces, candidates).decisions[0]
    student = db.get(Student, decision.student_id) if decision.student_id is not None else None
    return VerificationOut(
        verified=student is not None,
        student=VerifiedStudent.model_validate(student, from_attributes=True)
        if student is not None
        else None,
        confidence=decision.confidence,
        reason=decision.reason,
    )
