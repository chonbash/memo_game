from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
from models import RegistrationIn, RegistrationOut

MEDIA_DIR = Path(__file__).resolve().parent / "media"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/register", response_model=RegistrationOut)
def register(payload: RegistrationIn) -> RegistrationOut:
    reg_id = db.create_registration(payload.fio, payload.email, payload.team)
    return RegistrationOut(id=reg_id, **payload.model_dump())
