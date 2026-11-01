"""Student photo and face-enrollment operations shared by the admin (section) routes and
the classroom verify route. Raises HTTPException so callers stay thin."""

import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Student, StudentPhoto
from app.schemas.student import FaceEnrollmentOut, StudentOut, StudentPhotoOut, StudentProfileOut
from app.services import face_recognition, s3_service

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
S3_ERRORS = (BotoCoreError, ClientError)

MAX_ENROLLMENT_PHOTOS = 5
MAX_ENROLLMENT_PHOTO_BYTES = 10 * 1024 * 1024


def read_image(upload: UploadFile) -> bytes:
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


def _delete_quietly(keys: list[str]) -> None:
    try:
        s3_service.delete_objects(keys)
    except S3_ERRORS as exc:
        logger.warning("could not delete %d S3 object(s) %s: %s", len(keys), keys, exc)


def student_profile(student: Student) -> StudentProfileOut:
    try:
        photos = [
            StudentPhotoOut(
                id=photo.id, url=s3_service.presign(photo.s3_key), created_at=photo.created_at
            )
            for photo in student.photos
        ]
    except S3_ERRORS as exc:
        raise _storage_unavailable(exc) from exc
    return StudentProfileOut(**StudentOut.model_validate(student).model_dump(), photos=photos)


def enroll_face(db: Session, student: Student, files: list[UploadFile]) -> FaceEnrollmentOut:
    """Enroll (or re-enroll) a student. Replaces any earlier photos and embedding."""
    if not 1 <= len(files) <= MAX_ENROLLMENT_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Upload between 1 and {MAX_ENROLLMENT_PHOTOS} photos",
        )
    uploads = [(read_image(upload), upload.content_type) for upload in files]
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


def delete_face(db: Session, student: Student) -> None:
    """Remove a student's stored photos and embedding (e.g. consent withdrawn)."""
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
