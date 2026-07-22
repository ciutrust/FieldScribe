import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";

// Mirrors db/ddl.sql (the DDL file is what actually creates tables).

export const RECORDING_STATUSES = [
  "queued",
  "converting",
  "transcribing",
  "diarizing",
  "summarizing",
  "done",
  "failed",
] as const;
export type RecordingStatus = (typeof RECORDING_STATUSES)[number];

export const recordings = sqliteTable("recordings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  storedExt: text("stored_ext").notNull(),
  durationSec: real("duration_sec"),
  language: text("language"),
  status: text("status").$type<RecordingStatus>().notNull().default("queued"),
  error: text("error"),
  skipSummary: integer("skip_summary").notNull().default(0),
  enhanceAudio: integer("enhance_audio").notNull().default(0),
  forcedLanguage: text("forced_language"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  cloudSyncedAt: text("cloud_synced_at"),
});

export const utterances = sqliteTable(
  "utterances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recordingId: text("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    speakerLabel: text("speaker_label").notNull(),
    startSec: real("start_sec").notNull(),
    endSec: real("end_sec").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("idx_utterances_recording").on(t.recordingId, t.startSec)]
);

export const speakers = sqliteTable(
  "speakers",
  {
    recordingId: text("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    speakerLabel: text("speaker_label").notNull(),
    displayName: text("display_name"),
  },
  (t) => [primaryKey({ columns: [t.recordingId, t.speakerLabel] })]
);

export const summaries = sqliteTable("summaries", {
  recordingId: text("recording_id")
    .primaryKey()
    .references(() => recordings.id, { onDelete: "cascade" }),
  summaryMd: text("summary_md").notNull(),
  actionsJson: text("actions_json").notNull().default("[]"),
  model: text("model").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Recording = typeof recordings.$inferSelect;
export type Utterance = typeof utterances.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type Summary = typeof summaries.$inferSelect;
