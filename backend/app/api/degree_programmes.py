from fastapi import APIRouter, Depends

from app.core.degree_programmes import DEGREE_PROGRAMMES, FIRST_YEAR_LETTERS, FIRST_YEAR_OWN_LETTER, PROGRAMME_CODES, PROGRAMME_YEARS, duration_years
from app.core.deps import require_roles
from app.models import UserRole

router = APIRouter(prefix="/degree-programmes", tags=["degree-programmes"])


@router.get("", response_model=list[str])
def list_degree_programmes(_=Depends(require_roles(UserRole.ADMIN, UserRole.TEACHER))) -> list[str]:
    return DEGREE_PROGRAMMES


@router.get("/codes", response_model=dict[str, str])
def list_degree_programme_codes(_=Depends(require_roles(UserRole.ADMIN, UserRole.TEACHER))) -> dict[str, str]:
    """Each programme's letter(s) in a batch name (3C23 = year 3, Computer Engineering)."""
    return PROGRAMME_CODES


@router.get("/first-year")
def first_year_rule(_=Depends(require_roles(UserRole.ADMIN, UserRole.TEACHER))) -> dict:
    """Year-1 batches are group A or B, except for the programmes listed in `own_letter`."""
    return {"letters": FIRST_YEAR_LETTERS, "own_letter": sorted(FIRST_YEAR_OWN_LETTER)}


@router.get("/year-limits", response_model=dict[str, list[int]])
def year_limits(_=Depends(require_roles(UserRole.ADMIN, UserRole.TEACHER))) -> dict[str, list[int]]:
    """Programmes that are only offered to batches in certain years of study (the batch name's first digit)."""
    return {label: sorted(years) for label, years in PROGRAMME_YEARS.items()}


@router.get("/durations", response_model=dict[str, int])
def durations(_=Depends(require_roles(UserRole.ADMIN, UserRole.TEACHER))) -> dict[str, int]:
    """How many years each degree lasts: a batch's last year is its first year plus this."""
    return {label: duration_years(label) for label in DEGREE_PROGRAMMES}
