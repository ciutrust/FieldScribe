"""SQLite access for the worker. Mirrors lib/db.ts on the Next side."""

import sqlite3
from datetime import datetime, timezone

from . import config

IN_FLIGHT_STATUSES = ("converting", "transcribing", "diarizing", "summarizing")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def connect() -> sqlite3.Connection:
    config.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(config.DDL_PATH.read_text())
    # Columns added after v1 (SQLite has no ADD COLUMN IF NOT EXISTS).
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(recordings)")}
    if "cloud_synced_at" not in cols:
        conn.execute("ALTER TABLE recordings ADD COLUMN cloud_synced_at TEXT")
    if "enhance_audio" not in cols:
        conn.execute("ALTER TABLE recordings ADD COLUMN enhance_audio INTEGER NOT NULL DEFAULT 0")
    conn.commit()
    return conn


def requeue_stale(conn: sqlite3.Connection) -> int:
    """On startup, anything mid-pipeline belonged to a dead worker run — requeue it."""
    placeholders = ",".join("?" for _ in IN_FLIGHT_STATUSES)
    cur = conn.execute(
        f"UPDATE recordings SET status = 'queued', error = NULL, updated_at = ? "
        f"WHERE status IN ({placeholders})",
        (now_iso(), *IN_FLIGHT_STATUSES),
    )
    conn.commit()
    return cur.rowcount


def claim_next(conn: sqlite3.Connection):
    """Atomically claim the oldest queued recording."""
    cur = conn.execute(
        "UPDATE recordings SET status = 'converting', updated_at = ? "
        "WHERE id = (SELECT id FROM recordings WHERE status = 'queued' "
        "ORDER BY created_at LIMIT 1) RETURNING *",
        (now_iso(),),
    )
    row = cur.fetchone()
    conn.commit()
    return row


def set_status(conn: sqlite3.Connection, recording_id: str, status: str, error: str | None = None) -> None:
    conn.execute(
        "UPDATE recordings SET status = ?, error = ?, updated_at = ? WHERE id = ?",
        (status, error, now_iso(), recording_id),
    )
    conn.commit()


def set_metadata(conn: sqlite3.Connection, recording_id: str, duration_sec: float | None = None, language: str | None = None) -> None:
    if duration_sec is not None:
        conn.execute(
            "UPDATE recordings SET duration_sec = ?, updated_at = ? WHERE id = ?",
            (duration_sec, now_iso(), recording_id),
        )
    if language is not None:
        conn.execute(
            "UPDATE recordings SET language = ?, updated_at = ? WHERE id = ?",
            (language, now_iso(), recording_id),
        )
    conn.commit()


def replace_transcript(conn: sqlite3.Connection, recording_id: str, utterances, speaker_labels) -> None:
    """Write the merged transcript in one transaction. Idempotent for requeues."""
    with conn:
        conn.execute("DELETE FROM utterances WHERE recording_id = ?", (recording_id,))
        conn.execute("DELETE FROM speakers WHERE recording_id = ?", (recording_id,))
        conn.executemany(
            "INSERT INTO utterances (recording_id, speaker_label, start_sec, end_sec, text) "
            "VALUES (?, ?, ?, ?, ?)",
            [(recording_id, u.speaker, u.start, u.end, u.text) for u in utterances],
        )
        conn.executemany(
            "INSERT INTO speakers (recording_id, speaker_label, display_name) VALUES (?, ?, NULL)",
            [(recording_id, label) for label in speaker_labels],
        )


def save_summary(conn: sqlite3.Connection, recording_id: str, summary_md: str, actions_json: str, model: str) -> None:
    with conn:
        conn.execute(
            "INSERT INTO summaries (recording_id, summary_md, actions_json, model, created_at) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(recording_id) DO UPDATE SET summary_md = excluded.summary_md, "
            "actions_json = excluded.actions_json, model = excluded.model, created_at = excluded.created_at",
            (recording_id, summary_md, actions_json, model, now_iso()),
        )
