from fastapi import APIRouter

from drug_data import drugs
from llm_service import ask_llm, format_drug_context
from models import ChatRequest


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat(payload: ChatRequest):
    selected = [drug.model_dump() for drug in drugs if drug.id in payload.drug_ids]
    context = format_drug_context(selected)
    answer = ask_llm(payload.question, context)
    return {
        "answer": answer,
        "source": "llm",
        "related_drug_ids": payload.drug_ids,
    }
