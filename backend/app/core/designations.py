"""Faculty designations (ranks) a teacher can hold. The label is what is stored."""

DESIGNATIONS: list[str] = [
    "Professor",
    "Associate Professor",
    "Associate Professor-I",
    "Assistant Professor-I",
    "Assistant Professor-II",
    "Assistant Professor-III",
    "Assistant Professor (C-I)",
    "Assistant Professor (C-II)",
    "Assistant Professor (C-II) (Research)",
    "Assistant Professor (3C)",
    "Assistant Professor (T)",
    "Assistant Professor (Term)",
    "Assistant Professor JR",
]

_BY_LOWER = {name.lower(): name for name in DESIGNATIONS}


def canonical_designation(value: str) -> str | None:
    """The list's spelling of `value` (ignoring case), or None when it is not a known designation."""
    return _BY_LOWER.get(value.strip().lower())
