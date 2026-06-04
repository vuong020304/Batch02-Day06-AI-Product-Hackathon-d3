# Hackathon Plan: AI Giải thích đơn thuốc — Long Châu

> **Track:** E - Healthcare
> **Target Product:** Nhà thuốc Long Châu
> **Build Slice:** Giải thích đơn thuốc bằng AI (search → giải thích → timeline → tương tác)

---

# PHASE 1: EVIDENCE + THIN SPEC (Tối DAY05)

---

## 1. User

**Bệnh nhân mua thuốc tại nhà thuốc, nhận đơn thuốc nhưng KHÔNG HIỂU thuốc.**

|                     | Chi tiết                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ai**              | Bệnh nhân (đặc biệt: người lớn tuổi, phụ nữ mua thuốc cho con)                                                                                  |
| **Ở đâu**           | Nhà thuốc Long Châu (offline), sau khi khám bác sĩ                                                                                              |
| **Khi nào**         | Ngay sau khi nhận đơn thuốc — lúc đang đứng ở nhà thuốc hoặc về nhà                                                                             |
| **Hiện tại làm gì** | Google tên thuốc → đọc thông tin y khoa khó hiểu; hoặc chấp nhận không hiểu, uống theo hướng dẫn của dược sĩ (nếu dược sĩ có tiempo giải thích) |
|                     |                                                                                                                                                 |

---

## 2. Pain

### Pain chính
> **Bệnh nhân nhận đơn thuốc nhưng không hiểu tên thuốc, cách uống, tác dụng phụ.**
> Thông tin thuốc trên web quá kỹ thuật. Nhân viên nhà thuốc không đủ thời gian giải thích từng người.

### Pain hỗ trợ (cùng flow)
| # | Pain | Mức độ |
|---|------|--------|
| P1 | Không biết thuốc dùng để làm gì | 🔴 Cao |
| P2 | Không biết uống lúc nào, trước/sau ăn | 🔴 Cao |
| P3 | Không biết tác dụng phụ cần cảnh giác | 🟡 Trung bình |
| P4 | Không biết tương tác giữa các thuốc trong đơn | 🔴 Cao |
| P5 | Không biết lịch uống thuốc trong ngày khi có nhiều thuốc | 🟡 Trung bình |

---

## 3. Build Slice

### Scope: 4 features, KHÔNG OCR

```
User gõ tên thuốc
        │
        ▼
┌─────────────────────────┐
│ F1: Search + Fuzzy Match│  ← autocomplete, xử lý nhập sai
└──────────┬──────────────┘
           │ User chọn thuốc
           ▼
┌─────────────────────────┐
│ F2: Giải thích thuốc    │  ← LLM giải thích từ DB data
└──────────┬──────────────┘
           │ Tất cả thuốc đã chọn
           ▼
┌─────────────────────────┐
│ F3: Timeline + Tương tác│  ← lịch uống + cảnh báo interactions
└──────────┬──────────────┘
           │ User hỏi thêm
           ▼
┌─────────────────────────┐
│ F4: Chat follow-up      │  ← hỏi chi tiết 1 thuốc
└─────────────────────────┘
```

### Input
- User gõ tên thuốc → **autocomplete gợi ý real-time**
- Fuzzy matching xử lý nhập sai: "amlodipen" → "Amlodipine"
- Chọn nhiều thuốc → tạo "đơn thuốc" tạm

### Output
- Giải thích từng thuốc bằng ngôn ngữ đơn giản (công dụng, cách uống, tác dụng phụ)
- Timeline uống thuốc trong ngày (sáng/trưa/tối)
- Cảnh báo tương tác thuốc
- Chat hỏi thêm

### Technology
| Component | Stack |
|-----------|-------|
| Search | PostgreSQL + pg_trgm (fuzzy match) |
| AI | GPT-4o-mini / Claude Haiku (RAG với Drug DB) |
| API | FastAPI |
| Frontend | React Native / HTML demo |

### Out of Scope
- OCR scan đơn thuốc
- Đặt thuốc online
- Nhắc uống thuốc (push notification)
- Voice input/output

---

## 4. User Stories — 5 Paths + Feedback

### Tổng quan 5 Paths

| Path | Khi nào | Mục đích |
|------|---------|----------|
| **✅ Happy** | Everything works perfectly | Show full flow |
| **⚠️ Low Confidence** | AI / system không chắc chắn | Hỏi lại user hoặc redirect |
| **❌ Failure** | System lỗi hoặc không có data | Fallback an toàn |
| **✏️ Correction** | User muốn sửa sau khi xem kết quả | Cho phép sửa + confirm |
| **💬 Feedback** | User đánh giá kết quả | Thu thập feedback + cải thiện |

