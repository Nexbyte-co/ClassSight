from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.models.notice import RequestKind, RequestStatus


class RequestCreate(BaseModel):
    kind: RequestKind
    subject: Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)] = ""
    details: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class RequestOut(BaseModel):
    id: int
    kind: RequestKind
    subject: str
    details: str
    status: RequestStatus
    teacher_id: int
    teacher_name: str
    teacher_email: str
    teacher_department: str
    claimed_by_id: int | None
    claimed_by_name: str | None
    claimed_at: datetime | None
    resolved_by_name: str | None
    resolved_at: datetime | None
    created_at: datetime


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    title: str
    detail: str
    actor_name: str
    created_at: datetime
