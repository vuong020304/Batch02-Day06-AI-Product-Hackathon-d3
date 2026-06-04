import type { ChatResponse, DrugDetail, PlanResponse, SearchResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const SAFETY_NOTE =
  "Thông tin chỉ dùng để giải thích đơn giản, không thay thế bác sĩ hoặc dược sĩ. Hãy hỏi dược sĩ/bác sĩ khi không chắc.";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function searchDrugs(query: string): Promise<SearchResponse> {
  return request<BackendSearchResponse>(`/api/search?q=${encodeURIComponent(query)}&limit=8`).then((data) => ({
    query: data.query,
    count: data.count,
    fallback_message: data.fallback_message,
    results: data.results.map(toDrugSummary)
  }));
}

export function getDrug(drugId: number): Promise<DrugDetail> {
  return request<BackendSummaryResponse>("/api/summary", {
    method: "POST",
    body: JSON.stringify({ drug_ids: [drugId] })
  }).then((data) => toDrugDetail(data.drugs[0]));
}

export async function planPrescription(drugIds: number[]): Promise<PlanResponse> {
  const [summary, chat] = await Promise.all([
    request<BackendSummaryResponse>("/api/summary", {
      method: "POST",
      body: JSON.stringify({ drug_ids: drugIds })
    }),
    request<BackendChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        drug_ids: drugIds,
        question: "Hãy kiểm tra tương tác và đề xuất lịch uống thuốc trong ngày."
      })
    })
  ]);

  const drugs = summary.drugs.map(toDrugDetail);
  return {
    drugs,
    timeline: buildTimeline(drugs),
    interactions: buildInteractionAlerts(chat.answer, drugIds),
    safety_note: SAFETY_NOTE
  };
}

export function askQuestion(drugIds: number[], question: string): Promise<ChatResponse> {
  return request<BackendChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ drug_ids: drugIds, question })
  }).then((data) => ({
    answer: data.answer.cau_tra_loi || data.answer.phan_tich || "Chưa có câu trả lời.",
    source: data.source,
    related_drugs: [],
    safety_note: SAFETY_NOTE
  }));
}

type BackendSearchDrug = {
  id: number;
  ten_thuoc: string;
  hoat_chat: string;
  dang_bao_che: string;
  chi_dinh_tom_tat?: string;
  score: number;
};

type BackendSearchResponse = {
  query: string;
  count: number;
  results: BackendSearchDrug[];
  fallback_message?: string | null;
};

type BackendSummaryDrug = {
  id: number;
  ten_thuoc: string;
  hoat_chat: string;
  dang_bao_che: string;
  chi_dinh?: string;
  lieu_dung?: string;
  tac_dung_phu?: string[];
  chong_chi_dinh?: string;
  tuong_tac?: string;
  than_trong?: string;
};

type BackendSummaryResponse = {
  drugs: BackendSummaryDrug[];
};

type BackendChatAnswer = {
  tieu_de?: string;
  phan_tich?: string;
  tuong_tac?: Array<{
    thuoc_1?: string;
    thuoc_2?: string;
    muc_do?: string;
    noi_dung?: string;
  }>;
  lich_uong?: string;
  canh_bao?: string[];
  cau_tra_loi?: string;
};

type BackendChatResponse = {
  answer: BackendChatAnswer;
  source: string;
  related_drug_ids: number[];
};

function toDrugSummary(drug: BackendSearchDrug): DrugDetail {
  return {
    id: drug.id,
    name: drug.ten_thuoc,
    active_ingredient: drug.hoat_chat,
    dosage_form: drug.dang_bao_che,
    confidence: drug.score,
    needs_confirmation: drug.score < 0.8,
    indication: drug.chi_dinh_tom_tat
  };
}

function toDrugDetail(drug?: BackendSummaryDrug): DrugDetail {
  if (!drug) {
    throw new Error("Không tìm thấy thuốc trong phản hồi backend.");
  }

  return {
    id: drug.id,
    name: drug.ten_thuoc,
    active_ingredient: drug.hoat_chat,
    dosage_form: drug.dang_bao_che,
    confidence: 1,
    needs_confirmation: false,
    indication: drug.chi_dinh,
    dosage: drug.lieu_dung,
    side_effects: drug.tac_dung_phu?.join(", "),
    contraindications: drug.chong_chi_dinh,
    interactions: drug.tuong_tac,
    precautions: drug.than_trong
  };
}

function buildTimeline(drugs: DrugDetail[]) {
  const morning = drugs.map((drug) => drug.id);
  const noon = drugs.filter((drug) => /3 lan|moi 8|3 lần|mỗi 8/i.test(drug.dosage || "")).map((drug) => drug.id);
  const evening = drugs
    .filter((drug) => /2 lan|3 lan|toi|moi 12|2 lần|3 lần|tối|mỗi 12/i.test(drug.dosage || ""))
    .map((drug) => drug.id);

  return [
    { time: "07:00", label: "Sáng", drug_ids: morning, instruction: "Uống theo đúng đơn; hỏi dược sĩ nếu dữ liệu chưa ghi rõ trước/sau ăn." },
    { time: "12:00", label: "Trưa", drug_ids: noon, instruction: "Chỉ áp dụng cho thuốc có dấu hiệu dùng nhiều lần trong ngày." },
    { time: "20:00", label: "Tối", drug_ids: evening, instruction: "Kiểm tra lại nếu thuốc gây buồn ngủ, chóng mặt hoặc hạ huyết áp." }
  ];
}

function buildInteractionAlerts(answer: BackendChatAnswer, drugIds: number[]) {
  const interactions = answer.tuong_tac || [];
  if (interactions.length === 0) {
    return [
      {
        severity: "info",
        drug_ids: drugIds,
        title: "Chưa thấy tương tác rõ",
        message: "Backend/AI chưa ghi nhận tương tác cụ thể. Vẫn nên xác nhận với dược sĩ khi dùng nhiều thuốc."
      }
    ];
  }

  return interactions.map((item) => ({
    severity: item.muc_do || "trung bình",
    drug_ids: drugIds,
    title: `${item.thuoc_1 || "Thuốc 1"} + ${item.thuoc_2 || "Thuốc 2"}`,
    message: item.noi_dung || "Có thông tin cần lưu ý về tương tác thuốc."
  }));
}