---

### PATH 1: ✅ Happy Path — "Mọi thứ đều đúng"

**User Story:**
> **Lan (35 tuổi)** gõ "amlo", thấy gợi ý Amlodipine 5mg, chọn nó. Nhấn giải thích. Nhận tóm tắt rõ ràng. Bấm xem chi tiết. Thấy timeline uống thuốc. Xem cảnh báo tương tác. Hỏi thêm 1 câu. Xong.

```
[Search] → [Chọn thuốc] → [Giải thích] → [Timeline] → [Chi tiết] → [Chat] → [Done]
    ✅          ✅              ✅             ✅            ✅           ✅
```

**Test cases:**
| # | Input | Expected |
|---|-------|----------|
| H1 | Gõ "amlo" → chọn Amlodipine 5mg | Autocomplete gợi ý đúng |
| H2 | Chọn 3 thuốc → "Giải thích" | Summary cards + timeline + interactions |
| H3 | Bấm "Xem chi tiết" trên Metformin | Expand chi tiết Metformin |
| H4 | Hỏi "uống với canxi được không?" | LLM trả lời: cách nhau 2h |

---

### PATH 2: ⚠️ Low Confidence — "AI không chắc → Hỏi lại"

**User Story:**
> **Anh Nam (28 tuổi)** gõ "paracetmol". Fuzzy match tìm thấy Paracetamol nhưng confidence thấp (levenshtein = 2). AI hiển thị gợi ý kèm câu hỏi xác nhận. Anh chọn đúng. Sau đó, anh chọn Atorvastatin 20mg — nhưng AI thấy anh cũng chọn Metformin, và interaction có severity "moderate" → AI highlight cảnh báo rõ ràng hơn.

#### LC1: Fuzzy match confidence thấp
```
User gõ: "paracetmol"
        │
        ▼ Confidence = 0.65 (< threshold 0.8)
┌──────────────────────────────────────────────┐
│  🔍 "Không chắc bạn tìm thuốc nào:          │
│                                                  │
│  💊 Paracetamol 500mg  — Giảm đau, hạ sốt  ✨ │
│  💊 Paracetamol 650mg  — Giảm đau, hạ sốt      │
│  💊 Paracetamol + Codein — Giảm đau mạnh        │
│                                                  │
│  ❓ Không thấy đúng?                             │
│  [🔍 Nhập lại] [📋 Danh sách A-Z]"             │
└──────────────────────────────────────────────┘
```
**Xử lý:** Luôn hiển thị gợi ý + alternative. Không auto-select.

#### LC2: Thuốc có nhiều hàm lượng — hỏi xác nhận
```
User chọn Paracetamol nhưng KHÔNG ghi rõ hàm lượng
        │
        ▼
┌──────────────────────────────────────────────┐
│  ⚠️ "Paracetamol có nhiều hàm lượng:          │
│                                                  │
│  Bạn muốn xem:                                  │
│  [500mg — liều thường cho người lớn]           │
│  [650mg — liều mạnh]                            │
│  [Không sure — xem tất cả]"                     │
└──────────────────────────────────────────────┘
```
**Xử lý:** Hỏi user chọn hàm lượng cụ thể

#### LC3: AI không chắc về interaction
```
2 thuốc có interaction data nhưng severity không rõ ràng
        │
        ▼
┌──────────────────────────────────────────────┐
│  🟡 "Có thể có tương tác giữa 2 thuốc này.   │
│     Dữ liệu hiện tại không đủ để khẳng định.│
│     📞 Hỏi dược sĩ để được tư vấn chính xác." │
└──────────────────────────────────────────────┘
```
**Xử lý:** Hiển thị warning + redirect dược sĩ

---

### PATH 3: ❌ Failure — "System lỗi → Fallback an toàn"

**User Story:**
> **Bác Hường (62 tuổi)** gõ "thuốc huyết áp". Fuzzy match không ra kết quả cụ thể. Hệ thống fallback sang danh sách theo nhóm. Bác chọn từ danh sách. Sau đó, LLM timeout — hệ thống hiển thị data từ DB trước, LLM trả lời sau.

#### F1: Không tìm thấy thuốc
```
User gõ: "thuốc hạ huyết áp"
        │
        ▼ Fuzzy match không có kết quả
┌──────────────────────────────────────────────┐
│  ❌ "Không tìm thấy thuốc cụ thể.            │
│                                                  │
│  Bạn có thể tìm theo:                           │
│  [🔍 Tên thuốc cụ thể]                          │
│  [📋 Nhóm: Hạ huyết áp]                        │
│  [📋 Danh sách A-Z]"                            │
└──────────────────────────────────────────────┘
```

