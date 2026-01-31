from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
from models import (
    GameResultIn,
    GameResultOut,
    RegistrationIn,
    RegistrationOut,
    StatsResponse,
    TeamStatsResponse,
)

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
    reg_id = db.create_registration(payload.fio, payload.team, payload.email)
    return RegistrationOut(id=reg_id, **payload.model_dump())


@app.post("/api/game-result", response_model=GameResultOut)
def create_game_result(payload: GameResultIn) -> GameResultOut:
    result_id = db.create_game_result(payload.registration_id, payload.moves)
    return GameResultOut(id=result_id, **payload.model_dump())


@app.get("/api/stats", response_model=StatsResponse)
def get_stats() -> StatsResponse:
    entries = [
        {
            "registration_id": int(row["registration_id"]),
            "fio": row["fio"],
            "team": row["team"],
            "games_count": int(row["games_count"]),
            "best_moves": int(row["best_moves"]),
            "last_played": row["last_played"],
        }
        for row in db.get_stats()
    ]
    return StatsResponse(entries=entries)


@app.get("/api/team-stats", response_model=TeamStatsResponse)
def get_team_stats() -> TeamStatsResponse:
    entries = [
        {
            "team": row["team"],
            "games_count": int(row["games_count"]),
            "best_moves": int(row["best_moves"]),
            "last_played": row["last_played"],
        }
        for row in db.get_team_stats()
    ]
    return TeamStatsResponse(entries=entries)
