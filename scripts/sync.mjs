// One-way sync: local SQLite (done recordings) -> fs_* tables on the shared
// FieldNotes Supabase project. Signs in as Alex (RLS applies; owner_id fills
// itself via column default — never set here).
//
//   npm run sync          one-shot
//   npm run sync:watch    poll every 60s (runs inside `npm run dev`)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT, "data", "scribe.db");

// Public by design — same committed values as FieldNotes' lib/supabase/config.ts.
const SUPABASE_URL = "https://hnyjoixdfsawuhgdlbad.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Twy7zEQeUG1E7Z4rof8Zlg_eVqqS5T6";

const WATCH = process.argv.includes("--watch");
const POLL_MS = 60_000;

function parseEnvFile(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    values[trimmed.slice(0, i).trim()] = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return values;
}

function resolveCredentials() {
  const local = parseEnvFile(path.join(ROOT, ".env"));
  const email = process.env.FIELDSCRIBE_SYNC_EMAIL ?? local.FIELDSCRIBE_SYNC_EMAIL;
  const password = process.env.FIELDSCRIBE_SYNC_PASSWORD ?? local.FIELDSCRIBE_SYNC_PASSWORD;
  if (email && password) return { email, password };
  // Fallback: same machine, same owner, same Supabase project — reuse the
  // FieldNotes login that scripts/brief.mjs already uses over there.
  const fieldnotes = parseEnvFile("/Users/ac/fieldnotes/.env.local");
  if (fieldnotes.FIELDNOTES_EMAIL && fieldnotes.FIELDNOTES_PASSWORD) {
    return { email: fieldnotes.FIELDNOTES_EMAIL, password: fieldnotes.FIELDNOTES_PASSWORD };
  }
  return null;
}

function log(...parts) {
  console.log(`[sync ${new Date().toLocaleTimeString("en-US", { hour12: false })}]`, ...parts);
}

function dirtyRecordings(db) {
  return db
    .prepare(
      `SELECT * FROM recordings
       WHERE status = 'done' AND (cloud_synced_at IS NULL OR cloud_synced_at < updated_at)
       ORDER BY created_at`
    )
    .all();
}

async function pushRecording(supabase, db, rec) {
  const utterances = db
    .prepare("SELECT * FROM utterances WHERE recording_id = ? ORDER BY start_sec")
    .all(rec.id);
  const speakers = db
    .prepare("SELECT * FROM speakers WHERE recording_id = ? ORDER BY rowid")
    .all(rec.id);
  const summary = db
    .prepare("SELECT * FROM summaries WHERE recording_id = ?")
    .get(rec.id);

  const fail = (step, error) => {
    throw new Error(`${step}: ${error.message}`);
  };

  const { error: recError } = await supabase.from("fs_recordings").upsert(
    {
      id: rec.id,
      title: rec.title,
      original_filename: rec.original_filename,
      duration_sec: rec.duration_sec,
      language: rec.language,
      recorded_at: rec.created_at,
      updated_at: rec.updated_at,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (recError) fail("fs_recordings upsert", recError);

  // Children are replaced wholesale — idempotent for re-syncs after renames.
  for (const table of ["fs_utterances", "fs_speakers"]) {
    const { error } = await supabase.from(table).delete().eq("recording_id", rec.id);
    if (error) fail(`${table} delete`, error);
  }

  if (utterances.length > 0) {
    const { error } = await supabase.from("fs_utterances").insert(
      utterances.map((u) => ({
        recording_id: rec.id,
        speaker_label: u.speaker_label,
        start_sec: u.start_sec,
        end_sec: u.end_sec,
        text: u.text,
      }))
    );
    if (error) fail("fs_utterances insert", error);
  }

  if (speakers.length > 0) {
    const { error } = await supabase.from("fs_speakers").insert(
      speakers.map((s, i) => ({
        recording_id: rec.id,
        speaker_label: s.speaker_label,
        display_name: s.display_name,
        position: i,
      }))
    );
    if (error) fail("fs_speakers insert", error);
  }

  if (summary) {
    let actions = [];
    try {
      actions = JSON.parse(summary.actions_json);
    } catch {
      actions = [];
    }
    const { error } = await supabase.from("fs_summaries").upsert(
      {
        recording_id: rec.id,
        summary_md: summary.summary_md,
        actions,
        model: summary.model,
        created_at: summary.created_at,
      },
      { onConflict: "recording_id" }
    );
    if (error) fail("fs_summaries upsert", error);
  } else {
    const { error } = await supabase.from("fs_summaries").delete().eq("recording_id", rec.id);
    if (error) fail("fs_summaries delete", error);
  }

  // Mark with the value we synced, not now() — a rename during the push stays dirty.
  db.prepare("UPDATE recordings SET cloud_synced_at = ? WHERE id = ?").run(
    rec.updated_at,
    rec.id
  );
}

async function syncOnce(supabase, db) {
  const dirty = dirtyRecordings(db);
  if (dirty.length === 0) return { pushed: 0, failed: 0 };
  let pushed = 0;
  let failed = 0;
  for (const rec of dirty) {
    try {
      await pushRecording(supabase, db, rec);
      pushed += 1;
      log(`pushed "${rec.title}" (${rec.id.slice(0, 8)})`);
    } catch (e) {
      failed += 1;
      log(`FAILED "${rec.title}": ${e.message}`);
    }
  }
  return { pushed, failed };
}

async function main() {
  const credentials = resolveCredentials();
  if (!credentials) {
    log(
      "cloud sync disabled — set FIELDSCRIBE_SYNC_EMAIL / FIELDSCRIBE_SYNC_PASSWORD in .env " +
        "(your FieldNotes login)."
    );
    process.exit(WATCH ? 0 : 1);
  }
  if (!fs.existsSync(DB_PATH)) {
    log("no local database yet — nothing to sync.");
    process.exit(0);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: WATCH },
  });
  const { error: authError } = await supabase.auth.signInWithPassword(credentials);
  if (authError) {
    log(`could not sign in to Supabase: ${authError.message}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { fileMustExist: true });
  db.pragma("busy_timeout = 5000");
  // Self-sufficient bootstrap: the column also gets added by the app/worker,
  // but sync must work against a v1 database directly.
  const cols = db.pragma("table_info(recordings)");
  if (!cols.some((c) => c.name === "cloud_synced_at")) {
    db.exec("ALTER TABLE recordings ADD COLUMN cloud_synced_at TEXT");
  }

  if (!WATCH) {
    const { pushed, failed } = await syncOnce(supabase, db);
    log(`done — ${pushed} pushed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);
  }

  log("watching for finished recordings (60s poll)…");
  for (;;) {
    try {
      await syncOnce(supabase, db);
    } catch (e) {
      log(`sync pass failed: ${e.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main();
