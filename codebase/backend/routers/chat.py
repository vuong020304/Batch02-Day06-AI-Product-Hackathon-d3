from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from drug_data import drugs
from llm_service import ask_llm, ask_llm_stream, format_drug_context
from models import ChatRequest


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat(payload: ChatRequest):
    selected = [drug.model_dump() for drug in drugs if drug.id in payload.drug_ids]
    context = format_drug_context(selected)
    result = ask_llm(payload.question, context)
    return {
        "answer": {
            "cau_tra_loi": result["content"],
            "tieu_de": "",
            "phan_tich": "",
            "tuong_tac": [],
            "lich_uong": "",
            "canh_bao": [],
        },
        "source": "llm",
        "related_drug_ids": payload.drug_ids,
        "usage": result["usage"],
        "time_ms": result["time_ms"],
    }


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest):
    selected = [drug.model_dump() for drug in drugs if drug.id in payload.drug_ids]
    context = format_drug_context(selected)

    async def event_stream():
        for line in ask_llm_stream(payload.question, context):
            yield f"data: {line}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
