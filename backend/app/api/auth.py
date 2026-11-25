from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.login_limiter import login_limiter
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models import LoginEvent, Student, User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def staff_token(user: User) -> TokenResponse:
    token = create_access_token(
        subject=str(user.id), extra_claims={"role": user.role.value, "tv": user.token_version}
    )
    return TokenResponse(access_token=token, role=user.role.value)


def student_token(student: Student) -> TokenResponse:
    # "s:<id>" can never be read as a user id, so a student token is useless on teacher/admin routes.
    token = create_access_token(
        subject=f"s:{student.id}", extra_claims={"role": "student", "tv": student.token_version}
    )
    return TokenResponse(access_token=token, role="student")


def _record_login(db: Session, request: Request, ip: str, *, user_id=None, student_id=None) -> None:
    db.add(
        LoginEvent(
            user_id=user_id,
            student_id=student_id,
            ip=ip[:64],
            user_agent=(request.headers.get("user-agent") or "")[:300],
        )
    )
    db.commit()


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest, request: Request, db: Session = Depends(get_db)
) -> TokenResponse:
    # Behind Caddy this is the real client address (uvicorn trusts X-Forwarded-For).
    client_ip = request.client.host if request.client else "unknown"
    wait = login_limiter.retry_after(payload.email, client_ip)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(wait)},
        )

    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None and verify_password(payload.password, user.password_hash):
        login_limiter.clear_email(payload.email)
        _record_login(db, request, client_ip, user_id=user.id)
        return staff_token(user)

    # Not a teacher/admin account: try the students (admins give them an email + password).
    student = (
        db.query(Student)
        .filter(func.lower(Student.email) == payload.email.lower(), Student.password_hash.is_not(None))
        .first()
    )
    if student is not None and verify_password(payload.password, student.password_hash):
        login_limiter.clear_email(payload.email)
        _record_login(db, request, client_ip, student_id=student.id)
        return student_token(student)

    login_limiter.record_failure(payload.email, client_ip)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
    )


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
