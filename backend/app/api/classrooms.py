import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.degree_programmes import canonical_programme
from app.core.deps import get_owned_classroom, require_roles
from app.db.session import get_db
from app.models import Classroom, ClassroomProgramme, Department, Section, Student, User, UserRole
from app.schemas.classroom import ClassroomCreate, ClassroomOut, ClassroomUpdate, ProgrammeIn
from app.schemas.student import StudentOut, VerificationOut, VerifiedStudent
from app.services import face_recognition
from app.services import activity, s3_service
from app.services.enrollment import S3_ERRORS, read_image, roster_filter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


def _canonical_programmes(db: Session, items: list[ProgrammeIn]) -> list[tuple[str, int | None]]:
    """The allotted programmes with their list spelling, each once; an unknown or repeated one is a 422."""
    out: list[tuple[str, int | None]] = []
    seen: set[str] = set()
    for item in items:
        name = canonical_programme(item.degree_programme)
        if name is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown degree programme: {item.degree_programme}. Choose from GET /degree-programmes.",
            )
        if name in seen:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Degree programme listed twice: {name}"
            )
        seen.add(name)
        out.append((name, item.start_year))
    return out


def _set_programmes(classroom: Classroom, programmes: list[tuple[str, int | None]]) -> None:
    """Make these the subject's allotted programmes; `degree_programme` mirrors the first one."""
    classroom.programmes = [ClassroomProgramme(degree_programme=name, start_year=year) for name, year in programmes]
    classroom.degree_programme = programmes[0][0] if programmes else ""


@router.get("", response_model=list[ClassroomOut])
def list_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN)),
) -> list[Classroom]:
    query = db.query(Classroom).options(joinedload(Classroom.section_group), selectinload(Classroom.programmes))
    if current_user.role == UserRole.TEACHER:
        # A subject without a batch has no students yet, so there is nothing to teach.
        query = query.filter(Classroom.teacher_id == current_user.id, Classroom.section_id.is_not(None))
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
    if payload.teacher_id is None and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="teacher_id is required")
    if current_user.role == UserRole.TEACHER and payload.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers can only create classrooms assigned to themselves",
        )

    teacher = db.get(User, payload.teacher_id) if payload.teacher_id is not None else None
    if payload.teacher_id is not None and (teacher is None or teacher.role != UserRole.TEACHER):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="teacher_id must reference an existing teacher",
        )

    batch_name = payload.section.strip()
    if not batch_name:
        # A subject added without a batch (the admin attaches one later).
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A batch is required"
            )
        dup = (
            db.query(Classroom.id)
            .filter(func.lower(Classroom.course) == payload.course.strip().lower(), Classroom.section_id.is_(None))
            .first()
        )
        if dup is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="This subject already exists (without a batch yet)"
            )
        section, created = None, False
    else:
        section, created = _get_or_create_section(db, batch_name)
    # A section's students are shared by all its classes, so a teacher may only join a section
    # they already teach (or start a new one). Attaching to anyone else's is for admins.
    if section is not None and not created and current_user.role == UserRole.TEACHER:
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
        .filter(func.lower(Classroom.course) == payload.course.strip().lower(),
            Classroom.section_id == section.id,
            Classroom.subbatch == payload.subbatch,
        )
        .first()
        if section is not None
        else None
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A classroom with this course and section already exists",
        )

    # A department must be one of the managed departments; store its canonical spelling.
    department = payload.department.strip()
    if department:
        known = (
            db.query(Department.name).filter(func.lower(Department.name) == department.lower()).first()
        )
        if known is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Unknown department. Choose one from GET /departments.",
            )
        department = known[0]
    else:
        department = teacher.department if teacher else ""  # a subject belongs to its teacher's department

    programme = payload.degree_programme.strip()
    if programme:
        canonical = canonical_programme(programme)
        if canonical is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Unknown degree programme. Choose one from GET /degree-programmes.",
            )
        programme = canonical

    allotted = (
        _canonical_programmes(db, payload.programmes)
        if payload.programmes
        else ([(programme, None)] if programme else [])
    )
    classroom = Classroom(
        course=payload.course.strip(),
        section_id=section.id if section is not None else None,
        subbatch=payload.subbatch,
        degree_programme=allotted[0][0] if allotted else "",
        teacher_id=payload.teacher_id,
        course_code=payload.course_code.strip(),
        department=department,
        lecture_count=payload.lecture_count,
        lab_count=payload.lab_count,
        tutorial_count=payload.tutorial_count,
        category=payload.category,
    )
    _set_programmes(classroom, allotted)
    db.add(classroom)
    if created:
        activity.log(db, "batch_added", f"Batch added: {section.name}", "Created with a new subject", current_user)
    activity.log(
        db,
        "subject_added",
        f"Subject added: {classroom.course}" + (f" ({classroom.course_code})" if classroom.course_code else ""),
        " · ".join(x for x in (section.name if section else "No batch yet", teacher.name if teacher else "No teacher yet") if x),
        current_user,
    )
    db.commit()
    db.refresh(classroom)
    return classroom


