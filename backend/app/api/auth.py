from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.login_limiter import login_limiter
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


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
    if user is None or not verify_password(payload.password, user.password_hash):
        login_limiter.record_failure(payload.email, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    login_limiter.clear_email(payload.email)
    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
