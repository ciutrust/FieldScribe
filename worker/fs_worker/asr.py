"""Whisper ASR via mlx-whisper (Apple-Silicon GPU)."""

from pathlib import Path

from .merge import Word


def transcribe(
    wav_path: Path, model: str, language: str | None = None
) -> tuple[list[Word], str | None]:
    """Returns (words with timestamps, language used).

    language=None auto-detects; pass e.g. "en" to force it. Forcing matters on
    quiet/far-field audio, where auto-detect misfires (e.g. flips to Icelandic)
    and Whisper hallucinates. condition_on_previous_text=False stops it feeding
    its own garbled output back in — the repetition-loop hallucination.
    """
    import mlx_whisper  # slow import — keep it out of module load

    result = mlx_whisper.transcribe(
        str(wav_path),
        path_or_hf_repo=model,
        word_timestamps=True,
        language=language,
        condition_on_previous_text=False,
    )
    words: list[Word] = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            words.append(Word(start=float(w["start"]), end=float(w["end"]), text=str(w["word"])))
    return words, result.get("language")
