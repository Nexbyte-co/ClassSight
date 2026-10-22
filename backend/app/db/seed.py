"""Create the first admin account so a fresh database can be logged into.

Usage (after `alembic upgrade head`):
    SEED_ADMIN_EMAIL=you@school.edu python -m app.db.seed

The password comes from SEED_ADMIN_PASSWORD; when unset, a random one is
generated and printed once. Safe to re-run: an existing user is left untouched.
No classrooms or students are created.
"""

import os
import secrets
import sys

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User, UserRole


def seed_admin(db: Session, email: str, name: str, password: str | None) -> str | None:
    """Create the admin; return the generated password, or None if not generated."""
    if db.query(User).filter(User.email == email).first() is not None:
        print(f"User {email} already exists; nothing to do.")
        return None

    generated = password is None
    if generated:
        password = secrets.token_urlsafe(12)
    db.add(
        User(name=name, email=email, password_hash=hash_password(password), role=UserRole.ADMIN)
    )
    db.commit()
    print(f"Created admin {email}")
    return password if generated else None


def main() -> None:
    email = os.getenv("SEED_ADMIN_EMAIL")
    if not email:
        sys.exit("Set SEED_ADMIN_EMAIL (and optionally SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME).")

    with SessionLocal() as db:
        generated = seed_admin(
            db,
            email=email,
            name=os.getenv("SEED_ADMIN_NAME", "Admin"),
            password=os.getenv("SEED_ADMIN_PASSWORD"),
        )
    if generated:
        print(f"Generated password (shown once): {generated}")


if __name__ == "__main__":
    main()
