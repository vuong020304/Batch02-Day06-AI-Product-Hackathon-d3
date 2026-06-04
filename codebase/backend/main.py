from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routers.search import router as search_router
from routers.summary import router as summary_router
from routers.chat import router as chat_router
from routers.health import router as health_router
from drug_data import load_drugs

app = FastAPI(title="Pill Explainer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(summary_router)
app.include_router(chat_router)
app.include_router(health_router)

FRONTEND_PATH = Path(__file__).parent.parent / "frontend"


@app.get("/")
async def serve_frontend():
    return FileResponse(FRONTEND_PATH / "index.html", media_type="text/html")


@app.on_event("startup")
async def startup():
    load_drugs()
