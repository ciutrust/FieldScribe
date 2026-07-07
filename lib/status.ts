import type { RecordingStatus } from "@/db/schema";

export const ACTIVE_STATUSES: RecordingStatus[] = [
  "queued",
  "converting",
  "transcribing",
  "diarizing",
  "summarizing",
];

export const STATUS_LABEL: Record<RecordingStatus, string> = {
  queued: "queued",
  converting: "converting",
  transcribing: "transcribing",
  diarizing: "separating speakers",
  summarizing: "summarizing",
  done: "done",
  failed: "failed",
};

export function isActive(status: RecordingStatus) {
  return ACTIVE_STATUSES.includes(status);
}
