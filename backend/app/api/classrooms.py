import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_owned_classroom, require_roles
from app.db.session import get_db
from app.models import Classroom, Student, StudentPhoto, User, UserRole
from app.schemas.classroom import ClassroomCreate, ClassroomOut
from app.schemas.student import (
    FaceEnrollmentOut,
    StudentCreate,
    StudentOut,
    StudentPhotoOut,
    StudentProfileOut,
    VerificationOut,
    VerifiedStudent,
)
from app.services import face_recognition, s3_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classrooms", tags=["classrooms"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
S3_ERRORS = (BotoCoreError, ClientError)

MAX_ENROLLMENT_PHOTOS = 5
MAX_ENROLLMENT_PHOTO_BYTES = 10 * 1024 * 1024


@router.get("", response_model=list[ClassroomOut])
def list_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN)),
) -> list[Classroom]:
    query = db.query(Classroom)
    if current_user.role == UserRole.TEACHER:
        query = query.filter(Classroom.teacher_id == current_user.id)
    return query.order_by(Classroom.id).all()


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

    existing = (
        db.query(Classroom)
        .filter(Classroom.course == payload.course, Classroom.section == payload.section)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A classroom with this course and section already exists",
        )

    classroom = Classroom(
        course=payload.course, section=payload.section, teacher_id=payload.teacher_id
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
        .filter(Student.classroom_id == classroom.id)
        .order_by(Student.roll_number)
        .all()
    )


@router.post(
    "/{classroom_id}/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED
)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> Student:
    existing = db.query(Student).filter(Student.roll_number == payload.roll_number).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this roll number already exists",
        )

    student = Student(
        roll_number=payload.roll_number, name=payload.name, classroom_id=classroom.id
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def _get_classroom_student(db: Session, classroom: Classroom, student_id: int) -> Student:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.classroom_id == classroom.id)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


def _read_image(upload: UploadFile) -> bytes:
    if upload.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only JPEG and PNG images are supported",
        )
    content = upload.file.read(MAX_ENROLLMENT_PHOTO_BYTES + 1)
    if len(content) > MAX_ENROLLMENT_PHOTO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Each photo must be 10 MB or smaller",
        )
    return content


def _storage_unavailable(exc: Exception) -> HTTPException:
    logger.error("photo storage error: %s", exc)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Photo storage is unavailable; try again",
    )


@router.get("/{classroom_id}/students/{student_id}", response_model=StudentProfileOut)
def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> StudentProfileOut:
    student = _get_classroom_student(db, classroom, student_id)
    try:
        photos = [
            StudentPhotoOut(
                id=photo.id, url=s3_service.presign(photo.s3_key), created_at=photo.created_at
            )
            for photo in student.photos
        ]
    except S3_ERRORS as exc:
        raise _storage_unavailable(exc) from exc
    return StudentProfileOut(
        **StudentOut.model_validate(student).model_dump(), photos=photos
    )


@router.post("/{classroom_id}/students/{student_id}/face", response_model=FaceEnrollmentOut)
def enroll_student_face(
    student_id: int,
    files: list[UploadFile],
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> FaceEnrollmentOut:
    """Enroll (or re-enroll) a student. Replaces any earlier photos and embedding."""
    student = _get_classroom_student(db, classroom, student_id)

    if not 1 <= len(files) <= MAX_ENROLLMENT_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Upload between 1 and {MAX_ENROLLMENT_PHOTOS} photos",
        )
    uploads = [(_read_image(upload), upload.content_type) for upload in files]
    logger.info("enroll student %s: %d photo(s) received", student.roll_number, len(uploads))

    # Every photo must pass the one-face check before anything is stored.
    try:
        embedding = face_recognition.build_enrollment_embedding(
            [content for content, _ in uploads], augment=get_settings().enroll_augment
        )
    except face_recognition.EnrollmentError as exc:
        logger.info("enroll student %s rejected: %s", student.roll_number, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    new_keys: list[str] = []
    try:
        for content, content_type in uploads:
            new_keys.append(
                s3_service.upload_student_photo(student.roll_number, content, content_type)
            )
    except S3_ERRORS as exc:
        _delete_quietly(new_keys)
        raise _storage_unavailable(exc) from exc

    old_keys = [photo.s3_key for photo in student.photos]
    student.photos = [StudentPhoto(s3_key=key) for key in new_keys]
    student.face_embedding = embedding
    db.commit()
    # Old objects go only after the DB points at the new ones.
    _delete_quietly(old_keys)
    logger.info("enroll student %s: stored %d photo(s)", student.roll_number, len(new_keys))
    return FaceEnrollmentOut(student_id=student.id, photos_used=len(uploads))


def _delete_quietly(keys: list[str]) -> None:
    try:
        s3_service.delete_objects(keys)
    except S3_ERRORS as exc:
        logger.warning("could not delete %d S3 object(s) %s: %s", len(keys), keys, exc)


@router.delete(
    "/{classroom_id}/students/{student_id}/face", status_code=status.HTTP_204_NO_CONTENT
)
def delete_student_face(
    student_id: int,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> None:
    """Remove a student's stored photos and embedding (e.g. consent withdrawn)."""
    student = _get_classroom_student(db, classroom, student_id)
    # Photos are removed from S3 first: if that fails, nothing changes and the
    # request can be retried, rather than leaving photos behind untracked.
    try:
        s3_service.delete_objects([photo.s3_key for photo in student.photos])
    except S3_ERRORS as exc:
        raise _storage_unavailable(exc) from exc
    student.photos = []
    student.face_embedding = None
    db.commit()
    logger.info("deleted face data for student %s", student.roll_number)


@router.post("/{classroom_id}/verify", response_model=VerificationOut)
def verify_student(
    file: UploadFile,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> VerificationOut:
    """Identify the one student in a captured photo among this classroom's enrolled students."""
    content = _read_image(file)
    candidates = [
        (student.id, face_recognition.embedding_from_bytes(student.face_embedding))
        for student in db.query(Student).filter(
            Student.classroom_id == classroom.id, Student.face_embedding.is_not(None)
        )
    ]
    logger.info("verify classroom %d: %d enrolled candidate(s)", classroom.id, len(candidates))
    if not candidates:
        return VerificationOut(
            verified=False, student=None, confidence=None, reason="no_enrolled_students"
        )

    try:
        faces = face_recognition.extract_face_embeddings(content)
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
