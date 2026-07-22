import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { recordings, speakers, summaries, utterances } from "@/db/schema";

export type RecordingListItem = Awaited<ReturnType<typeof listRecordings>>[number];

export function listRecordings() {
  return db
    .select({
      id: recordings.id,
      title: recordings.title,
      status: recordings.status,
      error: recordings.error,
      durationSec: recordings.durationSec,
      language: recordings.language,
      createdAt: recordings.createdAt,
      speakerCount: sql<number>`(select count(*) from speakers s where s.recording_id = ${recordings.id})`,
    })
    .from(recordings)
    .orderBy(desc(recordings.createdAt))
    .all();
}

export function getRecording(id: string) {
  return db.select().from(recordings).where(eq(recordings.id, id)).get();
}

/** Neighbors in library order (newest first) for the recording pager.
 * prev = the newer one above; next = the older one below. */
export function getNeighborIds(id: string): { prevId: string | null; nextId: string | null } {
  const ids = db
    .select({ id: recordings.id })
    .from(recordings)
    .orderBy(desc(recordings.createdAt))
    .all()
    .map((r) => r.id);
  const i = ids.indexOf(id);
  return {
    prevId: i > 0 ? ids[i - 1] : null,
    nextId: i >= 0 && i < ids.length - 1 ? ids[i + 1] : null,
  };
}

export function getUtterances(recordingId: string) {
  return db
    .select()
    .from(utterances)
    .where(eq(utterances.recordingId, recordingId))
    .orderBy(utterances.startSec)
    .all();
}

export function getSpeakers(recordingId: string) {
  // rowid order = first-appearance order (the worker inserts speakers as they
  // first speak), so "Speaker 1" is always the first voice heard.
  return db
    .select()
    .from(speakers)
    .where(eq(speakers.recordingId, recordingId))
    .orderBy(sql`rowid`)
    .all();
}

export function getSummary(recordingId: string) {
  return db.select().from(summaries).where(eq(summaries.recordingId, recordingId)).get();
}
