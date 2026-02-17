from pathlib import Path
from uuid import uuid4
import json
import sqlite3

DB_PATH = Path(__file__).resolve().parent / "app.db"
QUESTIONS_PATH = Path(__file__).resolve().parent / "truth_or_myth_questions.json"
MEDIA_DIR = Path(__file__).resolve().parent / "media"
TEAM_VIDEO_BASENAME = "congrats"
def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fio TEXT NOT NULL,
                team TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS game_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id INTEGER NOT NULL,
                moves INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        _ensure_game_results_game_type(conn)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team TEXT NOT NULL UNIQUE,
                media_path TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS truth_or_myth_questions (
                id TEXT PRIMARY KEY,
                statement TEXT NOT NULL,
                is_true INTEGER NOT NULL
            );
            """
        )
        _ensure_truth_or_myth_active_column(conn)
        _seed_truth_or_myth_questions(conn)
        _seed_teams(conn)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS true_false_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def _seed_teams(conn: sqlite3.Connection) -> None:
    if not MEDIA_DIR.exists():
        return

    team_dirs = [item for item in MEDIA_DIR.iterdir() if item.is_dir()]
    team_dirs.sort(key=lambda path: path.name.lower())

    for sort_order, team_dir in enumerate(team_dirs, start=1):
        candidates = sorted(team_dir.glob(f"{TEAM_VIDEO_BASENAME}.*"))
        media_path = ""
        for candidate in candidates:
            if candidate.is_file():
                media_path = f"{team_dir.name}/{candidate.name}"
                break
        if not media_path:
            media_path = f"{team_dir.name}/{TEAM_VIDEO_BASENAME}.mp4"
        conn.execute(
            """
            INSERT INTO teams (team, media_path, sort_order)
            VALUES (?, ?, ?)
            ON CONFLICT(team) DO UPDATE SET
                media_path = excluded.media_path,
                sort_order = excluded.sort_order;
            """,
            (team_dir.name, media_path, sort_order),
        )


def _seed_truth_or_myth_questions(conn: sqlite3.Connection) -> None:
    cursor = conn.execute("SELECT COUNT(1) AS count FROM truth_or_myth_questions;")
    row = cursor.fetchone()
    if row and int(row["count"]) > 0:
        return
    if not QUESTIONS_PATH.exists():
        return
    with QUESTIONS_PATH.open(encoding="utf-8") as file:
        questions = json.load(file)
    if not questions:
        return
    rows = [
        (item["id"], item["statement"], 1 if item["is_true"] else 0, 1)
        for item in questions
    ]
    conn.executemany(
        """
        INSERT INTO truth_or_myth_questions (id, statement, is_true, is_active)
        VALUES (?, ?, ?, ?)
        """,
        rows,
    )


def _truth_or_myth_has_is_active(conn: sqlite3.Connection) -> bool:
    cursor = conn.execute("PRAGMA table_info(truth_or_myth_questions);")
    return any(row["name"] == "is_active" for row in cursor.fetchall())


def _ensure_truth_or_myth_active_column(conn: sqlite3.Connection) -> None:
    if _truth_or_myth_has_is_active(conn):
        return
    conn.execute(
        """
        ALTER TABLE truth_or_myth_questions
        ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
        """
    )

def _game_results_has_game_type(conn: sqlite3.Connection) -> bool:
    cursor = conn.execute("PRAGMA table_info(game_results);")
    return any(row["name"] == "game_type" for row in cursor.fetchall())


def _ensure_game_results_game_type(conn: sqlite3.Connection) -> None:
    if _game_results_has_game_type(conn):
        return
    conn.execute(
        """
        ALTER TABLE game_results ADD COLUMN game_type TEXT NOT NULL DEFAULT 'memo';
        """
    )
    # Keep one result per registration (earliest) before unique index
    conn.execute(
        """
        DELETE FROM game_results
        WHERE id NOT IN (
            SELECT MIN(id) FROM game_results GROUP BY registration_id
        );
        """
    )
    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_game_results_reg_game
        ON game_results(registration_id, game_type);
        """
    )


def _registration_has_email(conn: sqlite3.Connection) -> bool:
    cursor = conn.execute("PRAGMA table_info(registrations);")
    return any(row["name"] == "email" for row in cursor.fetchall())


def create_registration(fio: str, team: str, email: str | None = None) -> int:
    conn = get_connection()
    try:
        if _registration_has_email(conn):
            cursor = conn.execute(
                "INSERT INTO registrations (fio, email, team) VALUES (?, ?, ?)",
                (fio, email or "", team),
            )
        else:
            cursor = conn.execute(
                "INSERT INTO registrations (fio, team) VALUES (?, ?)",
                (fio, team),
            )
        conn.commit()
        return int(cursor.lastrowid)
    finally:
        conn.close()


