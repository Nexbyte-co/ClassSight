from fastapi import APIRouter, Depends

from app.core.designations import DESIGNATIONS
from app.core.deps import require_roles
from app.models import UserRole

router = APIRouter(prefix="/designations", tags=["designations"])


@router.get("", response_model=list[str])
def list_designations(_=Depends(require_roles(UserRole.ADMIN, UserRole.TEACHER))) -> list[str]:
    return DESIGNATIONS
