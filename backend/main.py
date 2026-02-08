from pathlib import Path
import shutil
from urllib.parse import quote

from fastapi import FastAPI, Query
from fastapi import FastAPI, File, HTTPException, UploadFile
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
    TruthOrMythResponse,
    TrueFalseQuestion,
    TrueFalseQuestionIn,
    TrueFalseQuestionList,
    VideoEntry,
    VideoListResponse,
)

MEDIA_DIR = Path(__file__).resolve().parent / "media"
TEAM_VIDEO_BASENAME = "congrats"
DEFAULT_TEAM_KEY = "default"

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


def _team_directory(team_key: str) -> Path:
    if team_key == DEFAULT_TEAM_KEY:
        return MEDIA_DIR
    if "/" in team_key or "\\" in team_key:
        raise HTTPException(status_code=400, detail="Некорректное имя команды")
    return MEDIA_DIR / team_key


def _find_team_video(directory: Path) -> Path | None:
    for candidate in sorted(directory.glob(f"{TEAM_VIDEO_BASENAME}.*")):
        if candidate.is_file():
            return candidate
    return None


def _build_video_entry(team_key: str, directory: Path, is_default: bool) -> VideoEntry:
    video_file = _find_team_video(directory)
    filename = video_file.name if video_file else None
    if not filename:
        return VideoEntry(
            key=team_key,
            team=None if is_default else team_key,
            filename=None,
            url=None,
            is_default=is_default,
        )
    if is_default:
        url = f"/media/{filename}"
    else:
        url = f"/media/{quote(team_key)}/{filename}"
    return VideoEntry(
        key=team_key,
        team=None if is_default else team_key,
        filename=filename,
        url=url,
        is_default=is_default,
    )


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


@app.get("/api/truth-or-myth", response_model=TruthOrMythResponse)
def get_truth_or_myth_questions(
    limit: int = Query(default=6, ge=1, le=20)
) -> TruthOrMythResponse:
    entries = [
        {
            "id": row["id"],
            "statement": row["statement"],
            "is_true": bool(row["is_true"]),
        }
        for row in db.get_truth_or_myth_questions(limit)
    ]
    return TruthOrMythResponse(entries=entries)
@app.get("/api/questions", response_model=TrueFalseQuestionList)
def get_true_false_questions() -> TrueFalseQuestionList:
    entries = [
        {
            "id": int(row["id"]),
            "question": row["question"],
            "answer": bool(row["answer"]),
            "is_active": bool(row["is_active"]),
        }
        for row in db.list_true_false_questions(include_inactive=False)
    ]
    return TrueFalseQuestionList(entries=entries)


@app.get("/api/admin/questions", response_model=TrueFalseQuestionList)
def get_admin_true_false_questions() -> TrueFalseQuestionList:
    entries = [
        {
            "id": int(row["id"]),
            "question": row["question"],
            "answer": bool(row["answer"]),
            "is_active": bool(row["is_active"]),
        }
        for row in db.list_true_false_questions(include_inactive=True)
    ]
    return TrueFalseQuestionList(entries=entries)


@app.post("/api/admin/questions", response_model=TrueFalseQuestion)
def create_admin_true_false_question(payload: TrueFalseQuestionIn) -> TrueFalseQuestion:
    question_id = db.create_true_false_question(
        payload.question, payload.answer, payload.is_active
    )
    return TrueFalseQuestion(
        id=question_id,
        question=payload.question,
        answer=payload.answer,
        is_active=payload.is_active,
    )


@app.put("/api/admin/questions/{question_id}", response_model=TrueFalseQuestion)
def update_admin_true_false_question(
    question_id: int, payload: TrueFalseQuestionIn
) -> TrueFalseQuestion:
    updated = db.update_true_false_question(
        question_id, payload.question, payload.answer, payload.is_active
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    return TrueFalseQuestion(
        id=question_id,
        question=payload.question,
        answer=payload.answer,
        is_active=payload.is_active,
    )


@app.delete("/api/admin/questions/{question_id}")
def delete_admin_true_false_question(question_id: int) -> dict:
    deleted = db.delete_true_false_question(question_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    return {"status": "deleted"}


@app.get("/api/admin/videos", response_model=VideoListResponse)
def get_admin_videos() -> VideoListResponse:
    entries: list[VideoEntry] = []
    entries.append(_build_video_entry(DEFAULT_TEAM_KEY, MEDIA_DIR, True))

    for item in sorted(MEDIA_DIR.iterdir(), key=lambda path: path.name.lower()):
        if item.is_dir():
            entries.append(_build_video_entry(item.name, item, False))

    return VideoListResponse(entries=entries)


@app.post("/api/admin/videos/{team_key}", response_model=VideoEntry)
async def upload_admin_video(team_key: str, file: UploadFile = File(...)) -> VideoEntry:
    team_dir = _team_directory(team_key)
    team_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix.lower()
    if not extension:
        extension = ".mp4"
    target_name = f"{TEAM_VIDEO_BASENAME}{extension}"

    for existing in team_dir.glob(f"{TEAM_VIDEO_BASENAME}.*"):
        if existing.is_file():
            existing.unlink()

    target_path = team_dir / target_name
    try:
        with target_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    return _build_video_entry(
        team_key, team_dir, is_default=team_key == DEFAULT_TEAM_KEY
    )
