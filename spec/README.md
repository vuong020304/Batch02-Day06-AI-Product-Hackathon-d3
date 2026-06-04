# SPEC sản phẩm - AI giải thích đơn thuốc Long Châu

## 0. Tóm tắt

Nhóm D3 build một prototype hỗ trợ bệnh nhân mua thuốc tại Nhà thuốc Long Châu hiểu đơn thuốc của mình bằng tiếng Việt đơn giản. Người dùng nhập hoặc chọn các thuốc trong đơn, hệ thống dùng Drug DB làm nguồn dữ liệu chính, sau đó dùng AI để diễn giải dễ hiểu, tạo timeline uống thuốc và cảnh báo tương tác phổ biến. AI chỉ hỗ trợ giải thích và gợi ý; người dùng hoặc dược sĩ vẫn là người quyết định cuối cùng.


## 1. Nhóm, track và sản phẩm

| Mục | Nội dung |
|---|---|
| Track | E - Healthcare |
| Nhóm | D3 |
| Product/app tham chiếu | Nhà thuốc Long Châu |
| Ý tưởng | AI giải thích đơn thuốc |
| User cụ thể | Bệnh nhân mua thuốc tại nhà thuốc, đặc biệt người lớn tuổi hoặc phụ huynh mua thuốc cho con |
| Nhóm có phải user thật không? | Không. Nhóm là sinh viên IT, khác với bệnh nhân thật về nhu cầu, kiến thức y tế và bối cảnh mua thuốc |

### Thành viên

| Thành viên | MSSV |
|---|---|
| Cao Đặng Quốc Vương | 2A202600738 |
| Nguyễn Thành Vinh | 2A202600971 |
| Giáp Minh Hiếu | 2A202600667 |

## 2. Pain statement

```text
User [bệnh nhân mua thuốc tại Long Châu] đang gặp khó ở [hiểu đơn thuốc của mình],
vì [thông tin trên web quá kỹ thuật, dược sĩ không đủ thời gian giải thích kỹ từng người,
và người dùng dễ quên hướng dẫn sau khi rời quầy],
dẫn tới [không biết thuốc uống để làm gì, uống lúc nào, có tương tác không,
và tác dụng phụ nào cần chú ý].

Bằng chứng chính là [self-use test, review/bình luận người dùng, quan sát quy trình mua thuốc,
và phân tích các sản phẩm tra cứu thuốc hiện có].
```

## 3. Evidence summary

### 3.1. Self-use evidence

| Observation | Path liên quan | Điều học được | SPEC phải phản ánh |
|---|---|---|---|
| Gõ "amlo" thấy gợi ý Amlodipine 5mg nhanh | Happy path | Autocomplete giúp người dùng nhập thuốc nhanh hơn | Cần search/autocomplete |
| Gõ sai "paracetmol" không thấy kết quả tốt | Low-confidence | Người dùng có thể nhập sai chính tả | Cần fuzzy match và xác nhận lại |
| Chọn nhiều thuốc trong cùng một đơn | Happy path | Người dùng quan tâm cả đơn thuốc, không chỉ một thuốc lẻ | Cần quản lý danh sách thuốc |
| Timeline sáng/tối giúp dễ hiểu hơn mô tả dài | Happy path | Lịch uống là phần có giá trị cao với người lớn tuổi | Cần timeline uống thuốc |
| Câu hỏi tương tác thuốc làm LLM chậm hơn 5 giây | Failure path | Không nên chờ LLM mới có thông tin đầu tiên | Cần DB fallback trước, AI cập nhật sau |
| Chọn nhầm Amlodipine 10mg thay vì 5mg | Correction path | Sai hàm lượng là lỗi thực tế và nguy hiểm | Cần sửa/xóa thuốc ngay trong card |
| Google Search trả kết quả y khoa khó hiểu | Happy path | Người dùng cần bản dịch sang ngôn ngữ thường ngày | LLM translation layer là lõi sản phẩm |

### 3.2. User, review và social evidence

Các evidence dưới đây đã được ghi trong evidence pack. Khi nộp chính thức, nhóm cần lưu link, screenshot hoặc note phỏng vấn vào repo để chứng minh nguồn.