@router.patch("/{classroom_id}", response_model=ClassroomOut)
def assign_classroom(
    classroom_id: int,
    payload: ClassroomUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Classroom:
    """Rename a class, give it to another teacher and/or change its session types and programmes (admin only)."""
    classroom = db.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if payload.course is not None:
        name = payload.course.strip()
        if not name:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The subject needs a name")
        taken = (
            db.query(Classroom.id)
            .filter(
                func.lower(Classroom.course) == name.lower(),
                Classroom.section_id == classroom.section_id if classroom.section_id is not None else Classroom.section_id.is_(None),
                Classroom.subbatch == classroom.subbatch,
                Classroom.id != classroom.id,
            )
            .first()
        )
        if taken is not None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="A subject with this name already exists there"
            )
        classroom.course = name
    if payload.course_code is not None:
        classroom.course_code = payload.course_code.strip()
    if payload.teacher_id is None and "teacher_id" in payload.model_fields_set:
        classroom.teacher_id = None  # an explicit null takes the class off its teacher (it keeps its slots)
    if payload.teacher_id is not None:
        teacher = db.get(User, payload.teacher_id)
        if teacher is None or teacher.role != UserRole.TEACHER:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="teacher_id must reference an existing teacher",
            )
        classroom.teacher_id = teacher.id
        if teacher.department:
            classroom.department = teacher.department  # the subject moves to its new teacher's department
    for field in ("lecture_count", "lab_count", "tutorial_count"):
        value = getattr(payload, field)
        if value is not None:
            setattr(classroom, field, value)
    if payload.category is not None:
        classroom.category = payload.category
    if payload.degree_programme is not None:
        value = payload.degree_programme.strip()
        canonical = canonical_programme(value) if value else ""
        if canonical is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown degree programme"
            )
        _set_programmes(classroom, [(canonical, None)] if canonical else [])
    if payload.programmes is not None:  # the full list wins over the single `degree_programme`
        _set_programmes(classroom, _canonical_programmes(db, payload.programmes))
    if payload.section is not None and payload.section.strip():
        batch = db.query(Section).filter(func.lower(Section.name) == payload.section.strip().lower()).first()
        if batch is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown batch"
            )
        clash = (
            db.query(Classroom.id)
            .filter(
                func.lower(Classroom.course) == classroom.course.lower(),
                Classroom.section_id == batch.id,
                Classroom.subbatch == classroom.subbatch,
                Classroom.id != classroom.id,
            )
            .first()
        )
        if clash is not None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This subject is already taught to that batch",
            )
        classroom.section_id = batch.id
    if classroom.lecture_count + classroom.lab_count + classroom.tutorial_count == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A subject needs at least one lecture, lab or tutorial per week",
        )
    db.commit()
    db.refresh(classroom)
    return classroom


@router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Delete a class (a subject taught to one batch) with its timetable and its saved attendance.
    The batch and its students are not touched."""
    classroom = db.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    activity.log(
        db,
        "subject_removed",
        f"Subject removed: {classroom.course}" + (f" ({classroom.course_code})" if classroom.course_code else ""),
        classroom.section,
        admin,
    )
    db.delete(classroom)
    db.commit()


@router.get("/{classroom_id}", response_model=ClassroomOut)
def get_classroom(classroom: Classroom = Depends(get_owned_classroom)) -> Classroom:
    return classroom


@router.get("/{classroom_id}/students", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db), classroom: Classroom = Depends(get_owned_classroom)
) -> list[Student]:
    return (
        db.query(Student)
        .filter(*roster_filter(classroom))
        .order_by(Student.roll_number)
        .all()
    )


@router.get("/{classroom_id}/students/{student_id}/photo")
def student_photo(
    student_id: int,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> dict:
    """A short-lived link to one enrollment photo of a student in this class, so the teacher can recognise them."""
    student = db.query(Student).filter(Student.id == student_id, *roster_filter(classroom)).first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    photo = min(student.photos, key=lambda p: p.id, default=None)
    if photo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This student has no enrolled photo")
    try:
        return {"url": s3_service.presign(photo.s3_key)}
    except S3_ERRORS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Photo storage is unavailable") from None


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
            *roster_filter(classroom), Student.face_embedding.is_not(None)
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