#### F2: Fuzzy match sai → user chọn nhầm
```
User chọn nhầm hàm lượng / nhầm thuốc
        │
        ▼
┌──────────────────────────────────────────────┐
│  ⚠️ "Bạn chọn Amlodipine 10mg.              │
│     Đây là liều CAO. Thường dùng 5mg khi mới│
│     bắt đầu. Bạn chắc chắn chưa?"            │
│     [Đúng rồi] [Sửa lại]                      │
└──────────────────────────────────────────────┘
```

#### F3: LLM hallucinate / trả lời sai
```
LLM tạo thông tin không có trong DB
        │
        ▼ Safety layer check
┌──────────────────────────────────────────────┐
│  → Chỉ hiển thị data từ Drug DB              │
│  → Nếu LLM nói超出 DB → replace bằng:        │
│    "Thông tin này chưa được xác nhận.         │
│     Hỏi dược sĩ để biết thêm."                │
└──────────────────────────────────────────────┘
```

#### F4: Không có dữ liệu tương tác
```
2 thuốc không có trong interaction DB
        │
        ▼
┌──────────────────────────────────────────────┐
│  "Không tìm thấy cảnh báo tương tác giữa     │
│   2 thuốc này. Để chắc chắn, hỏi dược sĩ."   │
└──────────────────────────────────────────────┘
```

#### F5: LLM timeout / error
```
Response > 5 giây hoặc LLM error
        │
        ▼
┌──────────────────────────────────────────────┐
│  Hiển thị data từ DB trước (không cần LLM):  │
│  - Tên thuốc, công dụng, liều dùng           │
│  - "Đang tải thêm giải thích..."             │
│  → Khi LLM trả lời → update UI dần          │
└──────────────────────────────────────────────┘
```

---

### PATH 4: ✏️ Correction — "User muốn sửa"

**User Story:**
> **Chị Lan** xem giải thích đơn thuốc 3 thuốc. Chị nhận ra chọn nhầm Amlodipine 10mg (phải là 5mg). Chị muốn sửa. Sau đó, chị muốn thêm 1 thuốc nữa vào đơn. Hoặc xóa 1 thuốc.

#### C1: Sửa thuốc đã chọn
```
User bấm [✏️ Sửa] trên Amlodipine 10mg
        │
        ▼
┌──────────────────────────────────────────────┐
│  ✏️ Sửa thuốc                                 │
│                                                  │
│  Amlodipine                                     │
│  Hàm lượng: [10mg ▼] → Chọn 5mg               │
│                                                  │
│  [💾 Lưu] [❌ Hủy]                              │
└──────────────────────────────────────────────┘
        │ User chọn 5mg → Lưu
        ▼
┌──────────────────────────────────────────────┐
│  ✅ "Đã cập nhật: Amlodipine 5mg              │
│     Đang cập nhật lại giải thích..."          │
│                                                  │
│  → Timeline + interactions tự động update      │
└──────────────────────────────────────────────┘
```

#### C2: Thêm thuốc vào đơn
```
User bấm [+ Thêm thuốc] ở cuối danh sách
        │
        ▼
┌──────────────────────────────────────────────┐
│  ➕ Thêm thuốc mới                             │
│                                                  │
│  🔍 Gõ tên thuốc...                             │
│  [từ bước search quen thuộc]                    │
└──────────────────────────────────────────────┘
        │ Thêm xong
        ▼
┌──────────────────────────────────────────────┐
│  ✅ "Đã thêm Losartan 50mg.                   │
│     [🔄 Cập nhật lại giải thích]"             │
└──────────────────────────────────────────────┘
```

#### C3: Xóa thuốc khỏi đơn
```
User bấm [x] trên Atorvastatin 20mg
        │
        ▼
┌──────────────────────────────────────────────┐
│  ❓ "Xóa Atorvastatin 20mg khỏi đơn?"         │
│     [Xóa] [Giữ lại]                            │
└──────────────────────────────────────────────┘
        │ User xác nhận Xóa
        ▼
┌──────────────────────────────────────────────┐
│  ✅ "Đã xóa Atorvastatin.                     │
│     Đơn còn 2 thuốc.                           │
│     [🔄 Cập nhật lại giải thích]"             │
└──────────────────────────────────────────────┘
```

#### C4: Sửa timeline (user biết giờ uống tốt hơn)
```
User bấm [✏️ Sửa] trên timeline "Sáng"
        │
        ▼
┌──────────────────────────────────────────────┐
│  ✏️ Sửa lịch uống                              │
│                                                  │
│  🌅 Sáng: [Amlodipine ✅] [Metformin ✅]      │
│  🌙 Tối:  [Metformin ✅] [Atorvastatin ✅]   │
│                                                  │
│  [💾 Lưu] [❌ Hủy]                              │
└──────────────────────────────────────────────┘
```

