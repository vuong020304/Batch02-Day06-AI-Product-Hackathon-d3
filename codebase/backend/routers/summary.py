from fastapi import APIRouter
from pydantic import BaseModel

from drug_data import get_summaries


class SummaryRequest(BaseModel):
    drug_ids: list[int]


router = APIRouter(prefix="/api", tags=["summary"])


@router.post("/summary")
async def summary(payload: SummaryRequest):
    summaries = get_summaries(payload.drug_ids)
    return {"drugs": summaries}
