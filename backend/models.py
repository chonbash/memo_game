from pydantic import BaseModel, Field


class RegistrationIn(BaseModel):
    fio: str = Field(min_length=2, max_length=200)
    team: str = Field(min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=200)


class RegistrationOut(BaseModel):
    id: int
    fio: str
    team: str


class GameResultIn(BaseModel):
    registration_id: int = Field(gt=0)
    moves: int = Field(gt=0, le=5000)


class GameResultOut(BaseModel):
    id: int
    registration_id: int
    moves: int


class StatsEntry(BaseModel):
    registration_id: int
    fio: str
    team: str
    games_count: int
    best_moves: int
    last_played: str


class StatsResponse(BaseModel):
    entries: list[StatsEntry]


class TeamStatsEntry(BaseModel):
    team: str
    games_count: int
    best_moves: int
    last_played: str


class TeamStatsResponse(BaseModel):
    entries: list[TeamStatsEntry]


class TruthOrMythQuestion(BaseModel):
    id: str
    statement: str
    is_true: bool


class TruthOrMythResponse(BaseModel):
    entries: list[TruthOrMythQuestion]
