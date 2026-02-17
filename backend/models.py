from pydantic import BaseModel, Field


class AdminVerifyIn(BaseModel):
    password: str = Field(min_length=1)


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
    game_type: str = "memo"
    moves: int = Field(ge=0, le=5000)  # score: lower is better (moves / level / wrong_answers)


class GameResultOut(BaseModel):
    id: int
    registration_id: int
    game_type: str
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


class TeamTotalEntry(BaseModel):
    team: str
    games_played: int
    total_score: int
    memo_best: int | None = None
    truth_or_myth_best: int | None = None
    reaction_best: int | None = None


class TeamTotalStatsResponse(BaseModel):
    entries: list[TeamTotalEntry]


class TeamEntry(BaseModel):
    team: str = Field(min_length=1, max_length=100)
    media_path: str = Field(min_length=1, max_length=300)


class TeamListResponse(BaseModel):
    entries: list[TeamEntry]
class VideoEntry(BaseModel):
    key: str
    team: str | None
    filename: str | None
    url: str | None
    is_default: bool


class VideoListResponse(BaseModel):
    entries: list[VideoEntry]


class TruthOrMythEntry(BaseModel):
    id: str
    statement: str
    is_true: bool


class TruthOrMythResponse(BaseModel):
    entries: list[TruthOrMythEntry]


class TruthOrMythAdminIn(BaseModel):
    statement: str = Field(min_length=1, max_length=500)
    is_true: bool
    is_active: bool = True


class TruthOrMythAdminEntry(BaseModel):
    id: str
    statement: str
    is_true: bool
    is_active: bool


class TruthOrMythAdminList(BaseModel):
    entries: list[TruthOrMythAdminEntry]


class TrueFalseQuestionIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    answer: bool
    is_active: bool = True


class TrueFalseQuestion(BaseModel):
    id: int
    question: str
    answer: bool
    is_active: bool


class TrueFalseQuestionList(BaseModel):
    entries: list[TrueFalseQuestion]
