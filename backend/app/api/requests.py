"""Teacher requests (things only an admin can change) and the admin "Recent activity" feed.

A request stays open until an admin marks it fixed. An admin can press "Doing" first: while
it is in progress, other admins can't mark it fixed or take it over."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.db.session import get_db
from app.models import ActivityEvent, RequestKind, RequestStatus, TeacherRequest, User, UserRole
from app.schemas.notice import ActivityOut, RequestCreate, RequestOut
from app.services import activity

router = APIRouter(tags=["requests"])

KIND_LABELS = {
    RequestKind.FACE_REENROLL: "Enroll face again",
    RequestKind.BATCH_CHANGE: "Batch change",
    RequestKind.DEGREE_PROGRAMME: "Degree programme",
    RequestKind.NFC_CARD: "NFC card problem",
    RequestKind.SUBJECT_ADD: "Subject to add",
    RequestKind.SCHEDULE_CHANGE: "Schedule change",
    RequestKind.OTHER: "Other",
}

admin_only = require_roles(UserRole.ADMIN)


def _out(r: TeacherRequest) -> RequestOut:
    return RequestOut(
        id=r.id,
        kind=r.kind,
        subject=r.subject,
        details=r.details,
        status=r.status,
        teacher_id=r.teacher_id,
        teacher_name=r.teacher.name,
        teacher_email=r.teacher.email,
        teacher_department=r.teacher.department,
        claimed_by_id=r.claimed_by_id,
        claimed_by_name=r.claimed_by.name if r.claimed_by else None,
        claimed_at=r.claimed_at,
        resolved_by_name=r.resolved_by.name if r.resolved_by else None,
        resolved_at=r.resolved_at,
        created_at=r.created_at,
    )


def _get(db: Session, request_id: int) -> TeacherRequest:
    # Row lock so two admins pressing at the same moment can't both win.
    r = db.query(TeacherRequest).filter(TeacherRequest.id == request_id).with_for_update().first()
    if r is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return r


def _held_by_other(r: TeacherRequest, admin: User) -> None:
    if r.status == RequestStatus.IN_PROGRESS and r.claimed_by_id not in (None, admin.id):
        who = r.claimed_by.name if r.claimed_by else "another admin"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{who} is already working on this request")


@router.get("/request-kinds")
def request_kinds() -> list[dict]:
    return [{"value": k.value, "label": label} for k, label in KIND_LABELS.items()]


@router.post("/requests", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_roles(UserRole.TEACHER)),
) -> RequestOut:
    r = TeacherRequest(teacher_id=teacher.id, kind=payload.kind, subject=payload.subject, details=payload.details)
    db.add(r)
    db.commit()
    db.refresh(r)
    return _out(r)


@router.get("/requests/mine", response_model=list[RequestOut])
def my_requests(
    db: Session = Depends(get_db), teacher: User = Depends(require_roles(UserRole.TEACHER))
) -> list[RequestOut]:
    rows = (
        db.query(TeacherRequest)
        .filter(TeacherRequest.teacher_id == teacher.id)
        .order_by(TeacherRequest.created_at.desc(), TeacherRequest.id.desc())
        .limit(50)
        .all()
    )
    return [_out(r) for r in rows]


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_request(
    request_id: int, db: Session = Depends(get_db), teacher: User = Depends(require_roles(UserRole.TEACHER))
) -> None:
    """A teacher withdraws their own request while no admin has started on it."""
    r = _get(db, request_id)
    if r.teacher_id != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if r.status != RequestStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An admin has already started on this request")
    db.delete(r)
    db.commit()


@router.get("/requests", response_model=list[RequestOut])
def open_requests(db: Session = Depends(get_db), _: User = Depends(admin_only)) -> list[RequestOut]:
    """Every request that is not fixed yet, oldest first."""
    rows = (
        db.query(TeacherRequest)
        .filter(TeacherRequest.status != RequestStatus.FIXED)
        .order_by(TeacherRequest.created_at, TeacherRequest.id)
        .all()
    )
    return [_out(r) for r in rows]


@router.post("/requests/{request_id}/claim", response_model=RequestOut)
def claim_request(request_id: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> RequestOut:
    r = _get(db, request_id)
    if r.status == RequestStatus.FIXED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This request is already fixed")
    _held_by_other(r, admin)
    r.status = RequestStatus.IN_PROGRESS
    r.claimed_by_id = admin.id
    r.claimed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(r)
    return _out(r)


@router.post("/requests/{request_id}/release", response_model=RequestOut)
def release_request(request_id: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> RequestOut:
    """Stop working on a request so another admin can pick it up."""
    r = _get(db, request_id)
    if r.status != RequestStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nobody is working on this request")
    _held_by_other(r, admin)
    r.status = RequestStatus.OPEN
    r.claimed_by_id = None
    r.claimed_at = None
    db.commit()
    db.refresh(r)
    return _out(r)


@router.post("/requests/{request_id}/resolve", response_model=RequestOut)
def resolve_request(request_id: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)) -> RequestOut:
    r = _get(db, request_id)
    if r.status == RequestStatus.FIXED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This request is already fixed")
    _held_by_other(r, admin)
    r.status = RequestStatus.FIXED
    r.resolved_by_id = admin.id
    r.resolved_at = datetime.now(timezone.utc)
    label = KIND_LABELS.get(r.kind, "Request")
    activity.log(
        db,
        "request_fixed",
        f"Request fixed: {label}" + (f" · {r.subject}" if r.subject else ""),
        f"Asked by {r.teacher.name}",
        admin,
    )
    db.commit()
    db.refresh(r)
    return _out(r)


@router.get("/activity", response_model=list[ActivityOut])
def recent_activity(
    days: int = Query(14, ge=1, le=14),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> list[ActivityEvent]:
    """What changed in the last `days` days (at most two weeks), newest first."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(ActivityEvent)
        .filter(ActivityEvent.created_at >= since)
        .order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
        .limit(500)
        .all()
    )
