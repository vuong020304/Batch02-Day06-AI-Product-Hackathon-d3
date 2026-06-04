from fastapi import APIRouter, Query

from drug_data import search_drugs


router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search(q: str = Query(default="", min_length=0), limit: int = Query(default=10, ge=1, le=30)):
    results = search_drugs(q, limit)
    return {
        "query": q,
        "count": len(results),
        "results": results,
        "fallback_message": None if results else "Khong tim thay thuoc phu hop. Hay thu ten hoat chat hoac ten biet duoc khac.",
    }
