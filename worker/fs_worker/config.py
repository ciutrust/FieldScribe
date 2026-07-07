"""Worker configuration. Reads the repo-root .env so the Next app and worker
share one config file."""

import os
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = WORKER_DIR.parent


def _load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def refresh() -> None:
    """Re-read .env so a token pasted while the worker runs takes effect on the
    next job — no restart needed. Real environment variables still win."""
    global HF_TOKEN, ANTHROPIC_API_KEY, WHISPER_MODEL
    values = _load_dotenv(REPO_ROOT / ".env")
    get = lambda key, default=None: os.environ.get(key) or values.get(key) or default  # noqa: E731
    HF_TOKEN = get("HF_TOKEN")
    ANTHROPIC_API_KEY = get("ANTHROPIC_API_KEY")
    WHISPER_MODEL = get("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")

_env = _load_dotenv(REPO_ROOT / ".env")
for _k, _v in _env.items():
    os.environ.setdefault(_k, _v)

DATA_DIR = Path(os.environ.get("FIELDSCRIBE_DATA_DIR", REPO_ROOT / "data")).resolve()
AUDIO_DIR = DATA_DIR / "audio"
DB_PATH = DATA_DIR / "scribe.db"
DDL_PATH = REPO_ROOT / "db" / "ddl.sql"

WHISPER_MODEL = "mlx-community/whisper-large-v3-turbo"
HF_TOKEN: str | None = None
ANTHROPIC_API_KEY: str | None = None
refresh()

POLL_SECONDS = float(os.environ.get("WORKER_POLL_SECONDS", "2"))
