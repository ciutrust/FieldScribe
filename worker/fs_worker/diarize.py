"""Speaker diarization via pyannote/speaker-diarization-3.1 (gated HF model)."""

from pathlib import Path

from .merge import Turn

_pipeline = None


class DiarizationError(Exception):
    pass


def _get_pipeline(hf_token: str):
    global _pipeline
    if _pipeline is None:
        import torch
        from pyannote.audio import Pipeline

        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1", use_auth_token=hf_token
        )
        if pipeline is None:
            raise DiarizationError(
                "Could not load pyannote/speaker-diarization-3.1 — make sure your HF account "
                "accepted the gated-model terms for speaker-diarization-3.1 AND segmentation-3.0, "
                "and HF_TOKEN in .env is a valid read token."
            )
        if torch.backends.mps.is_available():
            pipeline.to(torch.device("mps"))
        _pipeline = pipeline
    return _pipeline


def diarize(wav_path: Path, hf_token: str | None) -> list[Turn]:
    if not hf_token:
        raise DiarizationError(
            "HF_TOKEN is not set. Create a free HuggingFace account, accept the terms for "
            "pyannote/speaker-diarization-3.1 and pyannote/segmentation-3.0, then put a read "
            "token in .env as HF_TOKEN=hf_…"
        )
    pipeline = _get_pipeline(hf_token)
    annotation = pipeline(str(wav_path))
    turns = [
        Turn(start=float(segment.start), end=float(segment.end), speaker=str(label))
        for segment, _, label in annotation.itertracks(yield_label=True)
    ]
    turns.sort(key=lambda t: t.start)
    return turns
