import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askQuestion, askQuestionStream, planPrescription, searchDrugs } from "./api";
import type { DrugDetail, DrugSummary, PlanResponse, Usage } from "./types";

const quickQueries = ["amlo", "paracetmol", "digoxin", "diltiazem"];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  source?: string;
  usage?: Usage | null;
  time_ms?: number;
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugSummary[]>([]);
  const [selected, setSelected] = useState<DrugSummary[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatElapsedMs, setChatElapsedMs] = useState(0);

  const selectedIds = useMemo(() => selected.map((drug) => drug.id), [selected]);
  const drugNameById = useMemo(() => new Map(selected.map((drug) => [drug.id, drug.name])), [selected]);
  const detailById = useMemo(() => new Map((plan?.drugs ?? []).map((drug) => [drug.id, drug])), [plan]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setNotice(null);
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    setLoadingSearch(true);

    searchDrugs(trimmedQuery, controller.signal)
      .then((data) => {
        setResults(data.results);
        setNotice(data.fallback_message ?? null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotice(error instanceof Error ? error.message : "Không gọi được API tìm kiếm.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSearch(false);
      });

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!loadingChat) return;

    const startedAt = Date.now();
    setChatElapsedMs(0);
    const timer = window.setInterval(() => {
      setChatElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(timer);
  }, [loadingChat]);

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
    setQuery("");
    setResults([]);
    setNotice(null);
  }

  function removeDrug(drugId: number) {
    setSelected((current) => current.filter((drug) => drug.id !== drugId));
  }

  function clearPrescription() {
    if (!selected.length) return;
    const confirmed = window.confirm("Xóa tất cả thuốc khỏi đơn tạm?");
    if (!confirmed) return;
    setSelected([]);
    setPlan(null);
    setChatMessages([]);
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || selectedIds.length === 0) return;

    const trimmedQuestion = question.trim();
    const questionId = Date.now();
    const assistantId = questionId + 1;
    const startedAt = Date.now();
    setChatMessages((current) => [
      ...current,
      { id: questionId, role: "user", text: trimmedQuestion },
      { id: assistantId, role: "assistant", text: "Đang nhận phản hồi...", time_ms: 0 }
    ]);
    setQuestion("");
    setLoadingChat(true);

    let accumulatedText = "";

    askQuestionStream(selectedIds, trimmedQuestion, {
      onToken(token: string) {
        accumulatedText += token;
        const elapsed = Date.now() - startedAt;
        setChatMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, text: accumulatedText, time_ms: elapsed } : m))
        );
      },
      onDone(usage: Usage | null, timeMs: number) {
        const finalTime = timeMs || Date.now() - startedAt;
        const finalText = accumulatedText.trim() || "Không có phản hồi từ AI.";
        setChatMessages((current) =>
          current.map((m) =>
            m.id === assistantId ? { ...m, text: finalText, usage, time_ms: finalTime } : m
          )
        );
        setLoadingChat(false);
      },
      onError(error: string) {
        setChatMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, text: `Lỗi AI: ${error}` } : m))
        );
        setNotice(error);
        setLoadingChat(false);
      },
    });
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] soft-grid">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 lg:px-6">
        <header className="flex flex-col gap-3 rounded-lg border border-[#dbe9df] bg-white/92 px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#12333a] sm:text-2xl">Long Châu Care</h1>
              <p className="text-[15px] text-[#5c6f68]">
                Tìm thuốc, lập đơn tạm, hỏi AI và xem lịch uống trong một màn hình.
              </p>
            </div>
          </div>
          <div className="rounded-md border border-[#cfe5dc] bg-[#edf8f3] px-3 py-2 text-[15px] font-medium text-[#0f766e]">
            Dữ liệu thuốc là nguồn chính - AI chỉ diễn giải
          </div>
        </header>

        {notice && (
          <div className="flex items-start gap-3 rounded-lg border border-[#f0d7a1] bg-[#fff8e6] px-4 py-3 text-[15px] text-[#6d5521]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{notice}</p>
            <button className="rounded-md p-1 hover:bg-black/5" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
          <aside className="min-w-0">
            <SearchPanel
              query={query}
              results={results}
              selected={selected}
              detailById={detailById}
              loading={loadingSearch}
              onQueryChange={setQuery}
              onAddDrug={addDrug}
              onRemoveDrug={removeDrug}
              onClearPrescription={clearPrescription}
            />
          </aside>

          <section className="min-w-0">
            <ChatPanel
              selectedCount={selected.length}
              question={question}
              messages={chatMessages}
              loading={loadingChat}
              elapsedMs={chatElapsedMs}
              onQuestionChange={setQuestion}
              onAsk={handleAsk}
            />
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <TimelinePanel plan={plan} loading={loadingPlan} drugNameById={drugNameById} />
            <InteractionPanel selectedCount={selected.length} />

            <div className="rounded-lg border border-[#cfe5dc] bg-[#edf8f3] p-4 text-[15px] leading-6 text-[#31534f]">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[#0f766e]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Lưu ý an toàn
              </div>
              {plan?.safety_note || "Thông tin chỉ dùng để giải thích, không thay thế bác sĩ hoặc dược sĩ."}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SearchPanel({
  query,
  results,
  selected,
  detailById,
  loading,
  onQueryChange,
  onAddDrug,
  onRemoveDrug,
  onClearPrescription
}: {
  query: string;
  results: DrugSummary[];
  selected: DrugSummary[];
  detailById: Map<number, DrugDetail>;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onAddDrug: (drug: DrugSummary) => void;
  onRemoveDrug: (drugId: number) => void;
  onClearPrescription: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#dbe9df] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#17313a]">Chọn thuốc</h2>
        <span className="rounded-md bg-[#edf8f3] px-2 py-1 text-[13px] font-semibold text-[#0f766e]">{selected.length} thuốc</span>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71847d]" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-12 w-full rounded-lg border border-[#cfe0d7] bg-[#fbfdfb] pl-10 pr-10 text-base outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/12"
          placeholder="Nhập tên thuốc hoặc hoạt chất, ví dụ: amlo, paracetamol..."
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[#0f766e]" aria-hidden="true" />}
      </label>

      {!query.trim() && selected.length === 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-[#cfe0d7] bg-[#fbfdfb] p-4 text-[15px] leading-6 text-[#667a72]">
          Gõ để tìm thuốc, chọn xong có thể nhập thuốc tiếp theo.
        </div>
      )}

      {query.trim() && (
        <div className="mt-4 flex max-h-[300px] flex-col gap-2 overflow-auto pr-1">
          {results.length > 0 ? (
            results.map((drug) => (
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
                    <p className="line-clamp-2 text-[15px] font-semibold text-[#17313a]">{drug.name}</p>
                    <p className="mt-1 text-[13px] text-[#667a72]">{drug.active_ingredient || "Chưa rõ hoạt chất"}</p>
                    {drug.needs_confirmation && (
                      <p className="mt-2 rounded-md bg-[#fff8e6] px-2 py-1 text-[13px] font-semibold text-[#9a6b10]">
                        Cần xác nhận tên/hàm lượng
                      </p>
                    )}
                  </div>
                  <Plus className="mt-1 h-4 w-4 text-[#0f766e] opacity-70 transition group-hover:opacity-100" aria-hidden="true" />
                </div>
              </button>
            ))
          ) : (
            !loading && (
              <div className="rounded-lg border border-dashed border-[#cfe0d7] bg-[#fbfdfb] p-4 text-[15px] text-[#667a72]">
                Không thấy thuốc phù hợp. Thử nhập tên hoạt chất hoặc tên biệt dược khác.
              </div>
            )
          )}
        </div>
      )}

      <div className="mt-5 border-t border-[#e3eee8] pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-[#17313a]">Thuốc đã chọn</h3>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClearPrescription}
              className="rounded-md border border-[#f0d7d7] px-2 py-1 text-[13px] font-medium text-[#8b4545] transition hover:bg-[#fff1f1]"
            >
              Xóa đơn
            </button>
          )}
        </div>
        {selected.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#cfe0d7] p-4 text-[15px] text-[#667a72]">
            Chưa có thuốc nào trong đơn tạm.
          </div>
        ) : (
          <div className="flex max-h-[420px] flex-col gap-3 overflow-auto pr-1">
            {selected.map((drug) => {
              const detail = detailById.get(drug.id);
              return (
                <div key={drug.id} className="rounded-lg border border-[#dbe9df] bg-[#fbfdfb] p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] font-semibold text-[#17313a]">{drug.name}</p>
                      <p className="mt-1 text-[13px] text-[#667a72]">{drug.active_ingredient || drug.dosage_form || "Thuốc đã chọn"}</p>
                      {drug.needs_confirmation && (
                        <p className="mt-2 w-fit rounded-md bg-[#fff8e6] px-2 py-1 text-[13px] font-semibold text-[#9a6b10]">
                          Cần xác nhận
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveDrug(drug.id)}
                      className="rounded-md p-2 text-[#8b4545] hover:bg-[#fff1f1]"
                      aria-label={`Xóa ${drug.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 rounded-md border border-[#e3eee8] bg-white px-3 py-2 text-[13px] leading-5 text-[#4f635b]">
                    <span className="font-semibold text-[#0f766e]">Tóm tắt: </span>
                    {shortText(detail?.indication ?? drug.indication)}
                  </div>
                  {detail?.dosage && (
                    <div className="mt-2 rounded-md border border-[#e3eee8] bg-white px-3 py-2 text-[13px] leading-5 text-[#4f635b]">
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
        <span className="rounded-md bg-[#edf8f3] px-2 py-1 text-[13px] font-semibold text-[#0f766e]">{selected.length} thuốc</span>
      </div>
      {selected.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cfe0d7] p-4 text-[15px] text-[#667a72]">
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
                    <p className="line-clamp-2 text-[15px] font-semibold text-[#17313a]">{drug.name}</p>
                    <p className="mt-1 text-[13px] text-[#667a72]">{drug.active_ingredient || drug.dosage_form || "Thuốc đã chọn"}</p>
                  </div>
                  <button
                    onClick={() => onRemoveDrug(drug.id)}
                    className="rounded-md p-2 text-[#8b4545] hover:bg-[#fff1f1]"
                    aria-label={`Xóa ${drug.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 rounded-md border border-[#e3eee8] bg-white px-3 py-2 text-[13px] leading-5 text-[#4f635b]">
                  <span className="font-semibold text-[#0f766e]">Tóm tắt: </span>
                  {shortText(detail?.indication ?? drug.indication)}
                </div>
                {detail?.dosage && (
                  <div className="mt-2 rounded-md border border-[#e3eee8] bg-white px-3 py-2 text-[13px] leading-5 text-[#4f635b]">
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
  elapsedMs,
  onQuestionChange,
  onAsk
}: {
  selectedCount: number;
  question: string;
  messages: ChatMessage[];
  loading: boolean;
  elapsedMs: number;
  onQuestionChange: (value: string) => void;
  onAsk: (event: FormEvent) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const disabled = selectedCount === 0;
  const suggestions = ["Thuốc này dùng để làm gì?", "Có tác dụng phụ nào cần chú ý?", "Các thuốc này có tương tác không?"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div className="overflow-hidden rounded-lg border border-[#cfe0d7] bg-white shadow-soft">
      <div className="border-b border-[#dbe9df] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[#17313a]">Hỏi AI về đơn thuốc</h2>
            </div>
            <p className="mt-1 text-[15px] text-[#667a72]">AI chỉ trả lời khi bạn đặt câu hỏi, dựa trên thuốc đã chọn.</p>
          </div>
          <span className={`w-fit rounded-md px-3 py-1.5 text-[13px] font-semibold ${disabled ? "bg-[#f2f5f3] text-[#71847d]" : "bg-[#edf8f3] text-[#0f766e]"}`}>
            {disabled ? "Chọn thuốc trước" : `${selectedCount} thuốc đã chọn`}
          </span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-178px)] min-h-[560px] flex-col bg-[#fbfdfb]">
        <div className="flex-1 overflow-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#cfe0d7] bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dff3eb] text-[#0f766e]">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#17313a]">Bạn có thể hỏi gì?</p>
                  <p className="mt-1 text-[15px] leading-6 text-[#667a72]">
                    Hỏi về công dụng, cách dùng, tác dụng phụ hoặc tương tác của các thuốc trong đơn tạm.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => onQuestionChange(item)}
                    className="rounded-full border border-[#dbe9df] bg-[#fbfdfb] px-3 py-1.5 text-[15px] text-[#31534f] transition hover:border-[#0f766e] hover:bg-[#edf8f3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#0f766e] px-4 py-3 text-[15px] leading-6 text-white shadow-sm">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dff3eb] text-[#0f766e]">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-[#cfe5dc] bg-white px-4 py-3 shadow-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#667a72]">
                        <span className="rounded-full bg-[#edf8f3] px-2 py-0.5 text-[#0f766e]">{sourceLabel(message.source)}</span>
                        {message.usage && <span className="rounded-full bg-[#e8f4ff] px-2 py-0.5 text-[#0369a1]">{message.usage.total_tokens} tokens</span>}
                      </div>
                      <div className="prose max-w-none [font-size:15px] leading-6 text-[#31534f] prose-headings:text-[#17313a] prose-headings:font-semibold prose-strong:text-[#17313a] prose-ul:pl-4 prose-li:text-[#31534f]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                      </div>
                      {(message.time_ms != null || (loading && index === messages.length - 1)) && (
                        <div className="mt-2 text-right text-[11px] font-medium text-[#8a9a94]">
                          {loading && index === messages.length - 1
                            ? `${(elapsedMs / 1000).toFixed(1)}s`
                            : message.time_ms! < 1000
                              ? `${message.time_ms}ms`
                              : `${(message.time_ms! / 1000).toFixed(1)}s`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
          {loading && messages[messages.length - 1]?.role !== "assistant" && <TypingBubble elapsedMs={elapsedMs} />}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onAsk} className="border-t border-[#dbe9df] bg-white p-4">
          <div className="flex items-end gap-2 rounded-xl border border-[#cfe0d7] bg-[#fbfdfb] p-2 focus-within:border-[#0f766e] focus-within:ring-4 focus-within:ring-[#0f766e]/12">
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
              className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[15px] leading-6 outline-none"
              placeholder={disabled ? "Chọn thuốc trước khi hỏi AI" : "Hỏi về cách dùng, tác dụng phụ, tương tác..."}
              disabled={disabled}
            />
            <button
              disabled={loading || !question.trim() || disabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f766e] text-white transition hover:bg-[#0d665f] disabled:cursor-not-allowed disabled:bg-[#9fbab2]"
              aria-label="Gửi câu hỏi"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] leading-5 text-[#667a72]">
            <span>AI chỉ hỗ trợ giải thích, không thay thế tư vấn y tế.</span>
            {loading && (
              <span className="rounded-full bg-[#edf8f3] px-2 py-0.5 font-medium text-[#0f766e]">
                Đang chạy {(elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function TypingBubble({ elapsedMs }: { elapsedMs: number }) {
  return (
    <div className="mt-4 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dff3eb] text-[#0f766e]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-[#cfe5dc] bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[#0f766e]">
          <span>AI đang trả lời</span>
          <span className="rounded-full bg-[#edf8f3] px-2 py-0.5">{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e] [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f766e] [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}

function InteractionPanel({ selectedCount }: { selectedCount: number }) {
  const hasMultipleDrugs = selectedCount >= 2;

  return (
    <div className={`rounded-lg border p-4 text-[15px] leading-6 shadow-soft ${hasMultipleDrugs ? "border-[#f0d7a1] bg-[#fff8e6] text-[#6d5521]" : "border-[#dbe9df] bg-white text-[#667a72]"}`}>
      <div className={`mb-2 flex items-center gap-2 font-semibold ${hasMultipleDrugs ? "text-[#9a6b10]" : "text-[#0f766e]"}`}>
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        Tương tác thuốc
      </div>
      {hasMultipleDrugs ? (
        <p>Có nhiều thuốc trong đơn. Hãy hỏi AI hoặc dược sĩ để xác nhận tương tác trước khi dùng.</p>
      ) : (
        <p>Chọn từ 2 thuốc để kiểm tra tương tác trong đơn tạm.</p>
      )}
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
    <div className="rounded-lg border border-[#dbe9df] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#17313a]">Timeline tham khảo</h2>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[#0f766e]" aria-hidden="true" />}
      </div>
      {plan ? (
        <div className="grid gap-2">
          {plan.timeline.map((item) => (
            <div key={item.time} className="rounded-lg border border-[#dbe9df] bg-[#fbfdfb] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-[#0f766e]">{item.time}</p>
                <h3 className="text-[15px] font-semibold text-[#17313a]">{item.label}</h3>
              </div>
              <div className="mt-2 space-y-1.5">
                {item.drug_ids.length ? (
                  item.drug_ids.map((id) => (
                    <div key={id} className="rounded-md bg-white px-2.5 py-1.5 text-[13px] text-[#31534f] shadow-sm">
                      {drugNameById.get(id) ?? id}
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-[#8a9a94]">Không có thuốc</p>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#667a72]">{item.instruction}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="Chọn thuốc để xem timeline." />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cfe0d7] bg-[#fbfdfb] p-5 text-[15px] leading-6 text-[#667a72]">
      {text}
    </div>
  );
}