def has_played_game(registration_id: int, game_type: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "SELECT 1 FROM game_results WHERE registration_id = ? AND game_type = ?",
            (registration_id, game_type),
        )
        return cursor.fetchone() is not None
    finally:
        conn.close()


def get_played_games(registration_id: int) -> list[str]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "SELECT game_type FROM game_results WHERE registration_id = ?",
            (registration_id,),
        )
        return [row["game_type"] for row in cursor.fetchall()]
    finally:
        conn.close()


def create_game_result(registration_id: int, moves: int, game_type: str = "memo") -> int:
    conn = get_connection()
    try:
        if has_played_game(registration_id, game_type):
            raise ValueError("already_played")
        cursor = conn.execute(
            "INSERT INTO game_results (registration_id, game_type, moves) VALUES (?, ?, ?)",
            (registration_id, game_type, moves),
        )
        conn.commit()
        return int(cursor.lastrowid)
    finally:
        conn.close()


def get_teams() -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT team, media_path
            FROM teams
            ORDER BY sort_order ASC, team COLLATE NOCASE ASC;
            """
        )
        return cursor.fetchall()
    finally:
        conn.close()


def upsert_team(team: str, media_path: str) -> None:
    conn = get_connection()
    try:
        cursor = conn.execute("SELECT sort_order FROM teams WHERE team = ?;", (team,))
        row = cursor.fetchone()
        if row:
            sort_order = int(row["sort_order"])
        else:
            cursor = conn.execute(
                "SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM teams;"
            )
            max_row = cursor.fetchone()
            sort_order = int(max_row["max_order"]) + 1 if max_row else 1
        conn.execute(
            """
            INSERT INTO teams (team, media_path, sort_order)
            VALUES (?, ?, ?)
            ON CONFLICT(team) DO UPDATE SET
                media_path = excluded.media_path,
                sort_order = excluded.sort_order;
            """,
            (team, media_path, sort_order),
        )
        conn.commit()
    finally:
        conn.close()


def update_team(old_team: str, new_team: str, media_path: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("SELECT id FROM teams WHERE team = ?;", (old_team,))
        row = cursor.fetchone()
        if not row:
            return False
        if new_team != old_team:
            conflict = conn.execute(
                "SELECT 1 FROM teams WHERE team = ?;", (new_team,)
            ).fetchone()
            if conflict:
                raise ValueError("team_exists")
        conn.execute(
            "UPDATE teams SET team = ?, media_path = ? WHERE team = ?;",
            (new_team, media_path, old_team),
        )
        if new_team != old_team:
            conn.execute(
                "UPDATE registrations SET team = ? WHERE team = ?;",
                (new_team, old_team),
            )
        conn.commit()
        return True
    finally:
        conn.close()


def delete_team(team: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM teams WHERE team = ?;", (team,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_stats(game_type: str | None = None) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        if game_type:
            cursor = conn.execute(
                """
                SELECT
                    r.id AS registration_id,
                    r.fio AS fio,
                    r.team AS team,
                    COUNT(gr.id) AS games_count,
                    MIN(gr.moves) AS best_moves,
                    MAX(gr.created_at) AS last_played
                FROM registrations r
                JOIN game_results gr ON gr.registration_id = r.id AND gr.game_type = ?
                GROUP BY r.id
                ORDER BY best_moves ASC, games_count DESC, last_played DESC, fio COLLATE NOCASE ASC;
                """,
                (game_type,),
            )
        else:
            cursor = conn.execute(
                """
                SELECT
                    r.id AS registration_id,
                    r.fio AS fio,
                    r.team AS team,
                    COUNT(gr.id) AS games_count,
                    MIN(gr.moves) AS best_moves,
                    MAX(gr.created_at) AS last_played
                FROM registrations r
                JOIN game_results gr ON gr.registration_id = r.id
                GROUP BY r.id
                ORDER BY best_moves ASC, games_count DESC, last_played DESC, fio COLLATE NOCASE ASC;
                """
            )
        return cursor.fetchall()
    finally:
        conn.close()


def get_team_stats(game_type: str | None = None) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        if game_type:
            cursor = conn.execute(
                """
                SELECT
                    r.team AS team,
                    COUNT(gr.id) AS games_count,
                    MIN(gr.moves) AS best_moves,
                    MAX(gr.created_at) AS last_played
                FROM registrations r
                JOIN game_results gr ON gr.registration_id = r.id AND gr.game_type = ?
                GROUP BY r.team
                ORDER BY best_moves ASC, games_count DESC, last_played DESC, team COLLATE NOCASE ASC;
                """,
                (game_type,),
            )
        else:
            cursor = conn.execute(
                """
                SELECT
                    r.team AS team,
                    COUNT(gr.id) AS games_count,
                    MIN(gr.moves) AS best_moves,
                    MAX(gr.created_at) AS last_played
                FROM registrations r
                JOIN game_results gr ON gr.registration_id = r.id
                GROUP BY r.team
                ORDER BY best_moves ASC, games_count DESC, last_played DESC, team COLLATE NOCASE ASC;
                """
            )
        return cursor.fetchall()
    finally:
        conn.close()


def get_team_total_standings() -> list[sqlite3.Row]:
    """Командный зачёт: 1) больше игр — лучше, 2) при равенстве — меньше сумма очков лучше."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            WITH by_team_game AS (
                SELECT r.team, gr.game_type, MIN(gr.moves) AS best_moves
                FROM registrations r
                JOIN game_results gr ON gr.registration_id = r.id
                GROUP BY r.team, gr.game_type
            )
            SELECT
                team,
                COUNT(*) AS games_played,
                SUM(best_moves) AS total_score,
                MAX(CASE WHEN game_type = 'memo' THEN best_moves END) AS memo_best,
                MAX(CASE WHEN game_type = 'truth_or_myth' THEN best_moves END) AS truth_or_myth_best,
                MAX(CASE WHEN game_type = 'reaction' THEN best_moves END) AS reaction_best
            FROM by_team_game
            GROUP BY team
            ORDER BY games_played DESC, total_score ASC, team COLLATE NOCASE ASC;
            """
        )
        return cursor.fetchall()
    finally:
        conn.close()


def reset_all_game_results() -> int:
    """Delete all rows from game_results. Returns number of deleted rows."""
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM game_results;")
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()


def get_truth_or_myth_questions(limit: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT id, statement, is_true
            FROM truth_or_myth_questions
            WHERE is_active = 1
            ORDER BY RANDOM()
            LIMIT ?;
            """,
            (limit,),
        )
        return cursor.fetchall()
    finally:
        conn.close()


