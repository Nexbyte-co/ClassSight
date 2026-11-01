from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.db.session import get_db
from app.models import Section, Student, User, UserRole
from app.schemas.section import SectionCreate, SectionOut
from app.schemas.student import FaceEnrollmentOut, StudentCreate, StudentOut, StudentProfileOut
from app.services import enrollment

# The student roster is admin-managed: admins pick a section, then add and enroll its students.
router = APIRouter(
    prefix="/sections",
    tags=["sections"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
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


@router.get("", response_model=list[SectionOut])
def list_sections(db: Session = Depends(get_db)) -> list[SectionOut]:
    rows = (
        db.query(Section, func.count(Student.id))
        .outerjoin(Student, Student.section_id == Section.id)
        .group_by(Section.id)
        .order_by(func.lower(Section.name), Section.id)
        .all()
    )
    return [SectionOut(id=s.id, name=s.name, student_count=n) for s, n in rows]


@router.post("", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(payload: SectionCreate, db: Session = Depends(get_db)) -> SectionOut:
    exists = db.query(Section.id).filter(func.lower(Section.name) == payload.name.lower()).first()
    if exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A section with this name already exists"
        )
    section = Section(name=payload.name)
    db.add(section)
    try:
        db.commit()
    except IntegrityError:  # created at the same moment by another request
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A section with this name already exists"
        ) from None
    return SectionOut(id=section.id, name=section.name, student_count=0)


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
) -> Student:
    if db.query(Student.id).filter(Student.roll_number == payload.roll_number).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this roll number already exists",
        )
    student = Student(roll_number=payload.roll_number, name=payload.name, section_id=section.id)
    db.add(student)
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
