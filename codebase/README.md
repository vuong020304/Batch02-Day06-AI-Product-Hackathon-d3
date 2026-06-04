# AI Giai Thich Don Thuoc

Prototype Healthcare/Long Chau: search thuoc, giai thich bang AI, tao timeline uong thuoc va canh bao tuong tac.

## Chay backend

```powershell
cd codebase
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python run.py
```

API docs: <http://127.0.0.1:8000/docs>

Mac/Linux:

```bash
cd codebase
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py
```

## Chay frontend

Mo terminal khac:

```powershell
cd codebase/frontend
npm install
npm run dev
```

UI: <http://127.0.0.1:5173>

Frontend dung Vite proxy de goi backend qua `/api`, nen backend can dang chay o `http://127.0.0.1:8000`.

## Bien moi truong

`DATA_FILE` mac dinh tro toi `../data_c4ai/clean.jsonl`.

`OPENAI_API_KEY` de trong thi backend van chay bang DB fallback. Khi co key, `/api/explain` va `/api/chat` se goi OpenAI de viet lai noi dung de hieu hon.

Neu deploy frontend rieng, tao `codebase/frontend/.env` va dat:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Endpoint chinh

- `GET /api/health` - kiem tra server va so luong thuoc load duoc
- `GET /api/search?q=amlo` - autocomplete/fuzzy search
- `GET /api/drugs/{drug_id}` - chi tiet 1 thuoc
- `POST /api/explain` - giai thich 1 thuoc
- `POST /api/plan` - timeline + interaction cho nhieu thuoc
- `POST /api/chat` - hoi them ve don thuoc

## Vi du test nhanh

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/search?q=amlo"
```

```json
{
  "drug_id": "drug-10118",
  "question": "Uong voi canxi duoc khong?"
}
```

Post JSON tren vao `POST /api/explain`.

## Luu y an toan

Prototype chi giai thich thong tin thuoc theo DB va AI, khong thay the tu van y khoa. Luon hien safety note de user hoi duoc si/bac si khi khong chac.
