from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=8, max_length=128)


class LoginEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ip: str
    user_agent: str
    created_at: datetime