---

### PATH 5: 💬 Feedback — "User đánh giá"

**User Story:**
> **Anh Nam** xem giải thích Metformin. Anh thấy hữu ích nhưng muốn đánh giá. Hoặc anh thấy thông tin không đúng và muốn báo lỗi.

#### FB1: Thumbs up/down cho mỗi thuốc
```
Cuối mỗi card giải thích thuốc:
┌──────────────────────────────────────────────┐
│  💊 Metformin 500mg                           │
│  ... (giải thích) ...                         │
│                                                  │
│  Thông tin này có hữu ích không?              │
│  [👍 Hữu ích]  [👎 Chưa đúng]  [💬 Phản hồi]  │
└──────────────────────────────────────────────┘
```

#### FB2: Khi user bấm "Chưa đúng" → form feedback
```
User bấm [👎 Chưa đúng]
        │
        ▼
┌──────────────────────────────────────────────┐
│  📝 Thông tin哪里 không đúng?                  │
│                                                  │
│  [ ] Công dụng không đúng                      │
│  [ ] Liều dùng không đúng                      │
│  [ ] Tác dụng phụ thiếu/sai                   │
│  [ ] Lưu ý không đúng                         │
│  [ ] Khác: _______________                     │
│                                                  │
│  [📤 Gửi反馈]  [❌ Hủy]                        │
└──────────────────────────────────────────────┘
        │ User gửi
        ▼
┌──────────────────────────────────────────────┐
│  ✅ "Cảm ơn bạn! Phản hồi giúp chúng tôi     │
│     cải thiện chất lượng. Nếu cần hỗ trợ     │
│     ngay, hãy gọi dược sĩ Long Châu."         │
│     [📞 Gọi dược sĩ]                           │
└──────────────────────────────────────────────┘
```

#### FB3: Thumbs up → cảm ơn + gợi ý share
```
User bấm [👍 Hữu ích]
        │
        ▼
┌──────────────────────────────────────────────┐
│  😊 "Tuyệt! Bạn có muốn:                     │
│     [📤 Chia sẻ đơn thuốc cho người thân]    │
│     [💊 Thêm đơn thuốc mới]                   │
│     [💬 Hỏi thêm]"                            │
└──────────────────────────────────────────────┘
```

#### FB4: Feedback cho chat follow-up
```
Cuối mỗi câu trả lời chat:
┌──────────────────────────────────────────────┐
│  🤖: Uống canxi cách Metformin 2h...          │
│                                                  │
│  [👍] [👎] [💬 Báo lỗi]                        │
└──────────────────────────────────────────────┘
```

#### FB5: Feedback cho toàn bộ đơn (sau khi xem xong)
```
Khi user sắp rời trang:
┌──────────────────────────────────────────────┐
│  📋 Đánh giá trải nghiệm tổng thể             │
│                                                  │
│  Bạn thấy giải thích đơn thuốc thế nào?       │
│  ⭐ ⭐ ⭐ ⭐ ⭐                                │
│                                                  │
│  [💬 Nhận xét thêm (tùy chọn)]                │
│  [📤 Hoàn tất]                                 │
└──────────────────────────────────────────────┘
```

---

### Feedback Loop — Dữ liệu đi đâu?

```
User feedback (thumbs up/down, báo lỗi, star rating)
        │
        ▼
┌──────────────────────────────────────────────┐
│  Feedback DB                                   │
│  - drug_id                                     │
│  - feedback_type (thumbs_up / thumbs_down /    │
│    error_report / star_rating)                 │
│  - error_category (nếu có)                    │
│  - user_comment (nếu có)                      │
│  - timestamp                                   │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  Phân tích (batch hàng tuần):                 │
│  - Thuốc nào có nhiều thumbs down? → Review   │
│  - Lỗi sai nào phổ biến nhất? → Fix DB       │
│  - User rated thấp overall? → Review prompt   │
└──────────────────────────────────────────────┘
```

---

## 5. Owner Plan

| Task | Owner | Deadline |
|------|-------|----------|
| Thu thập 500 thuốc phổ biến nhất VN (Drug DB) | ? | Tối DAY05 |
| Setup PostgreSQL + fuzzy search (pg_trgm) | ? | Tối DAY05 |
| Prompt engineering (system prompt + few-shot) | ? | Sáng DAY06 |
| Build Search API (`/api/drugs/search`) | ? | Sáng DAY06 |
| Build Explain API (`/api/explain`) | ? | Sáng DAY06 |
| Build Interaction API (`/api/interactions`) | ? | Trưa DAY06 |
| Frontend / Demo UI | ? | Chiều DAY06 |
| Test happy path + failure cases | ? | Chiều DAY06 |
| Chuẩn bị demo narrative | ? | Tối DAY06 |
| Demo + pitch | ? | Cuối DAY06 |

