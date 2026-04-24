import os
import importlib
from pathlib import Path
from typing import List

import torch


BASE_DIR = Path(__file__).resolve().parents[1]


def _load_env_file():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue

        key, value = raw.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


_load_env_file()


def _first_non_empty(*values) -> str:
    for value in values:
        raw = str(value or "").strip()
        if raw:
            return raw
    return ""


def _load_local_tokens(refresh: bool = False):
    try:
        from core import local_tokens  # local dev file
        if refresh:
            local_tokens = importlib.reload(local_tokens)
    except Exception:
        return {}

    return {
        "HF_TOKEN": getattr(local_tokens, "HF_TOKEN", ""),
        "GEMINI_API_KEY": getattr(local_tokens, "GEMINI_API_KEY", ""),
        "SUMMARY_MODEL": getattr(local_tokens, "SUMMARY_MODEL", ""),
    }


_LOCAL_TOKENS = _load_local_tokens()


def _resolve_local_tokens(refresh_local_tokens: bool = False):
    if not refresh_local_tokens:
        return _LOCAL_TOKENS

    fresh_tokens = _load_local_tokens(refresh=True)
    return fresh_tokens if fresh_tokens else _LOCAL_TOKENS


def get_hf_token(refresh_local_tokens: bool = False) -> str:
    local_tokens = _resolve_local_tokens(refresh_local_tokens=refresh_local_tokens)
    return _first_non_empty(
        os.getenv("HF_TOKEN"),
        os.getenv("HUGGINGFACE_TOKEN"),
        local_tokens.get("HF_TOKEN"),
    )


def get_gemini_api_key(refresh_local_tokens: bool = False) -> str:
    local_tokens = _resolve_local_tokens(refresh_local_tokens=refresh_local_tokens)
    # Prioritize local_tokens so local key updates are applied consistently.
    return _first_non_empty(
        local_tokens.get("GEMINI_API_KEY"),
        os.getenv("GEMINI_API_KEY"),
        os.getenv("API_KEY"),
    )


def get_summary_model(refresh_local_tokens: bool = False) -> str:
    local_tokens = _resolve_local_tokens(refresh_local_tokens=refresh_local_tokens)
    return _first_non_empty(
        local_tokens.get("SUMMARY_MODEL"),
        os.getenv("SUMMARY_MODEL"),
        "gemini-2.5-flash",
    )


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False
    return default


def _env_csv(name: str, default: List[str]) -> List[str]:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values if values else default


def _resolve_path(path_value: str) -> str:
    path = Path(path_value)
    if not path.is_absolute():
        path = BASE_DIR / path
    return str(path)


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# audio
SAMPLE_RATE = _env_int("SAMPLE_RATE", 16000)
N_MELS = _env_int("N_MELS", 80)
N_FFT = _env_int("N_FFT", 400)
HOP_LENGTH = _env_int("HOP_LENGTH", 160)
MAX_FRAMES = _env_int("MAX_FRAMES", 9000)

# paths
CKPT_PATH = _resolve_path(os.getenv("CKPT_PATH", "modelAI/last.pt"))
VOCAB_PATH = _resolve_path(os.getenv("VOCAB_PATH", "vocab/vocab.txt"))
KENLM_PATH = _resolve_path(os.getenv("KENLM_PATH", "modelAI/lm.binary"))

# LM
LM_ALPHA = _env_float("LM_ALPHA", 5.0)
LM_BETA = _env_float("LM_BETA", 1.6)
BEAM_WIDTH = _env_int("BEAM_WIDTH", 150)

# external tokens
HF_TOKEN = get_hf_token()
DIARIZATION_MODEL = _first_non_empty(
    os.getenv("DIARIZATION_MODEL"),
    "pyannote/speaker-diarization-3.1",
)
DIARIZATION_FALLBACK_MODEL = _first_non_empty(
    os.getenv("DIARIZATION_FALLBACK_MODEL"),
    "pyannote/speaker-diarization",
)
API_KEY = get_gemini_api_key()
SUMMARY_MODEL = get_summary_model()

# CORS
CORS_ALLOWED_ORIGINS = _env_csv(
    "CORS_ALLOWED_ORIGINS",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
)
CORS_ALLOW_CREDENTIALS = _env_bool("CORS_ALLOW_CREDENTIALS", True)
CORS_ALLOWED_METHODS = _env_csv("CORS_ALLOWED_METHODS", ["GET", "POST", "OPTIONS"])
CORS_ALLOWED_HEADERS = _env_csv("CORS_ALLOWED_HEADERS", ["*"])

# request limits
UPLOAD_MAX_SIZE_MB = _env_int("UPLOAD_MAX_SIZE_MB", 50)
UPLOAD_MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MB * 1024 * 1024
REMOTE_AUDIO_MAX_SIZE_MB = _env_int("REMOTE_AUDIO_MAX_SIZE_MB", 50)
REMOTE_AUDIO_MAX_SIZE_BYTES = REMOTE_AUDIO_MAX_SIZE_MB * 1024 * 1024
REMOTE_AUDIO_TIMEOUT_SEC = _env_float("REMOTE_AUDIO_TIMEOUT_SEC", 30.0)

# decoding windows
_safe_sample_rate = SAMPLE_RATE if SAMPLE_RATE > 0 else 16000
MAX_DECODE_WINDOW_SEC = _env_float(
    "MAX_DECODE_WINDOW_SEC",
    (MAX_FRAMES * HOP_LENGTH) / float(_safe_sample_rate),
)

# temp
TEMP_DIR = os.getenv("TEMP_DIR", "").strip()
if TEMP_DIR:
    TEMP_DIR = _resolve_path(TEMP_DIR)
