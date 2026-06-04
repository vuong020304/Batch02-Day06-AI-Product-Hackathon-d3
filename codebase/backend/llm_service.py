import json
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from tools import TOOL_DEFINITIONS, execute_tool

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


def format_drug_context(drugs: list[dict]) -> str:
    lines = []
    for d in drugs:
        lines.append(f"- [ID={d.get('id','?')}] {d.get('ten_thuoc','')} (hoạt chất: {d.get('hoat_chat','')})")
        lines.append(f"  Công dụng: {d.get('chi_dinh','Không rõ')[:200]}")
        lines.append(f"  Liều dùng: {d.get('lieu_dung','Không rõ')[:200]}")
        lines.append(f"  Tác dụng phụ: {d.get('tac_dung_phu','Không rõ')[:200]}")
        lines.append(f"  Chống chỉ định: {d.get('chong_chi_dinh','Không rõ')[:200]}")
        lines.append(f"  Tương tác: {d.get('tuong_tac','Không rõ')[:200]}")
        lines.append(f"  Thận trọng: {d.get('than_trong','Không rõ')[:200]}")
        lines.append("")
    return "\n".join(lines)


def get_client():
    if not LLM_API_KEY or OpenAI is None:
        return None
    return OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


SYSTEM_PROMPT = """Bạn là dược sĩ AI — chuyên gia phân tích đơn thuốc. Trả lời bằng tiếng Việt.

Dữ liệu đơn thuốc đã được cung cấp sẵn trong context. Chỉ dùng công cụ check_interaction khi cần kiểm tra tương tác giữa 2 thuốc cụ thể — dùng ID trong context.

PHÂN TÍCH THEO CÁC BƯỚC:
1. Xác định từng thuốc và công dụng
2. Kiểm tra tương tác (gọi check_interaction nếu cần)
3. Đề xuất lịch uống
4. Cảnh báo tác dụng phụ

NGUYÊN TẮC:
- Luôn dựa trên dữ liệu thực tế
- Nếu không có dữ liệu → nói rõ
- Cuối cùng luôn khuyên tham khảo dược sĩ/bác sĩ

LUÔN TRẢ LỜI = JSON hợp lệ. KHÔNG thêm text ngoài JSON. Cấu trúc:
{
  "tieu_de": "Tiêu đề ngắn",
  "phan_tich": "Phân tích tổng quan",
  "tuong_tac": [{"thuoc_1": "...", "thuoc_2": "...", "muc_do": "cao/trung binh/thap", "noi_dung": "..."}],
  "lich_uong": "Đề xuất lịch uống",
  "canh_bao": ["Cảnh báo 1", "Cảnh báo 2"],
  "cau_tra_loi": "Câu trả lời trực tiếp cho người dùng"
}

Nếu không có tương tác thì "tuong_tac": [].
Nếu không có lịch uống thì "lich_uong": "".
Output PHẢI là JSON object thuần túy, không markdown, không code block."""


def run_tool_loop(client, model, messages: list[dict], max_rounds: int = 5) -> str:
    for rnd in range(max_rounds):
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.3,
            max_tokens=2000,
        )
        msg = resp.choices[0].message
        if msg.tool_calls:
            messages.append(msg)
            for tc in msg.tool_calls:
                name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}
                result = execute_tool(name, args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
            if rnd == max_rounds - 1:
                messages.append({"role": "user", "content": "Hãy trả lời bằng JSON dựa trên dữ liệu đã có. Đừng gọi thêm tool. Output = JSON thuần túy."})
        else:
            content = msg.content or "{}"
            content = content.strip()
            if content.startswith("```"):
                lines = content.splitlines()
                content = "\n".join(l for l in lines if not l.startswith("```"))
            return content
    return '{"tieu_de":"Phân tích","phan_tich":"","tuong_tac":[],"lich_uong":"","canh_bao":[],"cau_tra_loi":"Vui lòng thử lại câu hỏi."}'


def ask_llm(question: str, drug_context: str, history: list[dict] | None = None) -> dict:
    client = get_client()
    if not client:
        return {
            "tieu_de": "Chưa cấu hình LLM",
            "phan_tich": "",
            "tuong_tac": [],
            "lich_uong": "",
            "canh_bao": [],
            "cau_tra_loi": "⚠️ Chưa cấu hình LLM. Thêm file `.env` trong thư mục backend:\n  LLM_API_KEY=sk-...\n  LLM_BASE_URL=https://...\n  LLM_MODEL=model-name",
        }

    full_question = question
    if drug_context:
        full_question = f"DỮ LIỆU ĐƠN THUỐC:\n\n{drug_context}\n\n---\n\nCÂU HỎI: {question}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history[-6:])
    messages.append({"role": "user", "content": full_question})

    try:
        raw = run_tool_loop(client, LLM_MODEL, messages)
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.splitlines()
            raw = "\n".join(l for l in lines if not l.startswith("```"))
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            parsed = {}
        fallback_text = raw[:1500] if raw and raw != "{}" else "Vui lòng thử lại."
        required = {"tieu_de", "cau_tra_loi"}
        if not required.intersection(parsed.keys()):
            return {"tieu_de": "Phân tích", "phan_tich": "", "tuong_tac": [], "lich_uong": "", "canh_bao": [], "cau_tra_loi": fallback_text}
        parsed.setdefault("phan_tich", "")
        parsed.setdefault("tuong_tac", [])
        parsed.setdefault("lich_uong", "")
        parsed.setdefault("canh_bao", [])
        return parsed
    except json.JSONDecodeError:
        text = raw[:1500] if "raw" in dir() and raw else "Lỗi xử lý"
        return {"tieu_de": "Phân tích", "phan_tich": "", "tuong_tac": [], "lich_uong": "", "canh_bao": [], "cau_tra_loi": text}
    except Exception as e:
        return {"tieu_de": "Lỗi", "phan_tich": "", "tuong_tac": [], "lich_uong": "", "canh_bao": [], "cau_tra_loi": f"❌ Lỗi AI: {str(e)}"}