---

## 6. Data Sourcing — Cách lấy Drug Database

### Tổng quan: 3 nguồn chính

```
┌─────────────────────────────────────────────────────────────┐
│                     DRUG DATABASE                            │
│                                                             │
│  Nguồn 1: Scrape Long Châu     ← Nhanh nhất, dữ liệu VN   │
│  Nguồn 2: DrugBank API         ← Quốc tế, đầy đủ nhất      │
│  Nguồn 3: LLM generate + verify ← Tạo nhanh, cần review    │
│                                                             │
│  MVP: 500 thuốc phổ biến nhất                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Nguồn 1: 🔍 Scrape Long Châu Website (Recommended — nhanh nhất)

**URL:** `https://nhathuoclongchau.com/thuoc`

**Ưu điểm:** Dữ liệu tiếng Việt sẵn sàng, format chuẩn, có ảnh bao bì

```python
# Concept: Scrape từ Long Châu
import requests
from bs4 import BeautifulSoup

# Bước 1: Crawl danh mục thuốc
# https://nhathuoclongchau.com/thuoc
# → Lấy URL từng thuốc

# Bước 2: Parse chi tiết từng thuốc
# Mỗi trang thuốc có:
#   - Tên thuốc (VI/EN)
#   - Hoạt chất
#   - Hàm lượng
#   - Công dụng
#   - Liều dùng
#   - Tác dụng phụ
#   - Chống chỉ định
#   - Tương tác

# Bước 3: Store vào DB
```

**Output format mong đợi:**
```json
{
  "name_vi": "Amlodipine",
  "name_en": "Amlodipine besylate",
  "brand_names": ["Norvasc", "Amlodin"],
  "strength": "5mg",
  "dosage_forms": ["viên nén"],
  "therapeutic_class": "Chống tăng huyết áp",
  "indication": "Điều trị tăng huyết áp",
  "dosage_adult": "5-10mg/ngày, 1 lần",
  "side_effects": ["Phù", "Chóng mặt", "Đỏ mặt"],
  "contraindications": ["Hạ huyết áp nặng"],
  "pregnancy_category": "C"
}
```

**⚠️ Lưu ý:** Respect robots.txt, delay giữa các request, không spam server

---

### Nguồn 2: 💊 DrugBank API (Đầy đủ nhất)

**URL:** `https://go.drugbank.com/` (free tier: 100 requests/ngày)

**Ưu điểm:** Dữ liệu chuẩn quốc tế, 14,000+ drugs, API structured

```python
# DrugBank API — concept
import requests

headers = {"Authorization": "Token YOUR_TOKEN"}
url = "https://go.drugbank.com/drugs.json?q=amlo"

response = requests.get(url, headers=headers)
drugs = response.json()

# Mỗi drug có:
# - name, description
# - indication
# - pharmacodynamics (tác dụng dược lý)
# - mechanism_of_action
# - side_effects
# - drug_interactions[]
# - pregnancy_category
```

**⚠️ Hạn chế:** Free tier hạn chế, tên thuốc tiếng Anh (cần translate sang VN)

---

### Nguồn 3: 🤖 LLM Generate + Expert Verify (Nhanh nhất cho MVP hackathon)

**Cách:** Dùng GPT-4/Claude generate data cho 500 thuốc → dược sĩ verify

```
Prompt:
"Tạo JSON data cho 500 thuốc phổ biến nhất VN.
Mỗi thuốc gồm: name_vi, name_en, strength, therapeutic_class,
indication_simple, dosage_adult, side_effects_simple, warnings, pregnancy_category.

Nguồn tham khảo: DrugBank, Dược thư Việt Nam.
Output: JSON array."
```

**Ưu điểm:**
- Nhanh nhất — 5 phút có data
- Format chuẩn theo schema của mình
- Tiếng Việt sẵn

**Nhược điểm:**
- Cần expert verify (dược sĩ review)
- Có thể có sai sót → cần double-check

**Workflow:**
```
LLM generate 500 drugs (JSON)
        │
        ▼
Automated validation (check schema, check required fields)
        │
        ▼
Expert review (3-5 dược sĩ review 10% mẫu)
        │
        ▼
Fix errors → Import vào PostgreSQL
```

---

### Nguồn 4: 📋 Drug Interaction Data

**Nguồn tốt nhất cho tương tác thuốc:**

