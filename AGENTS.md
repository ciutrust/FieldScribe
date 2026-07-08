<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FieldScribe

Single-user local transcription + diarization app for AC (Alex). Audio never leaves
this Mac: mlx-whisper (Apple-Silicon GPU) + pyannote run in a local Python worker.
Sibling app to FieldNotes (`/Users/ac/fieldnotes`) — same visual system with
burgundy (`--flare: #c04b5c`) where FieldNotes burns orange.

## Architecture

```
[Next.js app :3000] ←→ [SQLite data/scribe.db + data/audio/] ←→ [worker/ Python poller]
```

- `db/ddl.sql` is the single source of truth for schema — applied idempotently by
  BOTH `lib/db.ts` (Next) and `worker/fs_worker/db.py`. Change schema there first.
- Both processes write SQLite: WAL mode + busy_timeout are load-bearing.
- Pipeline statuses: `queued → converting → transcribing → diarizing → summarizing
  → done | failed`. On worker startup, any mid-pipeline status is requeued.
- The engine is wrapped so a hosted API (AssemblyAI) could replace it without
  touching the app.
- v2 hybrid: `cloud/` (own Next app, Vercel Root Directory=cloud, deployed at
  ac-fieldscribe.vercel.app) reads fs_* tables on FieldNotes' Supabase project;
  `scripts/sync.mjs --watch` (part of `npm run dev`) pushes done recordings up.
- v2.1 remote upload: cloud app uploads audio to private bucket `fs-inbox` +
  `fs_upload_queue` row (row id = future recording id); sync.mjs downloads it,
  inserts a queued local recording, and deletes the cloud object immediately
  after the safe local write. Queue row is deleted when the transcript syncs.

## Stack & conventions

- Next 16 App Router + Tailwind v4 + shadcn/ui, dark-only theme in `app/globals.css`.
  Burgundy is reserved for speaker identity + primary actions; speaker colors come
  from the `--speaker-1..8` ramp (1 = burgundy).
- Data access lives in `lib/queries.ts` / `lib/search.ts`; pure formatting in
  `lib/export.ts` + `lib/format.ts` with vitest coverage (`tests/`).
- Client components must not import `lib/db.ts` or `lib/search.ts` (better-sqlite3
  is Node-only) — shared types/constants go in client-safe modules like
  `lib/search-shared.ts`.
- Worker: uv-managed, Python 3.12 pinned; torch/torchaudio pinned <2.9 for
  pyannote 3.x. Pure merge logic in `fs_worker/merge.py` has pytest coverage.
- Summaries: Claude Haiku via `messages.parse` structured output — best-effort,
  a summary failure never fails the recording.

## Commands

- `npm run dev` — web + worker together (`dev:web` / `worker` for one at a time)
- `npm run test` / `test:worker` / `typecheck` / `lint` / `build`
- `./scripts/make-test-clip.sh` — regenerate the 2-speaker say-voice fixture

## Config (.env at repo root, read by both processes)

- `HF_TOKEN` — required for diarization (gated pyannote models; accept terms for
  speaker-diarization-3.1 AND segmentation-3.0). Worker re-reads .env each poll,
  so pasting a token + clicking Retry works without a restart.
- `ANTHROPIC_API_KEY` — summaries only; app works without it.
- `WHISPER_MODEL` — default `mlx-community/whisper-large-v3-turbo`.
