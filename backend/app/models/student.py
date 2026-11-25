from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import AttendanceRecord
    from app.models.section import Section


class Student(Base):
    __tablename__ = "students"
    # College roll number: the student's unique ID across the whole college.
    __table_args__ = (
        UniqueConstraint("roll_number", name="uq_students_roll_number"),
        UniqueConstraint("email", name="uq_students_email"),
        UniqueConstraint("nfc_uid", name="uq_students_nfc_uid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    roll_number: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id"), nullable=False, index=True)
    # Optional contact + sign-in details; the student portal does not use them yet.
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Optional subbatch inside the batch (A, B, ...); empty = not split. Labs for a subbatch use it.
    subbatch: Mapped[str] = mapped_column(String(10), nullable=False, default="", server_default="")
    # Serial number (UID) of the student's NFC ID card: uppercase hex, no separators. Tapping the card on the
    # teacher's phone marks them present. The UID can be copied, so it is a convenience, not proof of identity.
    nfc_uid: Mapped[str | None] = mapped_column(String(40), nullable=True)
    face_embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    # Bumped to sign the student out everywhere (see User.token_version).
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    section: Mapped[Section] = relationship(back_populates="students")
    attendance_records: Mapped[list[AttendanceRecord]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    photos: Mapped[list[StudentPhoto]] = relationship(
        back_populates="student", cascade="all, delete-orphan", order_by="StudentPhoto.id"
    )

    @property
    def face_enrolled(self) -> bool:
        return self.face_embedding is not None

    @property
    def nfc_linked(self) -> bool:
        return self.nfc_uid is not None


class StudentPhoto(Base):
    """An enrollment photo kept in the private S3 bucket (key only; never a public URL)."""

    __tablename__ = "student_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    s3_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    student: Mapped[Student] = relationship(back_populates="photos")
