# FieldScribe

Local transcription with speaker separation — who said what, on your own Mac.

Drop in a meeting recording, voice memo, or call. FieldScribe converts it,
transcribes it with Whisper on the Apple-Silicon GPU, separates the speakers
with pyannote, and (optionally) writes a Claude summary with action items.
Everything stays on this machine except the summary step.

## Run it

```bash
npm run dev        # web UI on :3000 + Python worker
```

## One-time setup

1. **Prereqs** (already on this Mac): Node 20+, `uv`, `ffmpeg`.
2. `npm install` and `cd worker && uv sync`.
3. **HuggingFace token** (required for speaker separation):
   - free account at huggingface.co
   - accept the terms on **both** model pages:
     [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
     and [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
   - create a **read** token at huggingface.co/settings/tokens
   - paste it in `.env` as `HF_TOKEN=hf_…`
4. **Anthropic API key** (optional, for summaries): `.env` → `ANTHROPIC_API_KEY=…`
5. First recording downloads the Whisper model (~1.5 GB) and pyannote models
   (~1 GB with your token) — expect one slow first job.

No restart needed after editing `.env` — the worker picks it up on the next
poll; hit **Retry** on any failed recording.

## What it does

- **Library** — drag-drop upload (m4a/mp3/wav/mp4/webm…), live processing
  status, full-text search across every transcript.
- **Recording page** — diarization timeline (who spoke when — click to seek),
  color-coded transcript synced to the audio player, rename "Speaker 1" → real
  names, summary + action items, Markdown/SRT export.
- ~5–15 min to process a 1-hour file on the M1 Max. $0 per audio-hour.

## Verify

```bash
npm run test           # export formatting (vitest)
npm run test:worker    # word→speaker merge logic (pytest)
./scripts/make-test-clip.sh && open http://localhost:3000   # upload data/test/two-speaker.wav
```
