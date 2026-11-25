from sqlalchemy import Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Department(Base):
    """A college department (for example "Department of Mathematics"). Name unique, ignoring case.

    Classes store the department's name in `Classroom.department`."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)


Index("uq_departments_name_lower", func.lower(Department.name), unique=True)
