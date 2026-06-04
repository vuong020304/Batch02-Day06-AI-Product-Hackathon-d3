from pydantic import BaseModel


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
    drug_ids: list[int]
    question: str
