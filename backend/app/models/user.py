from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.classroom import Classroom


class UserRole(StrEnum):
    TEACHER = "teacher"
    STUDENT = "student"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # A teacher's department (empty for admins and for teachers not placed yet).
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    # A teacher's rank, one of app.core.designations.DESIGNATIONS (empty when not set).
    designation: Mapped[str] = mapped_column(String(60), nullable=False, default="", server_default="")
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda role: [member.value for member in role],
        ),
        nullable=False,
        default=UserRole.STUDENT,
    )

    # Bumped to sign the account out everywhere: tokens carry it as "tv" and older ones stop working.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    classrooms: Mapped[list[Classroom]] = relationship(back_populates="teacher")
