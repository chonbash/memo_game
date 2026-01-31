from pathlib import Path
import sqlite3

DB_PATH = Path(__file__).resolve().parent / "app.db"


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
                email TEXT NOT NULL,
                team TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def create_registration(fio: str, email: str, team: str) -> int:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO registrations (fio, email, team) VALUES (?, ?, ?)",
            (fio, email, team),
        )
        conn.commit()
        return int(cursor.lastrowid)
    finally:
        conn.close()
