"""Load students from the college spreadsheets into the database (mock/dev data).

Usage (after `alembic upgrade head`):
    python -m app.db.seed_students ROLLS.xlsx [EMAILS.xlsx] [--apply]

Without --apply nothing is written; it only prints what would happen.

- ROLLS.xlsx: panel sheets, repeated groups of columns (serial, roll number, name).
- EMAILS.xlsx (optional): "University Registration Number" + "Name" columns. Used only to add
  students missing from ROLLS.xlsx; the model has no email/phone fields, so those are not stored.

No batch or section is known yet, so every student goes into one placeholder section,
"UNASSIGNED", to be moved later. Roll numbers already in the database are left untouched.
The spreadsheets hold real roll numbers: keep them out of git.
"""

import re
import sys
import zipfile
import xml.etree.ElementTree as ET

from app.db.session import SessionLocal
from app.models import Section, Student

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
PLACEHOLDER_SECTION = "UNASSIGNED"
ROLL_RE = re.compile(r"^\d{9,10}$")


def _col_index(ref: str) -> int:
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n


def read_sheets(path: str) -> list[list[dict[int, str]]]:
    """Each sheet -> list of rows -> {column number: text}. Stdlib only (no openpyxl)."""
    with zipfile.ZipFile(path) as z:
        strings: list[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(f"{NS}si"):
                strings.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
        sheets = []
        for name in sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n)):
            rows = []
            for row in ET.fromstring(z.read(name)).iter(f"{NS}row"):
                cells: dict[int, str] = {}
                for c in row.findall(f"{NS}c"):
                    if c.get("t") == "inlineStr":  # text stored in the cell itself
                        cells[_col_index(c.get("r"))] = "".join(t.text or "" for t in c.iter(f"{NS}t"))
                        continue
                    v = c.find(f"{NS}v")
                    if v is None or v.text is None:
                        continue
                    cells[_col_index(c.get("r"))] = strings[int(v.text)] if c.get("t") == "s" else v.text
                rows.append(cells)
            sheets.append(rows)
    return sheets


def _roll(text: str) -> str | None:
    text = text.strip()
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".")[0]
    return text if ROLL_RE.match(text) else None


def _clean(name: str) -> str:
    name = " ".join(name.split())
    return name.title() if name.isupper() else name


def students_from_rolls(path: str) -> dict[str, str]:
    """Roll -> name. A name sits in the column right after its roll number."""
    found: dict[str, str] = {}
    for rows in read_sheets(path):
        for cells in rows:
            for col, text in cells.items():
                roll = _roll(text)
                name = cells.get(col + 1, "").strip()
                if roll and name and not _roll(name) and not re.fullmatch(r"[\d.]+", name):
                    found.setdefault(roll, _clean(name))
    return found


def students_from_emails(path: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for rows in read_sheets(path):
        for cells in rows:
            roll = _roll(cells.get(2, ""))  # column B
            name = cells.get(3, "").strip()  # column C
            if roll and name:
                found.setdefault(roll, _clean(name))
    return found


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply = "--apply" in sys.argv
    if not args:
        sys.exit(__doc__)

    from_rolls = students_from_rolls(args[0])
    from_emails = students_from_emails(args[1]) if len(args) > 1 else {}
    merged = {**from_emails, **from_rolls}  # the roll list's spelling wins
    only_emails = sorted(set(from_emails) - set(from_rolls))
    print(f"{len(from_rolls)} in roll list, {len(from_emails)} in email list, "
          f"{len(only_emails)} only in email list -> {len(merged)} unique roll numbers")

    with SessionLocal() as db:
        existing = {r for (r,) in db.query(Student.roll_number).all()}
        new = {r: n for r, n in merged.items() if r not in existing}
        print(f"{len(existing)} already in database, {len(new)} to add to section {PLACEHOLDER_SECTION}")
        if not apply:
            print("Dry run: nothing written. Re-run with --apply.")
            return
        section = db.query(Section).filter(Section.name.ilike(PLACEHOLDER_SECTION)).first()
        if section is None:
            section = Section(name=PLACEHOLDER_SECTION)
            db.add(section)
            db.flush()
        db.add_all(Student(roll_number=r, name=n[:120], section_id=section.id) for r, n in new.items())
        db.commit()
        print(f"Added {len(new)} students.")


if __name__ == "__main__":
    main()