| Nguồn | URL | Dữ liệu |
|-------|-----|---------|
| **DrugBank** | drugbank.com/drug-interactions | 40,000+ interactions |
| **Drug.com** | drug.com/interactions-checker | Dễ scrape |
| **Cục QL Dược VN** | dichvucong.dav.gov.vn | Quy định VN |

```python
# Concept: Import interactions
interactions = [
    {
        "drug_a": "Metformin",
        "drug_b": "Atorvastatin",
        "severity": "moderate",
        "description": "Cả hai tác động đến gan",
        "recommendation": "Theo dõi AST/ALT mỗi 3-6 tháng"
    },
    # ... 300+ interactions phổ biến
]
```

---

### Nguồn 5: 🔤 Vietnamese Drug Name Mapping

**Vấn đề:** DrugBank tên EN, cần map sang tên VN

```python
# Mapping table: EN → VN
name_mapping = {
    "Amlodipine": "Amlodipin",       // hoặc "Amlodipine"
    "Paracetamol": "Paracetamol",
    "Metformin": "Metfomin",         // VN hay viết thế này
    "Amoxicillin": "Amoxicillin",
    "Omeprazole": "Omeprazol",
    # ...
}
```

**Nguồn:** traCuuThuoc.com, LongChau.vn, VnExpress health

---

### MVP Data Strategy (Khuyến nghị)

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: LLM Generate (15 phút)                            │
│  → 500 drugs cơ bản dạng JSON                               │
│                                                             │
│  BƯỚC 2: Validate + Clean (30 phút)                         │
│  → Check schema, remove duplicates, normalize names         │
│                                                             │
│  BƯỚC 3: Scrape Long Châu bổ sung (1 giờ)                   │
│  → Lấy thêm dosage, side_effects tiếng Việt                 │
│                                                             │
│  BƯỚC 4: Import Interactions (30 phút)                       │
│  → 300+ drug-drug interactions từ DrugBank                  │
│                                                             │
│  BƯỚC 5: Expert Review (30 phút)                            │
│  → Dược sĩ check 50 thuốc mẫu                                │
│                                                             │
│  TỔNG: ~3 giờ có database 500 thuốc cho MVP                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Sample Data: 50 Thuốc phổ biến nhất (Quick Reference)

| # | Tên thuốc | Nhóm | Công dụng đơn giản |
|---|-----------|------|---------------------|
| 1 | Paracetamol | Giảm đau | Hạ sốt, giảm đau |
| 2 | Amoxicillin | Kháng sinh | Trị nhiễm khuẩn |
| 3 | Amlodipine | Huyết áp | Hạ huyết áp |
| 4 | Metformin | Tiểu đường | Kiểm soát đường huyết |
| 5 | Atorvastatin | Mỡ máu | Giảm cholesterol |
| 6 | Omeprazole | Dạ dày | Giảm axit dạ dày |
| 7 | Losartan | Huyết áp | Hạ huyết áp |
| 8 | Ciprofloxacin | Kháng sinh | Trị nhiễm khuẩn |
| 9 | Azithromycin | Kháng sinh | Trị nhiễm khuẩn |
| 10 | Ibuprofen | Giảm đau | Giảm đau, chống viêm |
| 11 | Diclofenac | Giảm đau | Giảm đau, chống viêm |
| 12 | Ranitidine | Dạ dày | Giảm axit dạ dày |
| 13 | Pantoprazole | Dạ dày | Giảm axit dạ dày |
| 14 | Salbutamol | Hô hấp | Giãn phế quản |
| 15 | Montelukast | Hen | Điều trị hen |
| 16 | Levocetirizine | Dị ứng | Giảm dị ứng |
| 17 | Chlorpheniramine | Cảm cúm | Trị cảm, dị ứng |
| 18 | Pseudoephedrine | Cảm cúm | Thông mũi |
| 19 | Vitamin C | Vitamin | Bổ sung vitamin C |
| 20 | Vitamin D | Vitamin | Bổ sung vitamin D |
| ... | ... | ... | ... |

---

# PHASE 2: BUILD + TEST + DRY RUN (DAY06)

---

## 7. Prototype — Happy Path Flow

### Flow demo:

