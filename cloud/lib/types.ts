// Handwritten row types for the fs_* tables (see supabase/migrations/ in the
// repo root). Small enough that codegen isn't worth the machinery.

export type FsRecording = {
  id: string;
  title: string;
  original_filename: string;
  duration_sec: number | null;
  language: string | null;
  recorded_at: string;
  updated_at: string;
  synced_at: string;
};

export type FsUtterance = {
  id: number;
  recording_id: string;
  speaker_label: string;
  start_sec: number;
  end_sec: number;
  text: string;
};

export type FsSpeaker = {
  recording_id: string;
  speaker_label: string;
  display_name: string | null;
  position: number;
};

export type FsAction = { text: string; owner?: string | null };

export type FsSummary = {
  recording_id: string;
  summary_md: string;
  actions: FsAction[];
  model: string;
  created_at: string;
};

/** Shape returned by the fs_search RPC. */
export type FsSearchHit = {
  recording_id: string;
  title: string;
  recorded_at: string;
  utterance_id: number;
  start_sec: number;
  speaker_label: string;
  snippet: string;
};
