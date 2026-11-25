"""The signed-in person's own account: change password, recent sign-ins, sign out of other devices.

Staff use /auth/..., students /student/... (their tokens only work on their own routes).
Changing the password or signing out other devices bumps the account's token_version, which
ends every other session; the response carries a fresh token for this browser."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import staff_token, student_token
from app.core.deps import get_current_student, get_current_user
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models import LoginEvent, Student, User
from app.schemas.account import LoginEventOut, PasswordChange
from app.schemas.auth import TokenResponse

router = APIRouter(tags=["account"])

HISTORY_DAYS = 30
HISTORY_LIMIT = 20


def _change(account: User | Student, payload: PasswordChange) -> None:
    # 400, not 401: a wrong current password must not look like an expired session to the app.
    if not account.password_hash or not verify_password(payload.current_password, account.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your current password is incorrect")
    if verify_password(payload.new_password, account.password_hash):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The new password is the same as the current one",
        )
    account.password_hash = hash_password(payload.new_password)
    account.token_version += 1


def _history(db: Session, **owner) -> list[LoginEvent]:
    since = datetime.now(timezone.utc) - timedelta(days=HISTORY_DAYS)
    return (
        db.query(LoginEvent)
        .filter_by(**owner)
        .filter(LoginEvent.created_at >= since)
        .order_by(LoginEvent.created_at.desc(), LoginEvent.id.desc())
        .limit(HISTORY_LIMIT)
        .all()
    )


# ---- Teachers and admins ----

@router.post("/auth/password", response_model=TokenResponse)
def change_my_password(
    payload: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> TokenResponse:
    _change(user, payload)
    db.commit()
    return staff_token(user)


@router.get("/auth/logins", response_model=list[LoginEventOut])
def my_logins(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[LoginEvent]:
    return _history(db, user_id=user.id)


@router.post("/auth/logout-others", response_model=TokenResponse)
def logout_my_other_devices(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> TokenResponse:
    user.token_version += 1
    db.commit()
    return staff_token(user)


# ---- Students ----

@router.post("/student/password", response_model=TokenResponse)
def change_student_password(
    payload: PasswordChange, db: Session = Depends(get_db), student: Student = Depends(get_current_student)
) -> TokenResponse:
    _change(student, payload)
    db.commit()
    return student_token(student)


@router.get("/student/logins", response_model=list[LoginEventOut])
def student_logins(
    db: Session = Depends(get_db), student: Student = Depends(get_current_student)
) -> list[LoginEvent]:
    return _history(db, student_id=student.id)


@router.post("/student/logout-others", response_model=TokenResponse)
def logout_student_other_devices(
    db: Session = Depends(get_db), student: Student = Depends(get_current_student)
) -> TokenResponse:
    student.token_version += 1
    db.commit()
    return student_token(student)
