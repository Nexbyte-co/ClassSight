from datetime import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_owned_classroom, require_roles
from app.db.session import get_db
from app.models import Classroom, Lecture, User, UserRole
from app.schemas.lecture import LectureCreate, LectureMoves, LectureOut, LectureUpdate, ScheduledLectureOut

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
        session_type=payload.session_type,
    )
    db.add(lecture)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This class already has a slot of that kind starting at that time on that weekday",
        ) from None
    db.refresh(lecture)
    return lecture


@router.patch("/classrooms/{classroom_id}/lectures/{lecture_id}", response_model=LectureOut)
def update_lecture(
    lecture_id: int,
    payload: LectureUpdate,
    db: Session = Depends(get_db),
    classroom: Classroom = Depends(get_owned_classroom),
) -> Lecture:
    """Change a slot's day, times, venue or kind."""
    lecture = (
        db.query(Lecture)
        .filter(Lecture.id == lecture_id, Lecture.classroom_id == classroom.id)
        .first()
    )
    if lecture is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")
    changes = payload.model_dump(exclude_unset=True)
    if "room" in changes and changes["room"] is not None:
        changes["room"] = changes["room"].strip()
    for field, value in changes.items():
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{field} cannot be empty"
            )
        setattr(lecture, field, value)
    if lecture.end_time <= lecture.start_time:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_time must be after start_time"
        )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This class already has a slot of that kind starting at that time on that weekday",
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


def _clock(value: time) -> str:
    return value.strftime("%H:%M")


@router.patch("/lectures", response_model=list[LectureOut])
def move_lectures(
    payload: LectureMoves,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[Lecture]:
    """Admin: move several weekly slots (day and times) in one go, all or nothing. A moved slot may not
    overlap another slot of the same teacher on that day."""
    ids = [m.lecture_id for m in payload.moves]
    if len(set(ids)) != len(ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A slot is listed twice")
    lectures = {
        lec.id: lec
        for lec in db.query(Lecture).options(joinedload(Lecture.classroom)).filter(Lecture.id.in_(ids)).all()
    }
    missing = [i for i in ids if i not in lectures]
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Lecture {missing[0]} not found")

    # Park the moved slots on unique placeholder times first, so two slots can swap places without
    # tripping the one-start-time-per-kind rule halfway through.
    for i, move in enumerate(payload.moves):
        lec = lectures[move.lecture_id]
        lec.start_time = time(0, i // 60, i % 60)
        lec.end_time = time(1, i // 60, i % 60)
    db.flush()
    for move in payload.moves:
        lec = lectures[move.lecture_id]
        lec.weekday, lec.start_time, lec.end_time = move.weekday, move.start_time, move.end_time
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A class would have two slots of the same kind starting at the same time on one day",
        ) from None

    teacher_ids = {lec.classroom.teacher_id for lec in lectures.values() if lec.classroom.teacher_id is not None}
    if teacher_ids:
        rows = (
            db.query(Lecture, Classroom)
            .join(Classroom, Lecture.classroom_id == Classroom.id)
            .filter(Classroom.teacher_id.in_(teacher_ids))
            .all()
        )
        for lec in lectures.values():
            teacher_id = lec.classroom.teacher_id
            if teacher_id is None:
                continue
            for other, cls in rows:
                if (
                    other.id != lec.id
                    and cls.teacher_id == teacher_id
                    and other.weekday == lec.weekday
                    and other.start_time < lec.end_time
                    and lec.start_time < other.end_time
                ):
                    db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"{lec.classroom.course} ({lec.classroom.section}) at {_clock(lec.start_time)} "
                            f"would clash with {cls.course} ({cls.section}) at {_clock(other.start_time)}"
                        ),
                    )
    db.commit()
    return sorted(lectures.values(), key=lambda lec: (lec.weekday, lec.start_time, lec.id))


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
            session_type=lecture.session_type,
            course=classroom.course,
            section=classroom.section,
            course_code=classroom.course_code,
            department=classroom.department,
        )
        for lecture, classroom in rows
    ]
