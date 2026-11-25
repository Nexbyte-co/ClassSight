from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.degree_programmes import batch_letters, canonical_programme, duration_years, offered_in_year
from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.core.security import hash_password
from app.models import Classroom, Section, Student, User, UserRole
from app.schemas.section import SectionCreate, SectionOut, SectionUpdate
from app.schemas.student import (
    FaceEnrollmentOut,
    NfcCardIn,
    NfcCardOut,
    StudentCreate,
    StudentOut,
    StudentProfileOut,
    StudentUpdate,
)
from app.services import activity, enrollment
from app.services import sections as sections_service

# The student roster is admin-managed: admins pick a section, then add and enroll its students.
router = APIRouter(
    prefix="/sections",
    tags=["sections"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)


def _out(section: Section, count: int) -> SectionOut:
    return SectionOut(
        id=section.id,
        name=section.name,
        student_count=count,
        parent_id=section.parent_id,
        degree_programme=section.degree_programme,
        start_year=section.start_year,
        end_year=section.end_year,
    )


def _check_duration(programme: str, start_year: int | None, end_year: int | None) -> None:
    """A degree has one fixed length: a 4-year programme cannot be saved as 2 years, or the other way round."""
    if not programme or start_year is None or end_year is None:
        return
    expected = duration_years(programme)
    if expected is not None and end_year - start_year != expected:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{programme} is a {expected}-year degree, so a batch that starts in {start_year} ends in {start_year + expected}",
        )


def _programme(value: str) -> str:
    """The list's spelling of a degree programme; empty stays empty; unknown is a 422."""
    value = value.strip()
    if not value:
        return ""
    canonical = canonical_programme(value)
    if canonical is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown degree programme. Choose one from GET /degree-programmes.",
        )
    return canonical


def year_of_study(start_year: int, today: date | None = None) -> int:
    """Which year of the course a batch that started in `start_year` is in now.
    The academic year runs July to June: a 2024 batch is in year 1 until June 2025, year 3 from July 2026."""
    today = today or date.today()
    academic_start = today.year if today.month >= 7 else today.year - 1
    return academic_start - start_year + 1


def _check_name_rules(name: str, programme: str, start_year: int | None) -> None:
    """A batch name is: year-of-study digit + the programme's letter (A or B in a common first year) + the rest,
    and the programme must be offered to that year of study."""
    if start_year is None:
        return
    digit = year_of_study(start_year)
    length = duration_years(_programme(programme)) if programme else None
    if length is not None and digit > length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A {length}-year degree that started in {start_year} is already over",
        )
    if digit < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A batch starting in that year has not started yet",
        )
    if not name.startswith(str(digit)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A batch that started in {start_year} is in year {digit}, so its name starts with {digit}",
        )
    if not programme.strip():
        return
    if not offered_in_year(programme, digit):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{programme} is not offered to a year {digit} batch",
        )
    letters = batch_letters(programme, digit)
    if letters and not any(name.upper().startswith(f"{digit}{letter}") for letter in letters):
        options = " or ".join(f"{digit}{letter}" for letter in letters)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A {programme} batch in year {digit} has a name starting with {options}",
        )


def get_section(section_id: int, db: Session = Depends(get_db)) -> Section:
    section = db.get(Section, section_id)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    return section


def get_section_student(
    student_id: int, section: Section = Depends(get_section), db: Session = Depends(get_db)
) -> Student:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.section_id == section.id)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


def _check_email_free(db: Session, email: str | None, ignore_id: int | None = None) -> None:
    if not email:
        return
    q = db.query(Student.id).filter(func.lower(Student.email) == str(email).lower())
    if ignore_id is not None:
        q = q.filter(Student.id != ignore_id)
    if db.query(User.id).filter(func.lower(User.email) == str(email).lower()).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email belongs to a teacher or admin account",
        )
    if q.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A student with this email already exists"
        )


@router.get("", response_model=list[SectionOut])
def list_sections(db: Session = Depends(get_db)) -> list[SectionOut]:
    rows = (
        db.query(Section, func.count(Student.id))
        .outerjoin(Student, Student.section_id == Section.id)
        .group_by(Section.id)
        .order_by(func.lower(Section.name), Section.id)
        .all()
    )
    return [_out(s, n) for s, n in rows]


@router.post("", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(
    payload: SectionCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_user)
) -> SectionOut:
    exists = db.query(Section.id).filter(func.lower(Section.name) == payload.name.lower()).first()
    if exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A section with this name already exists"
        )
    _check_duration(_programme(payload.degree_programme), payload.start_year, payload.end_year)
    _check_name_rules(payload.name, payload.degree_programme, payload.start_year)
    section = Section(
        name=payload.name,
        degree_programme=_programme(payload.degree_programme),
        start_year=payload.start_year,
        end_year=payload.end_year,
    )
    db.add(section)
    activity.log(db, "batch_added", f"Batch added: {section.name}", section.degree_programme, admin)
    try:
        db.flush()
        sections_service.relink(db)  # this batch may sit inside another, or hold existing ones
        db.commit()
    except IntegrityError:  # created at the same moment by another request
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A section with this name already exists"
        ) from None
    return _out(section, 0)


@router.get("/{section_id}/students", response_model=list[StudentOut])
def list_section_students(
    db: Session = Depends(get_db), section: Section = Depends(get_section)
) -> list[Student]:
    return (
        db.query(Student)
        .filter(Student.section_id == section.id)
        .order_by(Student.roll_number)
        .all()
    )


