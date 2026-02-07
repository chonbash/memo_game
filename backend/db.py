from pathlib import Path
import json
import sqlite3

DB_PATH = Path(__file__).resolve().parent / "app.db"
QUESTIONS_PATH = Path(__file__).resolve().parent / "truth_or_myth_questions.json"


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
            CREATE TABLE IF NOT EXISTS truth_or_myth_questions (
                id TEXT PRIMARY KEY,
                statement TEXT NOT NULL,
                is_true INTEGER NOT NULL
            );
            """
        )
        _seed_truth_or_myth_questions(conn)
        conn.commit()
    finally:
        conn.close()

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
        (item["id"], item["statement"], 1 if item["is_true"] else 0)
        for item in questions
    ]
    conn.executemany(
        "INSERT INTO truth_or_myth_questions (id, statement, is_true) VALUES (?, ?, ?)",
        rows,
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


def get_truth_or_myth_questions(limit: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            SELECT id, statement, is_true
            FROM truth_or_myth_questions
            ORDER BY RANDOM()
            LIMIT ?;
            """,
            (limit,),
        )
        return cursor.fetchall()
    finally:
        conn.close()
