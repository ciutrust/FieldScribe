"""FieldScribe worker: polls SQLite for queued recordings and runs the pipeline.

Run from worker/: uv run python worker.py
"""

import json
import sys
import time
import traceback

from fs_worker import audio, config, db


def log(*parts) -> None:
    print(f"[worker {time.strftime('%H:%M:%S')}]", *parts, flush=True)


def process(conn, recording) -> None:
    rec_id = recording["id"]
    rec_dir = config.AUDIO_DIR / rec_id
    src = rec_dir / f"original.{recording['stored_ext']}"
    wav = rec_dir / "audio-16k.wav"
    log(f"processing {rec_id} ({recording['original_filename']})")

    # converting (status already set by claim_next)
    enhance = bool(recording["enhance_audio"])
    duration = audio.probe_duration(src)
    audio.to_wav_16k_mono(src, wav, enhance=enhance)
    if enhance:
        log("  distant-audio boost on")
    db.set_metadata(conn, rec_id, duration_sec=duration)

    db.set_status(conn, rec_id, "transcribing")
    from fs_worker import asr  # lazy: mlx import is slow

    words, language = asr.transcribe(wav, config.WHISPER_MODEL)
    db.set_metadata(conn, rec_id, language=language)
    log(f"  transcribed {len(words)} words (language={language})")

    db.set_status(conn, rec_id, "diarizing")
    from fs_worker import diarize, merge

    turns = diarize.diarize(wav, config.HF_TOKEN)
    utterances = merge.merge(words, turns)
    labels = merge.speaker_labels_in_order(utterances)
    db.replace_transcript(conn, rec_id, utterances, labels)
    log(f"  {len(utterances)} utterances across {len(labels)} speakers")

    if not recording["skip_summary"]:
        db.set_status(conn, rec_id, "summarizing")
        from fs_worker import summarize

        try:
            result = summarize.summarize(
                utterances,
                {label: f"Speaker {i + 1}" for i, label in enumerate(labels)},
                config.ANTHROPIC_API_KEY,
            )
        except Exception as e:  # summary is best-effort; the transcript is the product
            traceback.print_exc()
            log(f"  summary failed (transcript kept): {e}")
            result = None
        if result is not None:
            summary_md, actions, model = result
            db.save_summary(conn, rec_id, summary_md, json.dumps(actions), model)
            log("  summary saved")
        elif not config.ANTHROPIC_API_KEY:
            log("  summary skipped (no ANTHROPIC_API_KEY)")

    db.set_status(conn, rec_id, "done")
    log(f"  done {rec_id}")


def main() -> int:
    conn = db.connect()
    requeued = db.requeue_stale(conn)
    if requeued:
        log(f"requeued {requeued} recording(s) from a previous worker run")
    log(f"watching {config.DB_PATH} (model={config.WHISPER_MODEL})")

    while True:
        config.refresh()  # pick up tokens pasted into .env without a restart
        recording = db.claim_next(conn)
        if recording is None:
            time.sleep(config.POLL_SECONDS)
            continue
        try:
            process(conn, recording)
        except Exception as e:  # any failure -> failed status with message, keep looping
            traceback.print_exc()
            db.set_status(conn, recording["id"], "failed", error=f"{type(e).__name__}: {e}"[:1000])
            log(f"  FAILED {recording['id']}: {e}")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("stopped")
        sys.exit(0)
