import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  HeartPulse,
  Loader2,
  MessageCircle,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { askQuestion, planPrescription, searchDrugs } from "./api";
import type { DrugDetail, DrugSummary, PlanResponse } from "./types";

const quickQueries = ["amlo", "paracetmol", "digoxin", "diltiazem"];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  source?: string;
};

function sourceLabel(source?: string) {
  return source === "openai" || source === "llm"
    ? "Trả lời từ AI, được ràng buộc bởi dữ liệu thuốc"
    : "Đang dùng dữ liệu thuốc an toàn";
}

function shortText(value?: string | null, fallback = "Chưa có tóm tắt rõ trong dữ liệu.") {
  if (!value?.trim()) return fallback;
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

export default function App() {
  const [query, setQuery] = useState("amlo");
  const [results, setResults] = useState<DrugSummary[]>([]);
  const [selected, setSelected] = useState<DrugSummary[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const selectedIds = useMemo(() => selected.map((drug) => drug.id), [selected]);
  const drugNameById = useMemo(() => new Map(selected.map((drug) => [drug.id, drug.name])), [selected]);
  const detailById = useMemo(() => new Map((plan?.drugs ?? []).map((drug) => [drug.id, drug])), [plan]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoadingSearch(true);
      try {
        const data = await searchDrugs(query.trim());
        setResults(data.results);
        setNotice(data.fallback_message ?? null);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Không gọi được API tìm kiếm.");
      } finally {
        setLoadingSearch(false);
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setPlan(null);
      setChatMessages([]);
      return;
    }

    setLoadingPlan(true);
    planPrescription(selectedIds)
      .then(setPlan)
      .catch((error) => setNotice(error instanceof Error ? error.message : "Không tạo được lịch uống thuốc."))
      .finally(() => setLoadingPlan(false));
  }, [selectedIds]);

  function addDrug(drug: DrugSummary) {
    setSelected((current) => {
      if (current.some((item) => item.id === drug.id)) return current;
      return [...current, drug];
    });
  }

  function removeDrug(drugId: number) {
    setSelected((current) => current.filter((drug) => drug.id !== drugId));
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || selectedIds.length === 0) return;

    setLoadingChat(true);
    try {
      const trimmedQuestion = question.trim();
      const questionId = Date.now();
      setChatMessages((current) => [
        ...current,
        { id: questionId, role: "user", text: trimmedQuestion }
      ]);
      setQuestion("");
      const answer = await askQuestion(selectedIds, trimmedQuestion);
      setChatMessages((current) => [
        ...current,
        { id: questionId + 1, role: "assistant", text: answer.answer, source: answer.source }
      ]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không gửi được câu hỏi.");
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] soft-grid">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-[#dbe9df] bg-white/92 px-4 py-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white">
              <HeartPulse className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#12333a] sm:text-2xl">Long Châu Care</h1>
              <p className="text-sm text-[#5c6f68]">
                Tìm thuốc, lập đơn tạm, hỏi AI và xem lịch uống trong một màn hình.
              </p>
            </div>
          </div>
          <div className="rounded-md border border-[#cfe5dc] bg-[#edf8f3] px-3 py-2 text-sm font-medium text-[#0f766e]">
            Dữ liệu thuốc là nguồn chính - AI chỉ diễn giải
          </div>
        </header>

        {notice && (
          <div className="flex items-start gap-3 rounded-lg border border-[#f0d7a1] bg-[#fff8e6] px-4 py-3 text-sm text-[#6d5521]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{notice}</p>
            <button className="rounded-md p-1 hover:bg-black/5" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5">
            <SearchPanel
              query={query}
              results={results}
              loading={loadingSearch}
              onQueryChange={setQuery}
              onAddDrug={addDrug}
            />

            <PrescriptionPanel
              selected={selected}
              detailById={detailById}
              onRemoveDrug={removeDrug}
            />
          </aside>

          <section className="flex flex-col gap-5">
            <ChatPanel
              selectedCount={selected.length}
              question={question}
              messages={chatMessages}
              loading={loadingChat}
              onQuestionChange={setQuestion}
              onAsk={handleAsk}
            />

            <TimelinePanel plan={plan} loading={loadingPlan} drugNameById={drugNameById} />

            <div className="rounded-lg border border-[#cfe5dc] bg-[#edf8f3] p-4 text-sm leading-6 text-[#31534f]">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[#0f766e]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Lưu ý an toàn
              </div>
              {plan?.safety_note || "Thông tin chỉ dùng để giải thích, không thay thế bác sĩ hoặc dược sĩ."}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function SearchPanel({
  query,
  results,
  loading,
  onQueryChange,
  onAddDrug
}: {
  query: string;
  results: DrugSummary[];
  loading: boolean;
  onQueryChange: (value: string) => void;
  onAddDrug: (drug: DrugSummary) => void;
}) {
  return (
    <div className="rounded-lg border border-[#dbe9df] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#17313a]">Tìm thuốc</h2>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-[#0f766e]" aria-hidden="true" />}
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71847d]" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-12 w-full rounded-lg border border-[#cfe0d7] bg-[#fbfdfb] pl-10 pr-3 text-base outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/12"
          placeholder="Nhập tên thuốc hoặc hoạt chất"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {quickQueries.map((item) => (
          <button
            key={item}
            onClick={() => onQueryChange(item)}
            className="rounded-md border border-[#dbe9df] px-3 py-1.5 text-sm text-[#31534f] transition hover:border-[#0f766e] hover:bg-[#edf8f3]"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 flex max-h-[420px] flex-col gap-2 overflow-auto pr-1">
        {results.map((drug) => (
          <button
            key={drug.id}
            onClick={() => onAddDrug(drug)}
            className="group rounded-lg border border-[#dbe9df] bg-white p-3 text-left transition hover:border-[#0f766e] hover:bg-[#f3fbf7]"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5f5ef] text-[#0f766e]">
                <Pill className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-[#17313a]">{drug.name}</p>
                <p className="mt-1 text-xs text-[#667a72]">{drug.active_ingredient || "Chưa rõ hoạt chất"}</p>
                {drug.needs_confirmation && <p className="mt-2 text-xs font-medium text-[#9a6b10]">Cần xác nhận tên/hàm lượng</p>}
              </div>
              <Plus className="mt-1 h-4 w-4 text-[#0f766e] opacity-70 transition group-hover:opacity-100" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PrescriptionPanel({
  selected,
  detailById,
  onRemoveDrug
}: {
  selected: DrugSummary[];
  detailById: Map<number, DrugDetail>;
  onRemoveDrug: (drugId: number) => void;
}) {
  return (
    <div className="rounded-lg border border-[#dbe9df] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#17313a]">Đơn thuốc tạm</h2>
        <span className="rounded-md bg-[#edf8f3] px-2 py-1 text-xs font-semibold text-[#0f766e]">{selected.length} thuốc</span>
      </div>
      {selected.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cfe0d7] p-4 text-sm text-[#667a72]">
          Chọn thuốc từ danh sách bên trên để xem tóm tắt và timeline.
        </div>
      ) : (
        <div className="flex max-h-[520px] flex-col gap-3 overflow-auto pr-1">
          {selected.map((drug) => {
            const detail = detailById.get(drug.id);
            return (
              <div key={drug.id} className="rounded-lg border border-[#dbe9df] bg-[#fbfdfb] p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#17313a]">{drug.name}</p>
                    <p className="mt-1 text-xs text-[#667a72]">{drug.active_ingredient || drug.dosage_form || "Thuốc đã chọn"}</p>
                  </div>
                  <button
                    onClick={() => onRemoveDrug(drug.id)}
                    className="rounded-md p-2 text-[#8b4545] hover:bg-[#fff1f1]"
                    aria-label={`Xóa ${drug.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 rounded-md border border-[#e3eee8] bg-white px-3 py-2 text-xs leading-5 text-[#4f635b]">
                  <span className="font-semibold text-[#0f766e]">Tóm tắt: </span>
                  {shortText(detail?.indication ?? drug.indication)}
                </div>
                {detail?.dosage && (
                  <div className="mt-2 rounded-md border border-[#e3eee8] bg-white px-3 py-2 text-xs leading-5 text-[#4f635b]">
                    <span className="font-semibold text-[#0f766e]">Cách dùng: </span>
                    {shortText(detail.dosage, "Chưa có liều dùng rõ trong dữ liệu.")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  selectedCount,
  question,
  messages,
  loading,
  onQuestionChange,
  onAsk
}: {
  selectedCount: number;
  question: string;
  messages: ChatMessage[];
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onAsk: (event: FormEvent) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div className="overflow-hidden rounded-lg border border-[#cfe0d7] bg-white shadow-soft">
      <div className="border-b border-[#dbe9df] bg-[#f0faf5] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#17313a]">Trợ lý hỏi đáp đơn thuốc</h2>
              <p className="mt-1 text-sm text-[#667a72]">Đặt câu hỏi theo ngôn ngữ tự nhiên, dựa trên các thuốc đã chọn.</p>
            </div>
          </div>
          <span className="w-fit rounded-md border border-[#cfe5dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f766e]">
            {selectedCount > 0 ? `${selectedCount} thuốc trong đơn` : "Chưa chọn thuốc"}
          </span>
        </div>
      </div>

      <div className="flex h-[520px] flex-col bg-[#fbfdfb]">
        <div className="flex-1 overflow-auto p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff3eb] text-[#0f766e]">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="max-w-3xl rounded-lg rounded-tl-sm border border-[#dbe9df] bg-white px-4 py-3 text-sm leading-6 text-[#31534f] shadow-sm">
              Mình có thể giúp bạn hiểu cách dùng thuốc, thời điểm uống, tác dụng phụ cần để ý và tương tác có thể xảy ra.
            </div>
          </div>

          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-3xl rounded-lg rounded-tr-sm bg-[#0f766e] px-4 py-3 text-sm leading-6 text-white shadow-sm">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-white">
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="max-w-3xl rounded-lg rounded-tl-sm border border-[#cfe5dc] bg-white px-4 py-3 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">{sourceLabel(message.source)}</p>
                      <p className="whitespace-pre-line text-sm leading-6 text-[#31534f]">{message.text}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#cfe0d7] bg-white/70 p-5 text-sm leading-6 text-[#667a72]">
              Thêm thuốc vào đơn tạm, rồi hỏi chatbot về cách uống, tương tác hoặc tác dụng phụ.
            </div>
          )}
          {loading && <TypingBubble />}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onAsk} className="border-t border-[#dbe9df] bg-white p-3">
          <div className="flex items-end gap-2 rounded-lg border border-[#cfe0d7] bg-[#fbfdfb] p-2 focus-within:border-[#0f766e] focus-within:ring-4 focus-within:ring-[#0f766e]/12">
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 outline-none"
          placeholder="Nhập câu hỏi về đơn thuốc..."
        />
            <button
              disabled={loading || !question.trim() || selectedCount === 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white transition hover:bg-[#0d665f] disabled:cursor-not-allowed disabled:bg-[#9fbab2]"
              aria-label="Gửi câu hỏi"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-2 px-1 text-xs leading-5 text-[#667a72]">
            AI chỉ diễn giải từ dữ liệu thuốc. Khi không chắc, hãy hỏi dược sĩ/bác sĩ.
          </p>
        </form>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="mt-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-white">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="rounded-lg rounded-tl-sm border border-[#cfe5dc] bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">AI đang trả lời</div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e] [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e] [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}

function TimelinePanel({
  plan,
  loading,
  drugNameById
}: {
  plan: PlanResponse | null;
  loading: boolean;
  drugNameById: Map<number, string>;
}) {
  return (
    <div className="rounded-lg border border-[#dbe9df] bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#17313a]">Timeline uống thuốc</h2>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-[#0f766e]" aria-hidden="true" />}
      </div>
      {plan ? (
        <div className="grid gap-3 md:grid-cols-3">
          {plan.timeline.map((item) => (
            <div key={item.time} className="rounded-lg border border-[#dbe9df] bg-[#fbfdfb] p-4">
              <p className="text-sm font-semibold text-[#0f766e]">{item.time}</p>
              <h3 className="mt-1 text-base font-semibold text-[#17313a]">{item.label}</h3>
              <div className="mt-3 space-y-2">
                {item.drug_ids.length ? (
                  item.drug_ids.map((id) => (
                    <div key={id} className="rounded-md bg-white px-3 py-2 text-sm text-[#31534f] shadow-sm">
                      {drugNameById.get(id) ?? id}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8a9a94]">Không có thuốc</p>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#667a72]">{item.instruction}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="Timeline sẽ tự cập nhật khi bạn chọn thuốc vào đơn." />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cfe0d7] bg-[#fbfdfb] p-5 text-sm leading-6 text-[#667a72]">
      {text}
    </div>
  );
}
