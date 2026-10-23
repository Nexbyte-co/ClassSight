"""Shared dataset loader for the Phase C scripts (e2e_verify.py, e2e_scores.py).

Expected layout (kept outside the repo; see classsight-data/README.txt):

    students.csv                  roll_number,name  (name optional; see below)
    enroll/<roll_number>/*.jpg    photos used to enroll that student
    verify/known/<roll>_*.jpg     different photos of enrolled students
    verify/unknown/*.jpg          photos of people who are not enrolled (optional)
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass
class Dataset:
    names: dict[str, str]  # roll_number -> name
    enroll: dict[str, list[Path]]  # roll_number -> enrollment photos
    known: dict[str, list[Path]] = field(default_factory=dict)  # roll_number -> verify photos
    unknown: list[Path] = field(default_factory=list)

    @property
    def rolls(self) -> list[str]:
        return sorted(self.enroll)


def _images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(
        p for p in folder.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES and not p.name.startswith(".")
    )


def load_dataset(data_dir: Path) -> Dataset:
    enroll = {d.name: _images(d) for d in sorted((data_dir / "enroll").iterdir()) if d.is_dir()}
    enroll = {roll: photos for roll, photos in enroll.items() if photos}
    if not enroll:
        raise SystemExit(f"No enrollment photos found under {data_dir / 'enroll'}")

    names: dict[str, str] = {}
    csv_path = data_dir / "students.csv"
    if csv_path.exists():
        with csv_path.open(newline="") as fh:
            for row in csv.DictReader(fh):
                if row.get("roll_number"):
                    names[row["roll_number"].strip()] = (row.get("name") or "").strip()
    # A roll number is the real identifier; fall back to a placeholder so results hold no real names.
    names = {roll: names.get(roll) or f"Student {roll}" for roll in enroll}

    known: dict[str, list[Path]] = {roll: [] for roll in enroll}
    for photo in _images(data_dir / "verify" / "known"):
        roll = photo.name.split("_", 1)[0]
        if roll not in known:
            raise SystemExit(f"{photo.name}: roll number {roll!r} has no enrollment folder")
        known[roll].append(photo)

    return Dataset(
        names=names,
        enroll=enroll,
        known={roll: photos for roll, photos in known.items() if photos},
        unknown=_images(data_dir / "verify" / "unknown"),
    )
