"""Thapar degree programmes a subject or batch can belong to, and the letter(s) each puts in a batch name.

A batch name is: year-of-study digit + the programme's letter(s) + the rest, e.g. 3C23 (3rd year, Computer
Engineering) or 1MCA2 (1st year, MCA). Programmes with no letter are not offered. The label is what is stored."""

PROGRAMME_CODES: dict[str, str] = {
    "BE Chemical (TIET UG)": "A",
    "BE Civil (TIET UG)": "B",
    "BE Computer Engineering (TIET UG)": "C",
    "BE EIC (TIET UG)": "E",  # Electronics & Instrumentation
    "BE ECE (TIET UG)": "F",  # Electronics & Communication
    "BTech Biotechnology (TIET UG)": "G",
    "BE Mechanical (TIET UG)": "H",
    "BE Mechatronics (TIET UG)": "I",
    "BE Biomedical (TIET UG)": "J",
    "BE Electronics & Computer (TIET UG)": "O",
    "BE CSE (TIET UG)": "Q",  # Computer Science & Engineering
    "BE CSBS (TIET UG)": "R",  # Computer Science & Business Systems
    "BE Electrical & Computer (TIET UG)": "S",
    "BE Civil with Computer (TIET UG)": "U",
    "BE VLSI (TIET UG)": "V",
    "BE Robotics & AI (TIET UG)": "W",
    "BE AI & DS (TIET UG)": "X",
    "MCA (TIET PG)": "MCA",
    # Dera Bassi campus, upper years only (see PROGRAMME_YEARS). Letter P.
    "3rd Year \u2014 Computer Science and Engineering DeraBassi": "P",
}

# How long each degree lasts, in years. A batch's last year is always its first year plus this. Not listed = 4.
PROGRAMME_DURATION: dict[str, int] = {"MCA (TIET PG)": 2}
DEFAULT_DURATION = 4


def duration_years(label: str) -> int | None:
    """The fixed length in years of a degree programme, or None for an unknown programme."""
    canonical = canonical_programme(label)
    return PROGRAMME_DURATION.get(canonical, DEFAULT_DURATION) if canonical else None


# Programmes only offered to batches in these years of study (a batch name's first digit).
PROGRAMME_YEARS: dict[str, set[int]] = {
    "3rd Year \u2014 Computer Science and Engineering DeraBassi": {3, 4},
}

DEGREE_PROGRAMMES: list[str] = list(PROGRAMME_CODES)

# First year (names starting with 1): most programmes share common first-year groups, so the letter is A or B.
# These keep their own letter from the first year.
FIRST_YEAR_OWN_LETTER: set[str] = {"BE AI & DS (TIET UG)", "BE CSBS (TIET UG)", "MCA (TIET PG)"}
FIRST_YEAR_LETTERS: list[str] = ["A", "B"]

_BY_LOWER = {name.lower(): name for name in DEGREE_PROGRAMMES}


def canonical_programme(value: str) -> str | None:
    """The list's spelling of `value` (ignoring case), or None when it is not a known programme."""
    return _BY_LOWER.get(value.strip().lower())


def offered_in_year(label: str, year: int) -> bool:
    """False when the programme is limited to other years of study than `year`."""
    canonical = canonical_programme(label)
    return canonical is not None and year in PROGRAMME_YEARS.get(canonical, {year})


def batch_letters(label: str, year: int) -> list[str] | None:
    """The letter(s) a batch of this programme and year of study may have after the year digit
    (A or B for common first-year groups), or None for an unknown programme."""
    canonical = canonical_programme(label)
    if canonical is None:
        return None
    if year == 1 and canonical not in FIRST_YEAR_OWN_LETTER:
        return FIRST_YEAR_LETTERS
    return [PROGRAMME_CODES[canonical]]


def programme_code(label: str) -> str | None:
    """The letter(s) a batch of this programme has in its name, or None for an unknown programme."""
    canonical = canonical_programme(label)
    return PROGRAMME_CODES[canonical] if canonical else None
