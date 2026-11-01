from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_owned_classroom, require_roles
from app.db.session import get_db
from app.models import Classroom, Lecture, User, UserRole
from app.schemas.lecture import LectureCreate, LectureOut, ScheduledLectureOut

router = APIRouter(tags=["lectures"])


@router.get("/classrooms/{classroom_id}/lectures", response_model=list[LectureOut])
def list_classroom_lectures(
    db: Session = Depends(get_db), classroom: Classroom = Depends(get_owned_classroom)
) -> list[Lecture]:
    return (
        db.query(Lecture)
        .filter(Lecture.classroom_id == classroom.id)
        .order_by(Lecture.weekday, Lecture.start_time)
        .all()
    )


@router.post(
    "/classrooms/{classroom_id}/lectures",
    response_model=LectureOut,
    status_code=status.HTTP_201_CREATED,
)
def create_lecture(
    payload: LectureCreate,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> Lecture:
    lecture = Lecture(
        classroom_id=classroom.id,
        weekday=payload.weekday,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room.strip(),
    )
    db.add(lecture)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This class already has a lecture on that weekday",
        ) from None
    db.refresh(lecture)
    return lecture


@router.delete(
    "/classrooms/{classroom_id}/lectures/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_lecture(
    lecture_id: int,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> None:
    lecture = (
        db.query(Lecture)
        .filter(Lecture.id == lecture_id, Lecture.classroom_id == classroom.id)
        .first()
    )
    if lecture is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")
    db.delete(lecture)
    db.commit()


@router.get("/lectures", response_model=list[ScheduledLectureOut])
def list_schedule(
    weekday: int | None = Query(default=None, ge=0, le=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN)),
) -> list[ScheduledLectureOut]:
    """The lectures of every class the user can see (a teacher: their own; an admin: all),
    in time order. Pass `weekday` for one day's schedule."""
    query = (
        db.query(Lecture, Classroom)
        .join(Classroom, Lecture.classroom_id == Classroom.id)
        .options(joinedload(Classroom.section_group))
    )
    if current_user.role == UserRole.TEACHER:
        query = query.filter(Classroom.teacher_id == current_user.id)
    if weekday is not None:
        query = query.filter(Lecture.weekday == weekday)
    rows = query.order_by(Lecture.weekday, Lecture.start_time, Lecture.id).all()
    return [
        ScheduledLectureOut(
            id=lecture.id,
            classroom_id=lecture.classroom_id,
            weekday=lecture.weekday,
            start_time=lecture.start_time,
            end_time=lecture.end_time,
            room=lecture.room,
            course=classroom.course,
            section=classroom.section,
            course_code=classroom.course_code,
            department=classroom.department,
        )
        for lecture, classroom in rows
    ]
