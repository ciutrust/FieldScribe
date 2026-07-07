// Client-safe search types + highlight markers (no db import).

// Markers that can't appear in HTML/transcripts — the client splits on these
// instead of rendering HTML from the DB.
export const MARK_OPEN = "⟦";
export const MARK_CLOSE = "⟧";

export type SearchHit = {
  recordingId: string;
  title: string;
  createdAt: string;
  utteranceId: number;
  startSec: number;
  speakerLabel: string;
  snippet: string;
};
