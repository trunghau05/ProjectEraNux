import logging
import os
import warnings
from pathlib import Path

warnings.filterwarnings(
    "ignore",
    message=r"Module 'speechbrain\.pretrained' was deprecated, redirecting to 'speechbrain\.inference'\..*",
    category=UserWarning,
)

import huggingface_hub.constants as hf_constants
import speechbrain.utils.fetching as sb_fetching
import torch
from pyannote.audio import Pipeline

from core.config import (
    CKPT_PATH,
    DEVICE,
    DIARIZATION_FALLBACK_MODEL,
    DIARIZATION_MODEL,
    HF_TOKEN,
    KENLM_PATH,
    LM_ALPHA,
    LM_BETA,
    VOCAB_PATH,
)
from model.model import STTModel
from util.decoder_beam import LMScorer

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
LOCAL_CACHE_DIR = BASE_DIR / ".cache"
HF_HOME_DIR = LOCAL_CACHE_DIR / "hf"
TORCH_HOME_DIR = LOCAL_CACHE_DIR / "torch"
HF_HUB_CACHE_DIR = HF_HOME_DIR / "hub"

HF_HUB_CACHE_DIR.mkdir(parents=True, exist_ok=True)
TORCH_HOME_DIR.mkdir(parents=True, exist_ok=True)

# Keep caches inside the project so Windows permissions are predictable.
os.environ["HF_HOME"] = str(HF_HOME_DIR)
os.environ["HUGGINGFACE_HUB_CACHE"] = str(HF_HUB_CACHE_DIR)
os.environ["HF_HUB_CACHE"] = str(HF_HUB_CACHE_DIR)
os.environ["TORCH_HOME"] = str(TORCH_HOME_DIR)
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Override already-imported HF constants as well.
hf_constants.HF_HOME = str(HF_HOME_DIR)
hf_constants.HF_HUB_CACHE = str(HF_HUB_CACHE_DIR)
if hasattr(hf_constants, "default_cache_path"):
    hf_constants.default_cache_path = str(HF_HUB_CACHE_DIR)

# Global singletons.
model = None
lm_scorer = None
pipeline = None
vocab = None
blank_id = None
load_error = None
lm_error = None
diarization_error = None


_original_load = torch.load
_original_sb_fetch = sb_fetching.fetch
_original_link_with_strategy = sb_fetching.link_with_strategy


def patched_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _original_load(*args, **kwargs)


def patched_sb_fetch(*args, **kwargs):
    # Avoid Windows symlink permission errors when SpeechBrain fetches files.
    kwargs.setdefault("local_strategy", sb_fetching.LocalStrategy.COPY)
    kwargs.setdefault("huggingface_cache_dir", str(HF_HUB_CACHE_DIR))
    return _original_sb_fetch(*args, **kwargs)


def patched_link_with_strategy(src, dst, local_strategy):
    # Some call sites still explicitly request SYMLINK on Windows.
    if local_strategy == sb_fetching.LocalStrategy.SYMLINK:
        local_strategy = sb_fetching.LocalStrategy.COPY
    return _original_link_with_strategy(src, dst, local_strategy)


torch.load = patched_load
sb_fetching.fetch = patched_sb_fetch
sb_fetching.link_with_strategy = patched_link_with_strategy


def _reset_stt_runtime():
    global model, lm_scorer, vocab, blank_id
    model = None
    lm_scorer = None
    vocab = None
    blank_id = None


def is_stt_ready():
    return (
        model is not None
        and vocab is not None
        and blank_id is not None
        and load_error is None
    )


def get_runtime_status():
    return {
        "stt_ready": is_stt_ready(),
        "lm_ready": lm_scorer is not None,
        "diarization_ready": pipeline is not None,
        "load_error": load_error,
        "lm_error": lm_error,
        "diarization_error": diarization_error,
        "device": DEVICE,
    }


def _load_diarization_pipeline():
    model_candidates = [DIARIZATION_MODEL]
    if DIARIZATION_FALLBACK_MODEL and DIARIZATION_FALLBACK_MODEL not in model_candidates:
        model_candidates.append(DIARIZATION_FALLBACK_MODEL)

    errors = []
    for model_id in model_candidates:
        try:
            loaded_pipeline = Pipeline.from_pretrained(
                model_id,
                use_auth_token=HF_TOKEN,
                cache_dir=str(HF_HUB_CACHE_DIR),
            )
            if model_id != DIARIZATION_MODEL:
                logger.warning(
                    "Diarization fallback model loaded: '%s' (primary '%s' failed).",
                    model_id,
                    DIARIZATION_MODEL,
                )
            else:
                logger.info("[OK] Diarization loaded | model=%s", model_id)
            return loaded_pipeline
        except Exception as exc:
            errors.append(f"{model_id}: {exc}")
            logger.warning("Diarization model '%s' failed to load: %s", model_id, exc)

    raise RuntimeError("; ".join(errors))


def load_all():
    global model, lm_scorer, pipeline, vocab, blank_id, load_error, lm_error, diarization_error

    load_error = None
    lm_error = None
    diarization_error = None
    _reset_stt_runtime()
    pipeline = None

    try:
        with open(VOCAB_PATH, encoding="utf-8") as vocab_file:
            vocab = [line.rstrip("\n") for line in vocab_file]

        if "<pad>" not in vocab:
            raise ValueError("Vocabulary does not contain '<pad>' token.")

        blank_id = vocab.index("<pad>")

        model = STTModel(vocab_size=len(vocab)).to(DEVICE)
        checkpoint = torch.load(CKPT_PATH, map_location=DEVICE)

        if "model" not in checkpoint:
            raise KeyError("Checkpoint missing key 'model'.")

        model.load_state_dict(checkpoint["model"])
        model.eval()

        logger.info(
            "[OK] STT loaded | epoch=%s | WER=%s | CER=%s",
            checkpoint.get("epoch"),
            checkpoint.get("wer"),
            checkpoint.get("cer"),
        )
    except Exception as exc:
        _reset_stt_runtime()
        load_error = str(exc)
        logger.exception("Failed to load STT runtime: %s", exc)
        return

    try:
        lm_scorer = LMScorer(KENLM_PATH, alpha=LM_ALPHA, beta=LM_BETA)
        logger.info("[OK] KenLM loaded")
    except Exception as exc:
        lm_scorer = None
        lm_error = str(exc)
        logger.warning("KenLM disabled: %s", exc)

    try:
        if not HF_TOKEN:
            raise RuntimeError("HF_TOKEN is not set.")

        pipeline = _load_diarization_pipeline()
    except Exception as exc:
        pipeline = None
        diarization_error = str(exc)
        logger.warning("Diarization disabled: %s", exc)
