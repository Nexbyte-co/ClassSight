from pydantic import BaseModel, EmailStr

from app.models import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # "admin" | "teacher" | "student": tells the app which area to open


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    department: str = ""
    designation: str = ""

    model_config = {"from_attributes": True}
