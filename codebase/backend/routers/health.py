from fastapi import APIRouter

from drug_data import drugs


router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "drug_count": len(drugs)}