@router.post(
    "/{section_id}/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED
)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    section: Section = Depends(get_section),
    admin: User = Depends(get_current_user),
) -> Student:
    if db.query(Student.id).filter(Student.roll_number == payload.roll_number).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this roll number already exists",
        )
    _check_email_free(db, payload.email)
    student = Student(
        roll_number=payload.roll_number,
        name=payload.name,
        email=str(payload.email).lower() if payload.email else None,
        password_hash=hash_password(payload.password) if payload.password else None,
        section_id=section.id,
        subbatch=payload.subbatch,
    )
    db.add(student)
    activity.log(db, "student_added", f"Student added: {student.name}", f"{student.roll_number} · {section.name}", admin)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{section_id}/students/{student_id}", response_model=StudentProfileOut)
def get_student_profile(student: Student = Depends(get_section_student)) -> StudentProfileOut:
    return enrollment.student_profile(student)


@router.post("/{section_id}/students/{student_id}/face", response_model=FaceEnrollmentOut)
def enroll_student_face(
    files: list[UploadFile],
    db: Session = Depends(get_db),
    student: Student = Depends(get_section_student),
) -> FaceEnrollmentOut:
    return enrollment.enroll_face(db, student, files)


@router.delete("/{section_id}/students/{student_id}/face", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_face(
    db: Session = Depends(get_db), student: Student = Depends(get_section_student)
) -> None:
    enrollment.delete_face(db, student)


@router.put("/{section_id}/students/{student_id}/nfc", response_model=NfcCardOut)
def link_student_nfc(
    payload: NfcCardIn,
    db: Session = Depends(get_db),
    student: Student = Depends(get_section_student),
) -> NfcCardOut:
    """Link an NFC ID card (its serial number) to the student; replaces any earlier card."""
    owner = db.query(Student).filter(Student.nfc_uid == payload.uid, Student.id != student.id).first()
    if owner is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This card is already linked to {owner.name} ({owner.roll_number})",
        )
    student.nfc_uid = payload.uid
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This card is already linked to another student") from None
    return NfcCardOut(student_id=student.id, nfc_uid=student.nfc_uid)


@router.delete("/{section_id}/students/{student_id}/nfc", status_code=status.HTTP_204_NO_CONTENT)
def unlink_student_nfc(db: Session = Depends(get_db), student: Student = Depends(get_section_student)) -> None:
    student.nfc_uid = None
    db.commit()


@router.patch("/{section_id}", response_model=SectionOut)
def rename_section(
    payload: SectionUpdate, db: Session = Depends(get_db), section: Section = Depends(get_section)
) -> SectionOut:
    clash = (
        db.query(Section.id)
        .filter(func.lower(Section.name) == payload.name.lower(), Section.id != section.id)
        .first()
    )
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A section with this name already exists"
        )
    programme = _programme(payload.degree_programme)
    _check_duration(programme, payload.start_year, payload.end_year)
    # An unchanged name keeps its old year digit after the July rollover, so the name rules apply to what is being changed.
    changed = (
        payload.name != section.name
        or programme != section.degree_programme
        or payload.start_year != section.start_year
    )
    if changed:
        _check_name_rules(payload.name, programme, payload.start_year)
    section.name = payload.name
    section.degree_programme = _programme(payload.degree_programme)
    section.start_year = payload.start_year
    section.end_year = payload.end_year
    db.flush()
    sections_service.relink(db)
    db.commit()
    count = db.query(func.count(Student.id)).filter(Student.section_id == section.id).scalar()
    return _out(section, count)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    db: Session = Depends(get_db),
    section: Section = Depends(get_section),
    admin: User = Depends(get_current_user),
) -> None:
    has_students = db.query(Student.id).filter(Student.section_id == section.id).first()
    has_classes = db.query(Classroom.id).filter(Classroom.section_id == section.id).first()
    if has_students or has_classes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This batch still has students or classes. Move or remove them first.",
        )
    activity.log(db, "batch_removed", f"Batch removed: {section.name}", section.degree_programme, admin)
    db.delete(section)
    db.flush()
    sections_service.relink(db)
    db.commit()


@router.patch("/{section_id}/students/{student_id}", response_model=StudentOut)
def update_student(
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    student: Student = Depends(get_section_student),
) -> Student:
    data = payload.model_dump(exclude_unset=True)
    if "roll_number" in data and data["roll_number"] != student.roll_number:
        if db.query(Student.id).filter(Student.roll_number == data["roll_number"]).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A student with this roll number already exists",
            )
        student.roll_number = data["roll_number"]
    if data.get("name"):
        student.name = data["name"]
    if "email" in data:
        email = str(data["email"]).lower() if data["email"] else None
        _check_email_free(db, email, student.id)
        student.email = email
    if data.get("subbatch") is not None:
        student.subbatch = data["subbatch"]
    if data.get("password"):
        student.password_hash = hash_password(data["password"])
    new_section = data.get("section_id")
    if new_section and new_section != student.section_id:
        if db.get(Section, new_section) is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown batch"
            )
        student.section_id = new_section
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{section_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    db: Session = Depends(get_db),
    student: Student = Depends(get_section_student),
    admin: User = Depends(get_current_user),
) -> None:
    activity.log(
        db, "student_removed", f"Student removed: {student.name}",
        f"{student.roll_number} · {student.section.name if student.section else ''}", admin,
    )
    enrollment.delete_face(db, student)  # removes the stored photos too
    db.delete(student)
    db.commit()
