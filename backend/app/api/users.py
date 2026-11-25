from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.designations import canonical_designation
from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from sqlalchemy import func

from app.models import Classroom, Department, Lecture, Student, User, UserRole
from app.schemas.auth import UserOut
from app.schemas.user import PasswordReset, UserCreate, UserUpdate
from app.services import activity

router = APIRouter(prefix="/users", tags=["users"])


def _canonical_department(db: Session, value: str) -> str:
    """The managed department's spelling of `value`; empty stays empty; unknown is a 422."""
    value = value.strip()
    if not value:
        return ""
    known = db.query(Department.name).filter(func.lower(Department.name) == value.lower()).first()
    if known is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown department. Choose one from GET /departments.",
        )
    return known[0]


def _canonical_designation(value: str) -> str:
    """The managed designation's spelling of `value`; empty stays empty; unknown is a 422."""
    value = value.strip()
    if not value:
        return ""
    known = canonical_designation(value)
    if known is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown designation. Choose one from GET /designations.",
        )
    return known


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    if db.query(User).filter(User.email == payload.email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    if db.query(Student.id).filter(func.lower(Student.email) == str(payload.email).lower()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered to a student"
        )

    is_teacher = payload.role == UserRole.TEACHER
    if (payload.schedule or payload.designation.strip()) and not is_teacher:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only teachers have a designation and classes",
        )
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        department=_canonical_department(db, payload.department) if is_teacher else "",
        designation=_canonical_designation(payload.designation) if is_teacher else "",
    )
    db.add(user)
    db.flush()
    if is_teacher:
        activity.log(db, "teacher_added", f"Teacher added: {user.name}",
                     " · ".join(x for x in (user.designation, user.department) if x), admin)
    else:
        activity.log(db, "admin_added", f"Administrator added: {user.name}", user.email, admin)

    # The classes given to the new teacher and when they meet: all of it is saved, or none of it.
    for slot in payload.schedule:
        classroom = db.get(Classroom, slot.classroom_id)
        if classroom is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Classroom {slot.classroom_id} not found"
            )
        classroom.teacher_id = user.id
        if user.department:
            classroom.department = user.department  # the subject moves to its new teacher's department
        db.add(
            Lecture(
                classroom_id=classroom.id,
                weekday=slot.weekday,
                start_time=slot.start_time,
                end_time=slot.end_time,
                room=slot.room.strip(),
                session_type=slot.session_type,
            )
        )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A class has two slots of the same kind starting at the same time on one weekday",
        ) from None
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    """Set a teacher's department (their subjects follow it) and/or designation."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Only teachers have a department and designation"
        )
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.email is not None and str(payload.email).lower() != user.email.lower():
        if db.query(User.id).filter(func.lower(User.email) == str(payload.email).lower(), User.id != user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if db.query(Student.id).filter(func.lower(Student.email) == str(payload.email).lower()).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered to a student")
        user.email = payload.email
    if payload.department is not None:
        user.department = _canonical_department(db, payload.department)
        db.query(Classroom).filter(Classroom.teacher_id == user.id).update({"department": user.department})
    if payload.designation is not None:
        user.designation = _canonical_designation(payload.designation)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[User]:
    return db.query(User).order_by(User.id).all()


@router.get("/me", response_model=UserOut)
def read_own_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/{user_id}", response_model=UserOut)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: int,
    payload: PasswordReset,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    # The admin re-enters their own password, so an unattended signed-in browser
    # cannot be used to take over someone else's account.
    if not verify_password(payload.admin_password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Your password is incorrect"
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The new password is the same as the current one",
        )
    user.password_hash = hash_password(payload.new_password)
    if user.id != admin.id:
        user.token_version += 1  # a reset password signs that person out everywhere
    db.commit()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Permanently delete a teacher account. Their classes must be given to someone else first."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You can't delete your own account"
        )
    if user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Only teacher accounts can be deleted"
        )
    classes = db.query(Classroom).filter(Classroom.teacher_id == user.id).count()
    if classes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This teacher still has {classes} class{'es' if classes != 1 else ''}. "
            "Give them to another teacher first.",
        )
    activity.log(db, "teacher_removed", f"Teacher removed: {user.name}", user.department, admin)
    db.delete(user)
    db.commit()
