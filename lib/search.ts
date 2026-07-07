import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { MARK_OPEN, MARK_CLOSE, type SearchHit } from "@/lib/search-shared";

/** Each term quoted so user input can't break FTS5 query syntax. */
function ftsQuery(q: string): string {
  const terms = q.split(/\s+/).filter(Boolean).map((t) => `"${t.replaceAll('"', '""')}"`);
  return terms.join(" ");
}

export function searchTranscripts(q: string): SearchHit[] {
  const match = ftsQuery(q);
  if (!match) return [];
  const rows = db.all<{
    recording_id: string;
    title: string;
    created_at: string;
    utterance_id: number;
    start_sec: number;
    speaker_label: string;
    snippet: string;
  }>(sql`
    SELECT r.id AS recording_id, r.title, r.created_at,
           u.id AS utterance_id, u.start_sec, u.speaker_label,
           snippet(utterances_fts, 0, ${MARK_OPEN}, ${MARK_CLOSE}, '…', 14) AS snippet
    FROM utterances_fts
    JOIN utterances u ON u.id = utterances_fts.rowid
    JOIN recordings r ON r.id = u.recording_id
    WHERE utterances_fts MATCH ${match}
    ORDER BY r.created_at DESC, u.start_sec
    LIMIT 60
  `);
  return rows.map((row) => ({
    recordingId: row.recording_id,
    title: row.title,
    createdAt: row.created_at,
    utteranceId: row.utterance_id,
    startSec: row.start_sec,
    speakerLabel: row.speaker_label,
    snippet: row.snippet,
  }));
}
