import json, re, difflib
from pathlib import Path
from models import Drug


DATA_PATH = Path(__file__).parent.parent.parent / "data_c4ai" / "clean.jsonl"

drugs: list[Drug] = []


def fix_encoding(text: str) -> str:
    return text.strip()


def normalize(text: str) -> str:
    import unicodedata
    text = text.lower().strip()
    for a, b in {"đ": "d", "Đ": "d"}.items():
        text = text.replace(a, b)
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    return text


def load_drugs():
    global drugs
    drugs.clear()
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
                id=len(drugs),
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
    print(f"Loaded {len(drugs)} drugs")
    return drugs


def search_drugs(query: str, limit: int = 10) -> list[dict]:
    if not query:
        return []
    q_norm = normalize(query)
    scored = []
    for drug in drugs:
        name_norm = normalize(drug.ten_thuoc)
        hoat_chat_norm = normalize(drug.hoat_chat)
        score = 0.0
        if name_norm.startswith(q_norm):
            score = max(score, 0.9)
        elif q_norm in name_norm:
            score = max(score, 0.8 + 0.2 * (len(q_norm) / max(len(name_norm), 1)))
        if q_norm in name_norm.split():
            score = max(score, 0.75)
        ratio = difflib.SequenceMatcher(None, q_norm, name_norm).ratio()
        if ratio > 0.5:
            score = max(score, ratio)
        if q_norm in hoat_chat_norm:
            score = max(score, 0.7 + 0.2 * (len(q_norm) / max(len(hoat_chat_norm), 1)))
        elif q_norm in hoat_chat_norm.split():
            score = max(score, 0.65)
        if score > 0.4:
            scored.append((score, drug))
    scored.sort(key=lambda x: (-x[0], x[1].ten_thuoc))
    return [
        {
            "id": drug.id,
            "ten_thuoc": drug.ten_thuoc,
            "hoat_chat": drug.hoat_chat,
            "dang_bao_che": drug.dang_bao_che,
            "chi_dinh_tom_tat": (drug.chi_dinh[:120] + "...") if len(drug.chi_dinh) > 120 else drug.chi_dinh,
            "score": round(score, 3),
        }
        for score, drug in scored[:limit]
    ]


def get_summaries(drug_ids: list[int]) -> list[dict]:
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
            "chi_dinh": (drug.chi_dinh[:200] + "...") if len(drug.chi_dinh) > 200 else drug.chi_dinh,
            "lieu_dung": (drug.lieu_dung[:200] + "...") if len(drug.lieu_dung) > 200 else drug.lieu_dung,
            "tac_dung_phu": side_effects,
            "chong_chi_dinh": (drug.chong_chi_dinh[:200] + "...") if len(drug.chong_chi_dinh) > 200 else drug.chong_chi_dinh,
            "tuong_tac": (drug.tuong_tac[:200] + "...") if len(drug.tuong_tac) > 200 else drug.tuong_tac,
            "than_trong": (drug.than_trong[:200] + "...") if len(drug.than_trong) > 200 else drug.than_trong,
        })
    return result
