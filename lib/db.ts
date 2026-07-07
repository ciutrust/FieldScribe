import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

// data/ lives at the repo root; both this app and worker/ point at the same file.
export const DATA_DIR = process.env.FIELDSCRIBE_DATA_DIR
  ? path.resolve(process.env.FIELDSCRIBE_DATA_DIR)
  : path.join(process.cwd(), "data");
export const AUDIO_DIR = path.join(DATA_DIR, "audio");
const DB_PATH = path.join(DATA_DIR, "scribe.db");

declare global {
  // Survive Next dev hot reloads without piling up connections.
  var __fieldscribeDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  // WAL + busy timeout: the Next app and the Python worker write concurrently.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  const ddl = fs.readFileSync(path.join(process.cwd(), "db", "ddl.sql"), "utf8");
  sqlite.exec(ddl);
  return drizzle(sqlite, { schema });
}

export const db = globalThis.__fieldscribeDb ?? (globalThis.__fieldscribeDb = createDb());

export function nowIso() {
  return new Date().toISOString();
}

export function audioPath(recordingId: string, ext: string) {
  return path.join(AUDIO_DIR, recordingId, `original.${ext}`);
}
