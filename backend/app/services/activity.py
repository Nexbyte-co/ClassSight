"""Writes the admin dashboard's "Recent activity" lines. The caller commits."""

from sqlalchemy.orm import Session

from app.models import ActivityEvent, User


def log(db: Session, kind: str, title: str, detail: str = "", actor: User | None = None) -> None:
    db.add(
        ActivityEvent(
            kind=kind,
            title=title[:200],
            detail=detail[:400],
            actor_id=actor.id if actor else None,
            actor_name=actor.name if actor else "",
        )
    )
