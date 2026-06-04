import time
import json
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from openai import OpenAI


def _trunc(v: str, n: int = 400) -> str:
    return (v[:n] + "...") if len(v) > n else v


def format_drug_context(drugs: list[dict]) -> str:
    lines = []
    for d in drugs:
        lines.append(f"=== {d.get('ten_thuoc','')} ===")
        lines.append(f"  Hoạt chất: {d.get('hoat_chat','')}")
        lines.append(f"  Dạng bào chế: {d.get('dang_bao_che','')}")
        lines.append(f"  Nhà sản xuất: {d.get('nha_san_xuat','')}")
        if d.get('duoc_luc'):
            lines.append(f"  Dược lực: {_trunc(d['duoc_luc'])}")
        if d.get('chi_dinh'):
            lines.append(f"  Công dụng - Chỉ định: {_trunc(d['chi_dinh'])}")
        if d.get('lieu_dung'):
            lines.append(f"  Liều dùng: {_trunc(d['lieu_dung'])}")
        if d.get('tac_dung_phu'):
            lines.append(f"  Tác dụng phụ: {_trunc(d['tac_dung_phu'])}")
        if d.get('chong_chi_dinh'):
            lines.append(f"  Chống chỉ định: {_trunc(d['chong_chi_dinh'])}")
        if d.get('tuong_tac'):
            lines.append(f"  Tương tác thuốc: {_trunc(d['tuong_tac'])}")
        if d.get('than_trong'):
            lines.append(f"  Thận trọng: {_trunc(d['than_trong'])}")
        if d.get('bao_quan'):
            lines.append(f"  Bảo quản: {_trunc(d['bao_quan'])}")
        lines.append("")
    return "\n".join(lines)


def get_client():
    if not LLM_API_KEY:
        return None
    return OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


SYSTEM_PROMPT = """Bạn là dược sĩ Long Châu. Trả lời ngắn gọn, súc tích bằng tiếng Việt.

NHIỆM VỤ: Phân tích đơn thuốc dựa trên dữ liệu thực tế. KHÔNG bịa thêm. Nếu thiếu → nói rõ "không có thông tin".

XỬ LÝ THEO LOẠI CÂU HỎI:
[1] Công dụng → dùng chi_dinh + duoc_luc
[2] Tương tác → so sánh hoạt chất + tuong_tac
[3] Liều dùng → trích lieu_dung
[4] Tác dụng phụ → dùng tac_dung_phu
[5] Chống chỉ định → dùng chong_chi_dinh + than_trong
[6] Tổng quát → công dụng → liều → tác dụng phụ → tương tác → cảnh báo

OUTPUT: markdown (##, **, -).
Kết thúc: "Vui lòng tham khảo dược sĩ/bác sĩ để được tư vấn cụ thể."
KHÔNG thêm JSON.
"""


def _build_messages(question: str, drug_context: str, history: list[dict] | None = None) -> list[dict]:
    full_question = question
    if drug_context:
        full_question = f"DỮ LIỆU ĐƠN THUỐC ({len(drug_context.split('==='))-1} thuốc):\n\n{drug_context}\n\n---\n\nCÂU HỎI: {question}"
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history[-6:])
    messages.append({"role": "user", "content": full_question})
    return messages


def ask_llm(question: str, drug_context: str, history: list[dict] | None = None) -> dict:
    client = get_client()
    t0 = time.time()

    if not client:
        return {
            "content": "⚠️ Chưa cấu hình LLM. Kiểm tra file `.env`.",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "time_ms": round((time.time() - t0) * 1000),
        }

    messages = _build_messages(question, drug_context, history)

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=4096,
        )
        content = (resp.choices[0].message.content or "").strip()
        if content.startswith("```"):
            lines = content.splitlines()
            content = "\n".join(l for l in lines if not l.startswith("```"))

        usage = resp.usage
        return {
            "content": content or "Vui lòng thử lại.",
            "usage": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
                "total_tokens": usage.total_tokens if usage else 0,
            },
            "time_ms": round((time.time() - t0) * 1000),
        }
    except Exception as e:
        return {
            "content": f"❌ Lỗi AI: {str(e)}",
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "time_ms": round((time.time() - t0) * 1000),
        }


def ask_llm_stream(question: str, drug_context: str):
    client = get_client()
    t0 = time.time()

    if not client:
        yield json.dumps({"error": "Chưa cấu hình LLM", "time_ms": round((time.time() - t0) * 1000)})
        return

    messages = _build_messages(question, drug_context)

    try:
        stream = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=4096,
            stream=True,
            stream_options={"include_usage": True},
        )

        for chunk in stream:
            elapsed = round((time.time() - t0) * 1000)
            if chunk.choices and chunk.choices[0].delta.content:
                yield json.dumps({"token": chunk.choices[0].delta.content, "time_ms": elapsed})
            if chunk.usage:
                u = chunk.usage
                yield json.dumps({
                    "done": True,
                    "usage": {
                        "prompt_tokens": u.prompt_tokens or 0,
                        "completion_tokens": u.completion_tokens or 0,
                        "total_tokens": u.total_tokens or 0,
                    },
                    "time_ms": elapsed,
                })
                return

        yield json.dumps({"done": True, "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}, "time_ms": round((time.time() - t0) * 1000)})
    except Exception as e:
        yield json.dumps({"error": str(e), "time_ms": round((time.time() - t0) * 1000)})
