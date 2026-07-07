"""Whisper ASR via mlx-whisper (Apple-Silicon GPU)."""

from pathlib import Path

from .merge import Word


def transcribe(wav_path: Path, model: str) -> tuple[list[Word], str | None]:
    """Returns (words with timestamps, detected language)."""
    import mlx_whisper  # slow import — keep it out of module load

    result = mlx_whisper.transcribe(
        str(wav_path),
        path_or_hf_repo=model,
        word_timestamps=True,
    )
    words: list[Word] = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            words.append(Word(start=float(w["start"]), end=float(w["end"]), text=str(w["word"])))
    return words, result.get("language")
