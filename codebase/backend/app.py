import json, os, re, difflib, uvicorn
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from openai import OpenAI

app = FastAPI(title="Pill Explainer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent.parent.parent / "data_c4ai" / "clean.jsonl"

class Drug(BaseModel):
    id: int
    ten_thuoc: str
    hoat_chat: str
    dang_bao_che: str
    so_dang_ky: str
    nha_san_xuat: str
    chi_dinh: str
    lieu_dung: str
    tac_dung_phu: str
    chong_chi_dinh: str
    tuong_tac: str
    than_trong: str
    duoc_luc: str

class ChatRequest(BaseModel):
    drugs: list[Drug]
    question: str

def fix_encoding(text: str) -> str:
    return text.strip()

def normalize(text: str) -> str:
    text = text.lower().strip()
    replacements = {
        "đ": "d", "Đ": "d",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    import unicodedata
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    return text

drugs: list[Drug] = []
drug_id_counter = 0

def load_drugs():
    global drugs, drug_id_counter
    drugs = []
    with open(DATA_PATH, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError:
                continue
            drug = Drug(
                id=drug_id_counter,
                ten_thuoc=fix_encoding(raw.get("ten_thuoc", "")),
                hoat_chat=fix_encoding(raw.get("hoat_chat", "")),
                dang_bao_che=fix_encoding(raw.get("dang_bao_che", "")),
                so_dang_ky=fix_encoding(raw.get("so_dang_ky", "")),
                nha_san_xuat=fix_encoding(raw.get("nha_san_xuat", "")),
                chi_dinh=fix_encoding(raw.get("chi_dinh", "")),
                lieu_dung=fix_encoding(raw.get("lieu_dung", "")),
                tac_dung_phu=fix_encoding(raw.get("tac_dung_phu", "")),
                chong_chi_dinh=fix_encoding(raw.get("chong_chi_dinh", "")),
                tuong_tac=fix_encoding(raw.get("tuong_tac", "")),
                than_trong=fix_encoding(raw.get("than_trong", "")),
                duoc_luc=fix_encoding(raw.get("duoc_luc", "")),
            )
            drugs.append(drug)
            drug_id_counter += 1
    print(f"Loaded {len(drugs)} drugs")

@app.on_event("startup")
async def startup():
    load_drugs()

@app.get("/api/drugs/search")
async def search_drugs(q: str = Query("", min_length=1)):
    if not q:
        return {"results": []}
    q_norm = normalize(q)
    scored = []
    for drug in drugs:
        name_norm = normalize(drug.ten_thuoc)
        hoat_chat_norm = normalize(drug.hoat_chat)
        max_score = 0
        if q_norm in name_norm:
            max_score = max(max_score, 0.8 + 0.2 * (len(q_norm) / max(len(name_norm), 1)))
        if q_norm in hoat_chat_norm:
            max_score = max(max_score, 0.7 + 0.2 * (len(q_norm) / max(len(hoat_chat_norm), 1)))
        if name_norm.startswith(q_norm):
            max_score = max(max_score, 0.9)
        if q_norm in name_norm.split():
            max_score = max(max_score, 0.75)
        ratio = difflib.SequenceMatcher(None, q_norm, name_norm).ratio()
        if ratio > 0.5:
            max_score = max(max_score, ratio)
        if q_norm in hoat_chat_norm.split():
            max_score = max(max_score, 0.65)
        if max_score > 0.4:
            scored.append((max_score, drug))
    scored.sort(key=lambda x: (-x[0], x[1].ten_thuoc))
    results = []
    for score, drug in scored[:10]:
        results.append({
            "id": drug.id,
            "ten_thuoc": drug.ten_thuoc,
            "hoat_chat": drug.hoat_chat,
            "dang_bao_che": drug.dang_bao_che,
            "chi_dinh_tom_tat": drug.chi_dinh[:120] + "..." if len(drug.chi_dinh) > 120 else drug.chi_dinh,
            "score": round(score, 3),
        })
    return {"results": results}

@app.post("/api/drugs/summary")
async def get_summary(drug_ids: list[int]):
    result = []
    for did in drug_ids:
        drug = next((d for d in drugs if d.id == did), None)
        if drug is None:
            continue
        side_effects = [s.strip() for s in re.split(r"[.;,\n]", drug.tac_dung_phu) if s.strip()][:5]
        result.append({
            "id": drug.id,
            "ten_thuoc": drug.ten_thuoc,
            "hoat_chat": drug.hoat_chat,
            "dang_bao_che": drug.dang_bao_che,
            "chi_dinh": drug.chi_dinh[:200] + "..." if len(drug.chi_dinh) > 200 else drug.chi_dinh,
            "lieu_dung": drug.lieu_dung[:200] + "..." if len(drug.lieu_dung) > 200 else drug.lieu_dung,
            "tac_dung_phu": side_effects,
            "chong_chi_dinh": drug.chong_chi_dinh[:200] + "..." if len(drug.chong_chi_dinh) > 200 else drug.chong_chi_dinh,
            "tuong_tac": drug.tuong_tac[:200] + "..." if len(drug.tuong_tac) > 200 else drug.tuong_tac,
            "than_trong": drug.than_trong[:200] + "..." if len(drug.than_trong) > 200 else drug.than_trong,
        })
    return {"drugs": result}

client = None
if os.environ.get("OPENAI_API_KEY"):
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not client:
        return {"reply": "⚠️ Chưa cấu hình API key AI. Vui lòng đặt biến môi trường OPENAI_API_KEY."}
    drug_list = "\n".join(
        f"- {d.ten_thuoc} (hoạt chất: {d.hoat_chat}): {d.chi_dinh[:200]} | Liều: {d.lieu_dung[:200]} | Tác dụng phụ: {d.tac_dung_phu[:200]} | Tương tác: {d.tuong_tac[:200]}"
        for d in req.drugs
    )
    system_prompt = f"""Bạn là dược sĩ AI. Người dùng có đơn thuốc gồm các thuốc sau:

{drug_list}

Hãy trả lời câu hỏi của người dùng bằng tiếng Việt đơn giản, dễ hiểu.
Dựa trên dữ liệu thực tế của từng thuốc. Nếu không có thông tin, nói rõ "không có dữ liệu".
Luôn khuyên người dùng tham khảo ý kiến dược sĩ hoặc bác sĩ khi cần."""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.question},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        return {"reply": resp.choices[0].message.content}
    except Exception as e:
        return {"reply": f"❌ Lỗi AI: {str(e)}"}

@app.get("/api/health")
async def health():
    return {"status": "ok", "drugs_count": len(drugs)}

FRONTEND_PATH = Path(__file__).parent.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND_PATH, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
