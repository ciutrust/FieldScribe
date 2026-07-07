"""Worker configuration. Reads the repo-root .env so the Next app and worker
share one config file."""

import os
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = WORKER_DIR.parent


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(REPO_ROOT / ".env")

DATA_DIR = Path(os.environ.get("FIELDSCRIBE_DATA_DIR", REPO_ROOT / "data")).resolve()
AUDIO_DIR = DATA_DIR / "audio"
DB_PATH = DATA_DIR / "scribe.db"
DDL_PATH = REPO_ROOT / "db" / "ddl.sql"

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")
HF_TOKEN = os.environ.get("HF_TOKEN")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

POLL_SECONDS = float(os.environ.get("WORKER_POLL_SECONDS", "2"))
