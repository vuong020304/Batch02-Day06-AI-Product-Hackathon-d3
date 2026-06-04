import re
from drug_data import drugs


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "check_interaction",
            "description": "Kiểm tra tương tác thuốc giữa 2 thuốc trong đơn",
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_a_id": {"type": "integer", "description": "ID của thuốc thứ nhất"},
                    "drug_b_id": {"type": "integer", "description": "ID của thuốc thứ hai"},
                },
                "required": ["drug_a_id", "drug_b_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_drug_detail",
            "description": "Lấy thông tin chi tiết của một thuốc theo ID",
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_id": {"type": "integer", "description": "ID của thuốc"},
                },
                "required": ["drug_id"],
            },
        },
    },
]


def check_interaction(drug_a_id: int, drug_b_id: int) -> str:
    a = next((d for d in drugs if d.id == drug_a_id), None)
    b = next((d for d in drugs if d.id == drug_b_id), None)
    if not a or not b:
        return "Không tìm thấy thuốc"

    rows = []
    if a.hoat_chat.lower() == b.hoat_chat.lower():
        rows.append(f"CẢNH BÁO: {a.ten_thuoc} và {b.ten_thuoc} có cùng hoạt chất {a.hoat_chat} — dùng cùng nhau gây quá liều!")
    if a.tuong_tac and b.ten_thuoc.lower() in a.tuong_tac.lower():
        snippet = a.tuong_tac[:300]
        rows.append(f"Tương tác ghi nhận: {snippet}")
    if b.tuong_tac and a.ten_thuoc.lower() in b.tuong_tac.lower():
        snippet = b.tuong_tac[:300]
        rows.append(f"Tương tác ghi nhận: {snippet}")
    if not rows:
        rows.append(f"Không tìm thấy dữ liệu tương tác giữa {a.ten_thuoc} và {b.ten_thuoc}.")
    return "\n".join(rows)


def get_drug_detail(drug_id: int) -> str:
    drug = next((d for d in drugs if d.id == drug_id), None)
    if not drug:
        return "Không tìm thấy thuốc"
    parts = [
        f"Tên: {drug.ten_thuoc}",
        f"Hoạt chất: {drug.hoat_chat}",
        f"Dạng bào chế: {drug.dang_bao_che}",
        f"Công dụng: {drug.chi_dinh[:400]}",
        f"Liều dùng: {drug.lieu_dung[:400]}",
        f"Tác dụng phụ: {drug.tac_dung_phu[:400]}",
        f"Chống chỉ định: {drug.chong_chi_dinh[:400]}",
        f"Tương tác: {drug.tuong_tac[:400]}",
        f"Thận trọng: {drug.than_trong[:400]}",
    ]
    return "\n".join(parts)


TOOL_FUNCTIONS = {
    "check_interaction": check_interaction,
    "get_drug_detail": get_drug_detail,
}


def execute_tool(name: str, args: dict) -> str:
    fn = TOOL_FUNCTIONS.get(name)
    if not fn:
        return f"Unknown tool: {name}"
    return fn(**args)
