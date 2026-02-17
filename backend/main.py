import os
from pathlib import Path
import shutil
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
from models import (
    AdminVerifyIn,
    GameResultIn,
    GameResultOut,
    RegistrationIn,
    RegistrationOut,
    StatsResponse,
    TeamEntry,
    TeamListResponse,
    TeamStatsResponse,
    TeamTotalEntry,
    TeamTotalStatsResponse,
    TruthOrMythAdminEntry,
    TruthOrMythAdminIn,
    TruthOrMythAdminList,
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
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")

app = FastAPI()


def verify_admin(
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
) -> None:
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Неверный пароль")

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


@app.get("/api/played-games")
def get_played_games(registration_id: int = Query(gt=0)) -> dict:
    played = db.get_played_games(registration_id)
    return {"played": played}


@app.post("/api/game-result", response_model=GameResultOut)
def create_game_result(payload: GameResultIn) -> GameResultOut:
    if payload.game_type not in ("memo", "truth_or_myth", "reaction"):
        raise HTTPException(status_code=400, detail="Недопустимый тип игры")
    try:
        result_id = db.create_game_result(
            payload.registration_id, payload.moves, payload.game_type
        )
    except ValueError as e:
        if str(e) == "already_played":
            raise HTTPException(
                status_code=409,
                detail="Вы уже проходили эту игру. Каждую игру можно сыграть только один раз.",
            )
        raise
    return GameResultOut(id=result_id, **payload.model_dump())


@app.get("/api/stats", response_model=StatsResponse)
def get_stats(game_type: str | None = Query(default=None)) -> StatsResponse:
    if game_type and game_type not in ("memo", "truth_or_myth", "reaction"):
        raise HTTPException(status_code=400, detail="Недопустимый тип игры")
    entries = [
        {
            "registration_id": int(row["registration_id"]),
            "fio": row["fio"],
            "team": row["team"],
            "games_count": int(row["games_count"]),
            "best_moves": int(row["best_moves"]),
            "last_played": row["last_played"],
        }
        for row in db.get_stats(game_type)
    ]
    return StatsResponse(entries=entries)


@app.get("/api/team-stats", response_model=TeamStatsResponse)
def get_team_stats(game_type: str | None = Query(default=None)) -> TeamStatsResponse:
    if game_type and game_type not in ("memo", "truth_or_myth", "reaction"):
        raise HTTPException(status_code=400, detail="Недопустимый тип игры")
    entries = [
        {
            "team": row["team"],
            "games_count": int(row["games_count"]),
            "best_moves": int(row["best_moves"]),
            "last_played": row["last_played"],
        }
        for row in db.get_team_stats(game_type)
    ]
    return TeamStatsResponse(entries=entries)


@app.get("/api/team-total-stats", response_model=TeamTotalStatsResponse)
def get_team_total_stats() -> TeamTotalStatsResponse:
    entries = [
        {
            "team": row["team"],
            "games_played": int(row["games_played"]),
            "total_score": int(row["total_score"]),
            "memo_best": int(row["memo_best"]) if row["memo_best"] is not None else None,
            "truth_or_myth_best": int(row["truth_or_myth_best"]) if row["truth_or_myth_best"] is not None else None,
            "reaction_best": int(row["reaction_best"]) if row["reaction_best"] is not None else None,
        }
        for row in db.get_team_total_standings()
    ]
    return TeamTotalStatsResponse(entries=entries)


@app.get("/api/teams", response_model=TeamListResponse)
def get_teams() -> TeamListResponse:
    entries = [
        {
            "team": row["team"],
            "media_path": row["media_path"],
        }
        for row in db.get_teams()
    ]
    return TeamListResponse(entries=entries)


@app.post("/api/admin/verify")
def admin_verify(payload: AdminVerifyIn) -> dict:
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Неверный пароль")
    return {"ok": True}


@app.get("/api/admin/teams", response_model=TeamListResponse)
def get_admin_teams(_: None = Depends(verify_admin)) -> TeamListResponse:
    entries = [
        {
            "team": row["team"],
            "media_path": row["media_path"],
        }
        for row in db.get_teams()
    ]
    return TeamListResponse(entries=entries)


@app.put("/api/admin/teams/{team_key}", response_model=TeamEntry)
def update_admin_team(
    team_key: str, payload: TeamEntry, _: None = Depends(verify_admin)
) -> TeamEntry:
    if "/" in payload.team or "\\" in payload.team:
        raise HTTPException(status_code=400, detail="Некорректное имя команды")
    try:
        updated = db.update_team(team_key, payload.team, payload.media_path)
    except ValueError:
        raise HTTPException(status_code=409, detail="Команда уже существует")
    if not updated:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return payload


@app.delete("/api/admin/teams/{team_key}")
def delete_admin_team(team_key: str, _: None = Depends(verify_admin)) -> dict:
    deleted = db.delete_team(team_key)
    if not deleted:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return {"status": "deleted"}


@app.post("/api/admin/reset-results")
def reset_admin_results(_: None = Depends(verify_admin)) -> dict:
    deleted = db.reset_all_game_results()
    return {"status": "ok", "deleted_count": deleted}


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


@app.get("/api/admin/questions", response_model=TruthOrMythAdminList)
def get_admin_truth_or_myth_questions(
    _: None = Depends(verify_admin),
) -> TruthOrMythAdminList:
    entries = [
        {
            "id": row["id"],
            "statement": row["statement"],
            "is_true": bool(row["is_true"]),
            "is_active": bool(row["is_active"]),
        }
        for row in db.list_truth_or_myth_questions(include_inactive=True)
    ]
    return TruthOrMythAdminList(entries=entries)


@app.post("/api/admin/questions", response_model=TruthOrMythAdminEntry)
def create_admin_truth_or_myth_question(
    payload: TruthOrMythAdminIn, _: None = Depends(verify_admin)
) -> TruthOrMythAdminEntry:
    question_id = db.create_truth_or_myth_question(
        payload.statement, payload.is_true, payload.is_active
    )
    return TruthOrMythAdminEntry(
        id=question_id,
        statement=payload.statement,
        is_true=payload.is_true,
        is_active=payload.is_active,
    )


@app.put("/api/admin/questions/{question_id}", response_model=TruthOrMythAdminEntry)
def update_admin_truth_or_myth_question(
    question_id: str,
    payload: TruthOrMythAdminIn,
    _: None = Depends(verify_admin),
) -> TruthOrMythAdminEntry:
    updated = db.update_truth_or_myth_question(
        question_id, payload.statement, payload.is_true, payload.is_active
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    return TruthOrMythAdminEntry(
        id=question_id,
        statement=payload.statement,
        is_true=payload.is_true,
        is_active=payload.is_active,
    )


@app.delete("/api/admin/questions/{question_id}")
def delete_admin_truth_or_myth_question(
    question_id: str, _: None = Depends(verify_admin)
) -> dict:
    deleted = db.delete_truth_or_myth_question(question_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    return {"status": "deleted"}


@app.get("/api/admin/videos", response_model=VideoListResponse)
def get_admin_videos(_: None = Depends(verify_admin)) -> VideoListResponse:
    entries: list[VideoEntry] = []
    entries.append(_build_video_entry(DEFAULT_TEAM_KEY, MEDIA_DIR, True))
    for row in db.get_teams():
        team_key = row["team"]
        team_dir = _team_directory(team_key)
        entries.append(_build_video_entry(team_key, team_dir, False))

    return VideoListResponse(entries=entries)


@app.post("/api/admin/videos/{team_key}", response_model=VideoEntry)
async def upload_admin_video(
    team_key: str,
    file: UploadFile = File(...),
    _: None = Depends(verify_admin),
) -> VideoEntry:
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

    if team_key != DEFAULT_TEAM_KEY:
        media_path = f"{team_key}/{target_name}"
        db.upsert_team(team_key, media_path)

    return _build_video_entry(
        team_key, team_dir, is_default=team_key == DEFAULT_TEAM_KEY
    )
