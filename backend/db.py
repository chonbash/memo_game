from pathlib import Path
import sqlite3

DB_PATH = Path(__file__).resolve().parent / "app.db"
DEFAULT_MEDIA_PATH = "congrats.mp4"
TEAM_SEED = [
    ("Сопровождение ЕПА", DEFAULT_MEDIA_PATH),
    ("Сопровождение ФОСП", DEFAULT_MEDIA_PATH),
    ("Сопровождение ЕПА КИБ/СМБ", DEFAULT_MEDIA_PATH),
    ("Сопровождение УИП", DEFAULT_MEDIA_PATH),
    ("Сопровождение ОСА", "Сопровождение ОСА/congrats.mp4"),
    ("Сопровождение ОСП", DEFAULT_MEDIA_PATH),
    ("Сопровождение ОСКК", DEFAULT_MEDIA_PATH),
    ("Сопровождение ССА", "Сопровождение ССА/congrats.mp4"),
    ("Сопровождение ССП", DEFAULT_MEDIA_PATH),
    ("Сопровождение ССД", DEFAULT_MEDIA_PATH),
    ("Штаб", DEFAULT_MEDIA_PATH),
    ("КУС", "КУС/congrats.MOV"),
]


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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team TEXT NOT NULL UNIQUE,
                media_path TEXT NOT NULL,
                sort_order INTEGER NOT NULL
            );
            """
        )
        _seed_teams(conn)
        conn.commit()
    finally:
        conn.close()


def _seed_teams(conn: sqlite3.Connection) -> None:
    for sort_order, (team, media_path) in enumerate(TEAM_SEED, start=1):
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


def create_game_result(registration_id: int, moves: int) -> int:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO game_results (registration_id, moves) VALUES (?, ?)",
            (registration_id, moves),
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


def get_stats() -> list[sqlite3.Row]:
    conn = get_connection()
    try:
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


def get_team_stats() -> list[sqlite3.Row]:
    conn = get_connection()
    try:
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
