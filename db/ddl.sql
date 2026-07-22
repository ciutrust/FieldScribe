-- FieldScribe schema. Single source of truth, applied idempotently by both
-- the Next app (lib/db.ts) and the Python worker (worker/fs_worker/db.py).
-- Shapes stay Postgres-friendly (uuid text ids, ISO timestamps) for the
-- future Supabase sync.

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_ext TEXT NOT NULL,
  duration_sec REAL,
  language TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  skip_summary INTEGER NOT NULL DEFAULT 0,
  enhance_audio INTEGER NOT NULL DEFAULT 0,
  forced_language TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  cloud_synced_at TEXT
);

CREATE TABLE IF NOT EXISTS utterances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_utterances_recording
  ON utterances(recording_id, start_sec);

CREATE TABLE IF NOT EXISTS speakers (
  recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,
  display_name TEXT,
  PRIMARY KEY (recording_id, speaker_label)
);

CREATE TABLE IF NOT EXISTS summaries (
  recording_id TEXT PRIMARY KEY REFERENCES recordings(id) ON DELETE CASCADE,
  summary_md TEXT NOT NULL,
  actions_json TEXT NOT NULL DEFAULT '[]',
  model TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS utterances_fts USING fts5(
  text,
  content='utterances',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS utterances_ai AFTER INSERT ON utterances BEGIN
  INSERT INTO utterances_fts(rowid, text) VALUES (new.id, new.text);
END;
CREATE TRIGGER IF NOT EXISTS utterances_ad AFTER DELETE ON utterances BEGIN
  INSERT INTO utterances_fts(utterances_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;
CREATE TRIGGER IF NOT EXISTS utterances_au AFTER UPDATE ON utterances BEGIN
  INSERT INTO utterances_fts(utterances_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO utterances_fts(rowid, text) VALUES (new.id, new.text);
END;