| Quote / observation | Nguồn ghi nhận | User | Pain/failure mode |
|---|---|---|---|
| "Bác sĩ kê toa xong về đọc trên mạng chẳng hiểu gì" | FB group Hội mẹ bỉm sữa | Mẹ trẻ | Không hiểu thuốc |
| "1 ngày uống 4-5 loại thuốc, không biết cái nào trước cái nào sau" | Tư vấn dược sĩ Long Châu | Người lớn tuổi | Không biết lịch uống |
| "Uống Atorvastatin với Metformin có sao không nhỉ?" | Google Search / nhu cầu tìm kiếm | Bệnh nhân tiểu đường | Lo tương tác thuốc |
| "Dược sĩ đông quá, hỏi 1 câu ngại quá" | Forum sức khỏe | Bệnh nhân nói chung | Ngại hỏi, thiếu thời gian tư vấn |
| "App này có support tiếng Việt không? Toàn tiếng Anh" | Drug app review | Người dùng Việt Nam | Rào cản ngôn ngữ |
| "Thuốc này uống lúc nào vậy BS nói nhanh quá quên mất" | Tự quan sát | Người lớn tuổi | Quên hướng dẫn |

### 3.3. Competitor / analog evidence

| App / mô hình tham khảo | Cách họ xử lý | Pattern học được | Áp dụng cho prototype Day 06 |
|---|---|---|---|
| Google Search | User tự search tên thuốc và đọc web y khoa | Dữ liệu nhiều nhưng quá kỹ thuật, không cá nhân hóa | Không dùng làm trải nghiệm chính |
| DrugBank | Cung cấp dữ liệu thuốc và interaction có cấu trúc | Drug DB nên là source of truth | Có thể tham khảo pattern dữ liệu |
| traCuuThuoc.com | Tra cứu thuốc tiếng Việt | Format thông tin quen thuộc với người Việt | Có thể tham khảo nội dung/field |
| NXHealth / Medisafe | Pill reminder và drug info | Timeline là pattern dễ hiểu | Có thể mô phỏng timeline |
| Bác sĩ / dược sĩ | Giải thích trực tiếp, hỏi đáp theo ngữ cảnh | Trust cao nhưng không scale | Prototype cần fallback "hỏi dược sĩ" |
| ChatGPT / Claude | Giải thích dễ hiểu bằng hội thoại | Ngôn ngữ tốt nhưng có rủi ro hallucination | Chỉ dùng LLM làm translator, không làm source of truth |

## 4. Evidence -> insight -> opportunity

### Insight

```text
User [bệnh nhân mua thuốc tại Long Châu] không chỉ cần [tra cứu thông tin thuốc].
Họ thật ra cần [một người phiên dịch đáng tin cậy],
dịch từ "ngôn ngữ y khoa" sang "ngôn ngữ thường ngày",
cá nhân hóa theo đơn thuốc của họ.

Lý do: evidence cho thấy Google Search quá kỹ thuật, dược sĩ không đủ thời gian,
người dùng dễ quên hướng dẫn, và họ lo lắng về lịch uống/tương tác thuốc.
```

### Opportunity

```text
Cơ hội là dùng AI để [augment: search + giải thích + timeline + interaction check],
giúp user [hiểu đơn thuốc trong vài giây mà không phải tự Google],
trong khi vẫn kiểm soát rủi ro bằng [Drug DB làm source of truth,
safety layer cho case không chắc, và luôn khuyến nghị hỏi dược sĩ khi thông tin ảnh hưởng sức khỏe].
```

## 5. Build slice

### Câu chốt

```text
Dựa trên [self-use test + user/review evidence + competitor analysis],
nhóm sẽ build [AI giải thích đơn thuốc: search -> giải thích -> timeline -> tương tác],
cho [bệnh nhân mua thuốc tại Long Châu],
để giải quyết [không hiểu đơn thuốc, không biết uống lúc nào,
có tương tác không, tác dụng phụ gì cần chú ý],
bằng cách AI [augment: fuzzy search, giải thích tiếng Việt đơn giản,
tạo timeline tự động, và cảnh báo tương tác phổ biến],
và sẽ test failure path [LLM hallucinate, timeout, sai liều, không tìm thấy thuốc].
```

