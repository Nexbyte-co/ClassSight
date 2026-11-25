from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Classroom, Student, User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise credentials_error

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise credentials_error

    user = db.get(User, user_id)
    # A token from before "sign out of other devices" or a password change no longer works.
    if user is None or payload.get("tv", 0) != user.token_version:
        raise credentials_error
    return user


def get_current_student(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Student:
    """The signed-in student. Only tokens issued to students (subject "s:<id>") work here."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    subject = str(payload.get("sub", "")) if payload else ""
    if payload is None or payload.get("role") != "student" or not subject.startswith("s:"):
        raise credentials_error
    try:
        student_id = int(subject[2:])
    except ValueError:
        raise credentials_error
    student = db.get(Student, student_id)
    # A student whose email/password was removed can no longer use an old token.
    if student is None or student.password_hash is None or payload.get("tv", 0) != student.token_version:
        raise credentials_error
    return student


def require_roles(*roles: UserRole) -> Generator:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency


def get_owned_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Classroom:
    classroom = db.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    if current_user.role == UserRole.ADMIN:
        return classroom
    if current_user.role == UserRole.TEACHER and classroom.teacher_id == current_user.id:
        return classroom

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this classroom",
    )
