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


# Lift faint, far-from-mic speech: high-pass out rumble/wind, then dynamic
# normalization to raise quiet passages without clipping the loud events.
# Chosen after testing on real Ring footage — helps distant audio, and unlike
# heavy denoise it doesn't make Whisper hallucinate in the quiet stretches.
ENHANCE_FILTER = "highpass=f=80,dynaudnorm=f=150:g=15:p=0.9"


def to_wav_16k_mono(src: Path, dest: Path, enhance: bool = False) -> Path:
    cmd = ["ffmpeg", "-y", "-i", str(src)]
    if enhance:
        cmd += ["-af", ENHANCE_FILTER]
    cmd += ["-ac", "1", "-ar", "16000", "-vn", str(dest)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise AudioError(f"ffmpeg conversion failed: {proc.stderr.strip()[-500:]}")
    return dest
