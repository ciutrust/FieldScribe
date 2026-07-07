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

export function getUtterances(recordingId: string) {
  return db
    .select()
    .from(utterances)
    .where(eq(utterances.recordingId, recordingId))
    .orderBy(utterances.startSec)
    .all();
}

export function getSpeakers(recordingId: string) {
  return db.select().from(speakers).where(eq(speakers.recordingId, recordingId)).all();
}

export function getSummary(recordingId: string) {
  return db.select().from(summaries).where(eq(summaries.recordingId, recordingId)).get();
}
