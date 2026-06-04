export type DrugSummary = {
  id: number;
  name: string;
  active_ingredient?: string | null;
  dosage_form?: string | null;
  manufacturer?: string | null;
  url?: string | null;
  confidence: number;
  needs_confirmation: boolean;
};

export type DrugDetail = DrugSummary & {
  registration_no?: string | null;
  packaging?: string | null;
  indication?: string | null;
  dosage?: string | null;
  side_effects?: string | null;
  interactions?: string | null;
  contraindications?: string | null;
  precautions?: string | null;
  storage?: string | null;
};

export type SearchResponse = {
  query: string;
  count: number;
  results: DrugSummary[];
  fallback_message?: string | null;
};

export type TimelineItem = {
  time: string;
  label: string;
  drug_ids: number[];
  instruction: string;
};

export type InteractionAlert = {
  severity: string;
  drug_ids: number[];
  title: string;
  message: string;
};

export type PlanResponse = {
  drugs: DrugDetail[];
  timeline: TimelineItem[];
  interactions: InteractionAlert[];
  safety_note: string;
};

export type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type ChatResponse = {
  answer: string;
  source: string;
  related_drugs: DrugSummary[];
  safety_note: string;
  usage?: Usage;
  time_ms?: number;
};
