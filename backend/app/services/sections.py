"""Batch / subbatch links. A subbatch's name continues its batch's name (3C23 inside 3C2)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Section


def parent_for(db: Session, name: str, exclude_id: int | None = None) -> int | None:
    """The batch `name` belongs to: the longest other batch name it strictly starts with, ignoring case."""
    lowered = name.lower()
    rows = db.query(Section.id, Section.name).filter(func.length(Section.name) < len(name)).all()
    best = None
    for sid, other in rows:
        if sid == exclude_id or not lowered.startswith(other.lower()):
            continue
        if best is None or len(other) > len(best[1]):
            best = (sid, other)
    return best[0] if best else None


def relink(db: Session) -> None:
    """Recompute every batch's parent from the names (after one is added, renamed or removed)."""
    for section in db.query(Section).all():
        section.parent_id = parent_for(db, section.name, section.id)


def family_ids(section_id: int):
    """SQL subquery: the batch's id and the ids of all its subbatches, at any depth."""
    tree = select(Section.id).where(Section.id == section_id).cte("family", recursive=True)
    tree = tree.union_all(select(Section.id).where(Section.parent_id == tree.c.id))
    return select(tree.c.id)


def ancestor_ids(db: Session, section_id: int) -> list[int]:
    """The batch itself and the batches above it (a subbatch also attends its batch's classes)."""
    ids, current = [], db.get(Section, section_id)
    while current is not None and current.id not in ids:
        ids.append(current.id)
        current = current.parent
    return ids