### In scope cho Day 06

- Search/autocomplete thuốc theo tên gần đúng.
- Chọn nhiều thuốc vào một đơn thuốc demo.
- Hiển thị giải thích từng thuốc bằng tiếng Việt đơn giản.
- Tạo timeline uống thuốc theo sáng/trưa/tối/trước ăn/sau ăn nếu data có.
- Cảnh báo tương tác phổ biến giữa các thuốc đã chọn.
- Cho user sửa hàm lượng, thêm thuốc, xóa thuốc.
- Hiển thị fallback từ Drug DB nếu LLM timeout hoặc không đủ tin cậy.
- Hiển thị cảnh báo an toàn: thông tin chỉ để tham khảo, cần hỏi dược sĩ/bác sĩ khi không chắc.

### Out of scope cho Day 06

- OCR scan đơn thuốc.
- Push notification nhắc uống thuốc.
- Voice input/output.
- Đặt thuốc online hoặc tích hợp POS Long Châu.
- Login/user authentication.
- Drug interaction database đầy đủ ở mức sản phẩm thật.
- Chat real-time với dược sĩ.

## 6. AI Product Canvas

| Ô | Quyết định của nhóm |
|---|---|
| Value | Sản phẩm dành cho bệnh nhân Long Châu không hiểu đơn thuốc. AI giúp biến thông tin y khoa thành hướng dẫn đơn giản, cá nhân hóa theo danh sách thuốc, lịch uống và tương tác. |
| Trust | Drug DB là source of truth. LLM chỉ diễn giải lại. Nếu thiếu dữ liệu, sai chính tả, không rõ hàm lượng hoặc LLM timeout, hệ thống hỏi xác nhận, hiển thị fallback, hoặc khuyến nghị hỏi dược sĩ. |
| Feasibility | Prototype chỉ cần search, DB thuốc mẫu, prompt explain, timeline rule và interaction check cơ bản. Rủi ro chính là hallucination và sai liều; ngưỡng dừng là khi không kiểm soát được nguồn dữ liệu hoặc không demo được failure path. |
| Tín hiệu học | Khi user sửa thuốc/hàm lượng hoặc đánh giá giải thích, lưu lại để cập nhật fuzzy match, prompt, rule timeline và tập test regression. |

## 7. Auto/Aug decision

Nhóm chọn **Augmentation**.

AI được phép:

- Gợi ý thuốc gần đúng khi user search.
- Giải thích công dụng, cách uống và lưu ý bằng tiếng Việt đơn giản.
- Tạo timeline uống thuốc dựa trên dữ liệu có sẵn.
- Cảnh báo tương tác phổ biến.

AI không được phép:

- Quyết định thay bác sĩ/dược sĩ.
- Tự khẳng định liều dùng nếu Drug DB không có dữ liệu.
- Che giấu độ không chắc.
- Đưa lời khuyên điều trị cho case ngoài phạm vi prototype.

Lý do chọn augmentation: thông tin thuốc ảnh hưởng trực tiếp tới sức khỏe. Sai thuốc, sai liều hoặc hiểu nhầm tương tác có thể gây hại, nhất là với người lớn tuổi và trẻ em. Vì vậy AI chỉ chuẩn bị thông tin dễ hiểu; người dùng hoặc dược sĩ vẫn là final authority.

## 8. Luồng trải nghiệm chính

1. User mở prototype và nhập tên thuốc, ví dụ `amlo`.
2. Hệ thống autocomplete/fuzzy search gợi ý thuốc gần đúng.
3. User chọn thuốc và hàm lượng đúng vào đơn.
4. Hệ thống hiển thị card cho từng thuốc: công dụng, cách uống, lưu ý, tác dụng phụ thường gặp.
5. Hệ thống tạo timeline uống thuốc trong ngày.
6. Hệ thống kiểm tra tương tác phổ biến giữa các thuốc đã chọn.
7. User có thể sửa hàm lượng, thêm thuốc hoặc xóa thuốc.
8. Mọi thay đổi cập nhật lại explanation, timeline và interaction warning.

