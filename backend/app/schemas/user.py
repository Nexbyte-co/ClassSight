from pydantic import BaseModel, EmailStr, Field

from app.models import UserRole


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)
    role: UserRole = UserRole.STUDENT