```
[SCREEN 1: Search]
┌─────────────────────────────────────────────┐
│  💊 Giải thích đơn thuốc — Long Châu       │
│                                             │
│  🔍 Gõ tên thuốc...                         │
│  ┌─────────────────────────────────────────┐│
│  │ amlo                                ▼   ││
│  ├─────────────────────────────────────────┤│
│  │ 💊 Amlodipine 5mg   — Hạ huyết áp     ││
│  │ 💊 Amlodipine 10mg  — Hạ huyết áp     ││
│  └─────────────────────────────────────────┘│
│                                             │
│  📋 Đơn thuốc tạm:                          │
│  ✅ Amlodipine 5mg          [x]            │
│  ✅ Metformin 500mg         [x]            │
│  ✅ Atorvastatin 20mg       [x]            │
│                                             │
│  [🔍 Giải thích đơn thuốc]                  │
└─────────────────────────────────────────────┘
          │ User nhấn "Giải thích"
          ▼
[SCREEN 2: Summary (Tất cả cùng lúc)]
┌─────────────────────────────────────────────┐
│  📋 Đơn thuốc — Tổng quan                   │
│                                             │
│  💊 Amlodipine 5mg          🟡 Cần chú ý   │
│  Hạ huyết áp — 1 viên/ngày                 │
│  ⚠️ Sưng chân, chóng mặt                   │
│                              [▼ Chi tiết]   │
│                                             │
│  💊 Metformin 500mg         🟡 Cần chú ý   │
│  Tiểu đường — 2 viên/ngày, SAU ĂN          │
│  ⚠️ Buồn nôn, tiêu chảy                    │
│                              [▼ Chi tiết]   │
│                                             │
│  💊 Atorvastatin 20mg       🟡 Cần chú ý   │
│  Hạ mỡ máu — 1 viên tối, không ăn bưởi    │
│  ⚠️ Đau cơ nghiêm trọng → gặp BS           │
│                              [▼ Chi tiết]   │
│                                             │
│  ─────────────────────────────────────────  │
│  ⏰ Lịch uống thuốc:                        │
│  🌅 Sáng (sau ăn): Amlodipine + Metformin  │
│  🌙 Tối: Metformin + Atorvastatin          │
│                                             │
│  ⚠️ Tương tác:                              │
│  🔴 Metformin ↔ Atorvastatin                │
│     Cần theo dõi chức năng gan              │
│                                             │
│  [💬 Hỏi thêm]  [📞 Gọi dược sĩ]            │
│  ⚕️ Tham khảo — tuân theo bác sĩ           │
└─────────────────────────────────────────────┘
          │ User bấm "Hỏi thêm"
          ▼
[SCREEN 3: Chat follow-up]
┌─────────────────────────────────────────────┐
│  💬 Hỏi về thuốc                            │
│                                             │
│  User: "Metformin uống với canxi được không?"│
│                                             │
│  🤖: Chị có thể uống canxi, nhưng nên      │
│  cách Metformin 2 giờ để thuốc hấp thu     │
│  tốt nhất. Uống Metformin sau ăn sáng,    │
│  2 giờ sau mới uống canxi.                 │
│                                             │
│  [💬 Hỏi thêm]  [📞 Gọi dược sĩ]            │
└─────────────────────────────────────────────┘
```

---

## 8. Test Cases

### ✅ Happy Path
| # | Input | Expected Output |
|---|-------|-----------------|
| H1 | Gõ "amlo" → chọn Amlodipine 5mg | Autocomplete gợi ý đúng |
| H2 | Chọn 3 thuốc → nhấn "Giải thích" | Summary cards + timeline + interactions |
| H3 | Bấm "Xem chi tiết" trên Metformin | Expand chi tiết Metformin |
| H4 | Hỏi "uống với canxi được không?" | LLM trả lời: cách nhau 2h |

### ⚠️ Low Confidence
| # | Input | Expected Output |
|---|-------|-----------------|
| LC1 | Gõ "paracetmol" (confidence 0.65) | Hiển thị gợi ý + "Không chắc bạn tìm thuốc nào?" |
| LC2 | Chọn Paracetamol không rõ hàm lượng | Hỏi "Bạn muốn 500mg hay 650mg?" |
| LC3 | Interaction severity không rõ | Hiển thị 🟡 "Có thể có tương tác — hỏi dược sĩ" |

### ❌ Failure
| # | Input | Expected Output |
|---|-------|-----------------|
| F1 | Gõ "thuốc hạ huyết áp" (không cụ thể) | Fallback: browse theo nhóm thuốc |
| F2 | Chọn nhầm hàm lượng | ⚠️ "Bạn chọn liều CAO. Chắc chắn chưa?" |
| F3 | LLM trả lời超出 DB data | Replace bằng "Hỏi dược sĩ để biết thêm" |
| F4 | 2 thuốc không có interaction data | "Không tìm thấy — hỏi dược sĩ" |
| F5 | LLM timeout > 5s | Hiển thị DB data trước, LLM update sau |

### ✏️ Correction
| # | Input | Expected Output |
|---|-------|-----------------|
| C1 | Sửa Amlodipine 10mg → 5mg | Update + giải thích lại tự động |
| C2 | Thêm Losartan 50mg vào đơn | Thêm vào + update timeline + interactions |
| C3 | Xóa Atorvastatin | Confirm xóa + update đơn còn 2 thuốc |
| C4 | Sửa timeline "Sáng → Tối" | Update lịch uống |