## 9. Bốn đường đi của trải nghiệm AI

| Path | Tình huống demo | Prototype phải thể hiện | Cách xử lý |
|---|---|---|---|
| Happy | Search `amlo`, chọn Amlodipine 5mg, Metformin, Atorvastatin | Gợi ý nhanh, giải thích dễ hiểu, timeline sáng/tối, interaction warning nếu có | Cho user chấp nhận/chỉnh sửa trong một thao tác |
| Low-confidence | User gõ `paracetmol` hoặc nhập thuốc không rõ hàm lượng | AI/search không chắc và không tự đoán bừa | Fuzzy match `Paracetamol`, hỏi user xác nhận; nếu có nhiều hàm lượng thì bắt chọn |
| Failure | LLM timeout, không tìm thấy thuốc, hoặc output chứa thông tin ngoài DB | Hệ thống vẫn có phản hồi an toàn | Hiển thị DB data trước; nếu không có dữ liệu thì hướng user hỏi dược sĩ/browse theo nhóm thuốc |
| Correction | User chọn nhầm Amlodipine 10mg thay vì 5mg | User sửa được lỗi ngay trong flow | Cho sửa hàm lượng/xóa thuốc; tự động cập nhật explanation, timeline, interaction |

## 10. Failure modes đáng lo nhất

| Failure mode | Khi nào xảy ra | Ai chịu thiệt / mức độ | Guardrail trong prototype | Owner test |
|---|---|---|---|---|
| Chọn sai thuốc hoặc sai hàm lượng | Tên thuốc giống nhau, autocomplete quá tự tin, user không nhớ liều | Bệnh nhân có thể uống sai thuốc/sai liều; rủi ro cao | Bắt xác nhận tên + hàm lượng, cho sửa trực tiếp, không tự động chọn thay user | Cao Đặng Quốc Vương |
| LLM hallucinate về liều, tương tác hoặc tác dụng phụ | Prompt thiếu dữ liệu, câu hỏi ngoài phạm vi, model tự suy diễn | Bệnh nhân hiểu sai hướng dẫn; rủi ro cao | Drug DB là source of truth; LLM chỉ rewrite; nếu thiếu data thì nói không chắc và hỏi dược sĩ | Nguyễn Thành Vinh |
| Không tìm thấy thuốc hoặc LLM timeout | Thuốc ngoài DB, mạng chậm, API lỗi | User mất niềm tin hoặc không có thông tin cần thiết; rủi ro vừa/cao | Hiển thị fallback: browse nhóm thuốc, dữ liệu DB có sẵn, thông báo lỗi rõ ràng | Giáp Minh Hiếu |

## 11. Kiến trúc dữ liệu và AI

### Nguồn dữ liệu

- Drug DB mẫu: danh sách thuốc, hoạt chất, hàm lượng, công dụng, cách dùng, lưu ý.
- Interaction table mẫu: các cặp tương tác phổ biến đủ để demo.
- Prompt templates: dùng để chuyển dữ liệu có cấu trúc thành tiếng Việt dễ hiểu.

### Luồng xử lý

```text
User input
-> fuzzy search/autocomplete
-> user xác nhận thuốc + hàm lượng
-> Drug DB lookup
-> timeline rules + interaction check
-> LLM rewrite/explain
-> safety validation
-> UI cards + timeline + warnings
```

### Nguyên tắc an toàn

- DB trả dữ liệu trước, LLM chỉ làm phần diễn giải.
- Prompt không được yêu cầu model tự bịa dữ liệu thiếu.
- Nếu output vượt ngoài dữ liệu DB, thay bằng thông báo an toàn.
- Luôn hiển thị disclaimer y tế ngắn, đúng ngữ cảnh.
- Các case không chắc phải hỏi lại hoặc chuyển sang dược sĩ/bác sĩ.

## 12. Kế hoạch kiểm thử và demo

### Test case bắt buộc

