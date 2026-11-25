from pydantic import BaseModel, EmailStr, Field, model_validator

from app.schemas.lecture import LectureCreate

from app.models import UserRole


class TeacherClassSlot(LectureCreate):
    """One weekly slot for a new teacher: the class they are given and when it meets."""

    classroom_id: int


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)
    role: UserRole = UserRole.STUDENT
    department: str = Field(default="", max_length=120)
    designation: str = Field(default="", max_length=60)
    # Teachers only: classes given to the new teacher together with their weekly slots (all or nothing).
    schedule: list[TeacherClassSlot] = Field(default_factory=list, max_length=100)


class UserUpdate(BaseModel):
    """Admin edits to a teacher's account: their department and/or designation."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=120)
    designation: str | None = Field(default=None, max_length=60)

    @model_validator(mode="after")
    def something_to_change(self) -> "UserUpdate":
        if all(v is None for v in (self.name, self.email, self.department, self.designation)):
            raise ValueError("Send something to change")
        return self


class PasswordReset(BaseModel):
    """Admin sets a new password for another account; their own password confirms it."""

    new_password: str = Field(min_length=8, max_length=255)
    admin_password: str = Field(min_length=1, max_length=255)