### 💬 Feedback
| # | Input | Expected Output |
|---|-------|-----------------|
| FB1 | Bấm 👍 Hữu ích | Cảm ơn + gợi ý share / thêm đơn mới |
| FB2 | Bấm 👎 Chưa đúng → chọn "Liều dùng sai" | Form feedback → lưu DB → cảm ơn |
| FB3 | Bấm 💬 Phản hồi → nhập text | Lưu user_comment → cảm ơn |
| FB4 | Đánh giá ⭐⭐⭐⭐⭐ (toàn bộ đơn) | Lưu star_rating → cảm ơn |

---

## 9. Demo Narrative (Chuẩn bị cho pitch)

### Storyboard (2-3 phút):

**[0:00-0:20] Problem — Tại sao cần cái này?**
> "Chị Lan đi khám bác sĩ, nhận đơn thuốc 3 thuốc. Chị về nhà, mở Google search từng thuốc — toàn thông tin y khoa khó hiểu. Chị không biết: thuốc nào uống sáng, thuốc nào uống tối? Metformin uống trước hay sau ăn? Uống 2 thuốc này có sao không?"

**[0:20-1:00] Happy Path — Demo flow search → giải thích**
> "Chị mở app, gõ 'amlo' — autocomplete gợi ý ngay. Chọn 3 thuốc, nhấn giải thích. Trong 3 giây: tóm tắt mỗi thuốc 3 dòng, lịch uống rõ ràng, cảnh báo tương tác."

**[1:00-1:30] Low Confidence + Correction**
> "Nếu nhập sai 'paracetmol' — fuzzy match sửa. Nếu chọn nhầm hàm lượng — hỏi xác nhận. Sau khi xem xong, chị muốn sửa 1 thuốc — bấm Edit, thay đổi, tự động update."

**[1:30-2:00] Failure Handling**
> "Nếu không tìm thấy — gợi ý browse theo nhóm. Nếu LLM timeout — data DB hiển thị trước. Nếu tương tác không có data — nói rõ 'hỏi dược sĩ'."

**[2:00-2:30] Feedback**
> "Mỗi thuốc có nút 👍/👎. Bấm 'Chưa đúng' → form chọn lỗi cụ thể. Feedback giúp cải thiện hệ thống."

**[2:30-3:00] Reflection**
> "Vấn đề: bệnh nhân không hiểu đơn thuốc. Giải pháp: AI augment — hỗ trợ hiểu, không thay thế dược sĩ. Key insight: Drug DB = source of truth. LLM chỉ là 'translator'."

---

# PHASE 3: DEMO + REPO (Cuối DAY06)

---

## 10. Demo Checklist

- [ ] Pitch problem + evidence (30s)
- [ ] Demo live: search → giải thích → timeline → chat (60s)
- [ ] Show failure handling (30s)
- [ ] Reflection + learning (30s)

## 11. Repo Structure

```
pill-explainer/
├── group/
│   ├── hackathon-pill-explainer.md   ← Plan này
│   └── slides/                       ← Demo slides (nếu có)
├── individual/
│   ├── README.md                     ← Reflection cá nhân
│   ├── evidence/                     ← Screenshots, data, test results
│   │   ├── drug-db-sample.csv
│   │   ├── fuzzy-search-test.png
│   │   └── demo-screenshots/
│   └── prototype/                    ← Code prototype
│       ├── backend/
│       │   ├── app.py
│       │   ├── drug_db.sql
│       │   └── prompts/
│       └── frontend/
│           └── demo.html
└── README.md                         ← Overview
```

## 12. Reflection

| Câu hỏi | Trả lời |
|----------|---------|
| **Pain thực sự là gì?** | Bệnh nhân không hiểu đơn thuốc — thông tin quá kỹ thuật |
| **AI augment hay automate?** | **Augment** — AI giúp bệnh nhân hiểu, nhưng dược sĩ/bác sĩ vẫn là final authority |
| **Tại sao không OCR?** | Build nhanh, tránh phức tạp. User gõ tên thuốc + fuzzy match đơn giản hơn |
| **Key insight** | Drug DB = source of truth. LLM chỉ là "translator" — không tự invent |
| **Nếu có thêm thời gian?** | OCR scan đơn, voice input, nhắc uống thuốc |

---

## Links
- [[momo.md]] — Research ban đầu (Track D — so sánh)
- [[Research/longchau-ai-pill-explainer.md]] — Plan chi tiết kỹ thuật (deprecated, đã merge vào đây)