| Case | Input | Kỳ vọng |
|---|---|---|
| Happy path | `amlo` -> Amlodipine 5mg + Metformin + Atorvastatin | Có autocomplete, explanation, timeline và interaction warning |
| Typo/low confidence | `paracetmol` | Gợi ý Paracetamol nhưng yêu cầu user xác nhận |
| Wrong strength/correction | Chọn Amlodipine 10mg rồi sửa sang 5mg | Card và timeline cập nhật sau khi sửa |
| LLM timeout | Simulate API chậm/lỗi | UI hiển thị DB fallback, không trắng màn hình |
| Unknown drug | Nhập thuốc không có trong DB | Không bịa thông tin; gợi ý hỏi dược sĩ hoặc browse nhóm thuốc |
| Unsafe question | User hỏi chỉ dẫn điều trị ngoài phạm vi | Từ chối mềm, nhắc tham khảo bác sĩ/dược sĩ |

### Bằng chứng cần lưu trong repo

- Screenshot hoặc short video cho happy path.
- Screenshot hoặc short video cho low-confidence/failure path.
- Prompt logs cho các lần explain chính.
- Test report các case ở bảng trên.
- Ảnh/link evidence user hoặc note phỏng vấn ngắn.
- Demo narrative để người thuyết trình đi theo cùng một câu chuyện.

### Kịch bản demo đề xuất

1. Mở prototype và nói pain: bệnh nhân nhận đơn nhưng không hiểu thuốc, lịch uống và tương tác.
2. Search `amlo`, chọn thuốc đúng, thêm Metformin và Atorvastatin.
3. Cho thấy AI giải thích bằng tiếng Việt đơn giản, không dùng thuật ngữ quá nặng.
4. Chuyển sang timeline uống thuốc trong ngày.
5. Cho thấy interaction warning và disclaimer hỏi dược sĩ.
6. Demo typo `paracetmol` để thấy hệ thống không đoán bừa mà hỏi xác nhận.
7. Demo sửa Amlodipine 10mg thành 5mg để thấy correction flow.
8. Kết luận: AI không thay bác sĩ/dược sĩ, AI giúp người dùng hiểu và hỏi đúng hơn.

## 13. Phân công

| Thành viên | Việc phụ trách | Bằng chứng cần có trong repo |
|---|---|---|
| Cao Đặng Quốc Vương | Drug DB + Search API + kiểm thử sai thuốc/sai hàm lượng | `data_c4ai/clean.jsonl`, `backend/drug_db.sql`, search API endpoint, test case correction |
| Nguyễn Thành Vinh | Prompt engineering + Explain API + guardrail hallucination | `backend/prompts/`, explain API endpoint, prompt logs, hallucination tests |
| Giáp Minh Hiếu | Frontend demo + timeline UI + fallback UI | `frontend/demo.html`, screenshot/video demo, failure-state UI |
| Cả nhóm | Evidence, failure path, demo script | Test report, demo narrative, source evidence trong repo |

## 14. Acceptance criteria cho prototype

- User search được thuốc bằng tên gần đúng.
- User chọn được ít nhất 3 thuốc trong cùng một đơn.
- Mỗi thuốc có explanation tiếng Việt đơn giản, ngắn và dễ hiểu.
- Timeline uống thuốc thay đổi khi thêm/xóa/sửa thuốc.
- Interaction warning xuất hiện khi có cặp thuốc trong interaction table.
- Typo/low-confidence case có hỏi xác nhận.
- LLM timeout hoặc lỗi API không làm demo bị kẹt.
- Không có màn hình nào khẳng định AI thay thế tư vấn y tế.
- Demo thể hiện đủ 4 paths: happy, low-confidence, failure, correction.

## 15. Backlog sau Day 06

- OCR scan đơn thuốc từ ảnh.
- Push notification nhắc uống thuốc.
- Voice input/output cho người lớn tuổi.
- Drug interaction database đầy đủ hơn.
- Tài khoản user và lịch sử đơn thuốc.
- Tích hợp app/POS Long Châu.
- Chat với dược sĩ trong các case rủi ro cao.
- Feedback loop thật để cải thiện search, prompt và rule timeline.
