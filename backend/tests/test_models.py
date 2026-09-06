from sqlalchemy import CheckConstraint

from app.db.base import Base
from app.models import AttendanceRecord, AttendanceStatus, User, UserRole


def test_model_registry_contains_all_readme_entities() -> None:
    assert set(Base.metadata.tables) == {
        "users",
        "classrooms",
        "students",
        "attendance_sessions",
        "attendance_records",
    }


def test_role_and_attendance_enums_persist_api_values() -> None:
    user_role = User.__table__.c.role.type
    attendance_status = AttendanceRecord.__table__.c.status.type

    assert user_role.enums == [role.value for role in UserRole]
    assert attendance_status.enums == [status.value for status in AttendanceStatus]


def test_attendance_records_require_unique_student_and_valid_confidence() -> None:
    table = AttendanceRecord.__table__
    constraint_names = {constraint.name for constraint in table.constraints}

    assert "uq_attendance_records_session_student" in constraint_names
    confidence_constraint = next(
        constraint
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
        and constraint.name == "ck_attendance_records_confidence_range"
    )
    assert str(confidence_constraint.sqltext) == (
        "recognition_confidence IS NULL OR recognition_confidence BETWEEN 0 AND 1"
    )