def list_truth_or_myth_questions(
    include_inactive: bool = True,
) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        query = """
            SELECT id, statement, is_true, is_active
            FROM truth_or_myth_questions
        """
        if not include_inactive:
            query += " WHERE is_active = 1"
        query += " ORDER BY id ASC;"
        cursor = conn.execute(query)
        return cursor.fetchall()
    finally:
        conn.close()


def create_truth_or_myth_question(
    statement: str, is_true: bool, is_active: bool
) -> str:
    conn = get_connection()
    try:
        question_id = uuid4().hex
        conn.execute(
            """
            INSERT INTO truth_or_myth_questions (id, statement, is_true, is_active)
            VALUES (?, ?, ?, ?);
            """,
            (question_id, statement, int(is_true), int(is_active)),
        )
        conn.commit()
        return question_id
    finally:
        conn.close()


def update_truth_or_myth_question(
    question_id: str, statement: str, is_true: bool, is_active: bool
) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE truth_or_myth_questions
            SET statement = ?, is_true = ?, is_active = ?
            WHERE id = ?;
            """,
            (statement, int(is_true), int(is_active), question_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def delete_truth_or_myth_question(question_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM truth_or_myth_questions WHERE id = ?;",
            (question_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def list_true_false_questions(include_inactive: bool = True) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        query = """
            SELECT id, question, answer, is_active
            FROM true_false_questions
        """
        params: tuple = ()
        if not include_inactive:
            query += " WHERE is_active = 1"
        query += " ORDER BY id ASC;"
        cursor = conn.execute(query, params)
        return cursor.fetchall()
    finally:
        conn.close()


def get_true_false_question(question_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT id, question, answer, is_active
            FROM true_false_questions
            WHERE id = ?;
            """,
            (question_id,),
        )
        return cursor.fetchone()
    finally:
        conn.close()


def create_true_false_question(question: str, answer: bool, is_active: bool) -> int:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO true_false_questions (question, answer, is_active)
            VALUES (?, ?, ?);
            """,
            (question, int(answer), int(is_active)),
        )
        conn.commit()
        return int(cursor.lastrowid)
    finally:
        conn.close()


def update_true_false_question(
    question_id: int, question: str, answer: bool, is_active: bool
) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            UPDATE true_false_questions
            SET question = ?, answer = ?, is_active = ?, updated_at = datetime('now')
            WHERE id = ?;
            """,
            (question, int(answer), int(is_active), question_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def delete_true_false_question(question_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM true_false_questions WHERE id = ?;",
            (question_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
