from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_owned_classroom, require_roles
from app.db.session import get_db
from app.models import Classroom, Student, User, UserRole
from app.schemas.classroom import ClassroomCreate, ClassroomOut
from app.schemas.student import StudentCreate, StudentOut

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


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
    existing = (
        db.query(Student)
        .filter(
            Student.classroom_id == classroom.id, Student.roll_number == payload.roll_number
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this roll number already exists in this classroom",
        )

    student = Student(
        roll_number=payload.roll_number, name=payload.name, classroom_id=classroom.id
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student
