export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null || !isFinite(totalSec)) return "—";
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Timestamp inside a recording, always mm:ss (or h:mm:ss past an hour). */
export function formatClock(sec: number): string {
  return formatDuration(Math.max(0, sec));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Static class lists so Tailwind sees every literal. Index = speaker order. */
export const SPEAKER_TEXT = [
  "text-speaker-1",
  "text-speaker-2",
  "text-speaker-3",
  "text-speaker-4",
  "text-speaker-5",
  "text-speaker-6",
  "text-speaker-7",
  "text-speaker-8",
] as const;

export const SPEAKER_BG = [
  "bg-speaker-1",
  "bg-speaker-2",
  "bg-speaker-3",
  "bg-speaker-4",
  "bg-speaker-5",
  "bg-speaker-6",
  "bg-speaker-7",
  "bg-speaker-8",
] as const;

export function speakerText(index: number) {
  return SPEAKER_TEXT[index % SPEAKER_TEXT.length];
}

export function speakerBg(index: number) {
  return SPEAKER_BG[index % SPEAKER_BG.length];
}

export function defaultSpeakerName(index: number) {
  return `Speaker ${index + 1}`;
}
