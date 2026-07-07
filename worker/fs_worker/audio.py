"""ffmpeg/ffprobe helpers: normalize any input to 16 kHz mono WAV for the models."""

import json
import subprocess
from pathlib import Path


class AudioError(Exception):
    pass


def probe_duration(path: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AudioError(f"ffprobe failed: {proc.stderr.strip()[-500:]}")
    try:
        return float(json.loads(proc.stdout)["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        raise AudioError(f"could not read duration: {e}") from e


def to_wav_16k_mono(src: Path, dest: Path) -> Path:
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ar", "16000", "-vn", str(dest)],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AudioError(f"ffmpeg conversion failed: {proc.stderr.strip()[-500:]}")
    return dest
