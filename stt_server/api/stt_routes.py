import logging
import os
import tempfile
from typing import Optional
from urllib.parse import urlparse

import requests
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl

import core.loader as loader
from core.config import (
    REMOTE_AUDIO_MAX_SIZE_BYTES,
    REMOTE_AUDIO_TIMEOUT_SEC,
    TEMP_DIR,
    UPLOAD_MAX_SIZE_BYTES,
)
from services.pipeline import run_pipeline
from services.summary import (
    SummaryPermissionDeniedError,
    SummaryServiceError,
    is_summary_available,
    summarize_text,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class AudioURLRequest(BaseModel):
    audio_url: HttpUrl


def _safe_remove(path):
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            logger.warning("Could not remove temp file: %s", path)


def _create_temp_audio_path():
    target_dir = TEMP_DIR or None
    if target_dir:
        os.makedirs(target_dir, exist_ok=True)

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".wav",
        dir=target_dir,
    )
    temp_file.close()
    return temp_file.name


def _ensure_stt_ready():
    if loader.is_stt_ready():
        return
    raise HTTPException(
        status_code=503,
        detail=loader.load_error or "STT backend is not ready.",
    )


def _validate_single_input(file, audio_url):
    has_file = file is not None
    has_url = bool((audio_url or "").strip())

    if has_file == has_url:
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one input: either 'file' or 'audio_url'.",
        )


def _normalize_audio_url(audio_url):
    normalized = (audio_url or "").strip()
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(
            status_code=400,
            detail="audio_url must start with http:// or https://",
        )
    return normalized


async def _save_upload_file(upload_file):
    data = await upload_file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > UPLOAD_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Uploaded file is too large.",
        )

    temp_path = _create_temp_audio_path()
    with open(temp_path, "wb") as output_file:
        output_file.write(data)
    return temp_path


def _download_audio(audio_url):
    temp_path = _create_temp_audio_path()
    total_bytes = 0

    try:
        with requests.get(
            audio_url,
            stream=True,
            timeout=REMOTE_AUDIO_TIMEOUT_SEC,
        ) as response:
            response.raise_for_status()

            content_length = response.headers.get("content-length")
            if content_length:
                try:
                    if int(content_length) > REMOTE_AUDIO_MAX_SIZE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="Remote audio file is too large.",
                        )
                except ValueError:
                    pass

            with open(temp_path, "wb") as output_file:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    total_bytes += len(chunk)
                    if total_bytes > REMOTE_AUDIO_MAX_SIZE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="Remote audio file is too large.",
                        )
                    output_file.write(chunk)

        return temp_path
    except HTTPException:
        _safe_remove(temp_path)
        raise
    except requests.RequestException as exc:
        _safe_remove(temp_path)
        raise HTTPException(
            status_code=400,
            detail=f"Unable to download audio_url: {exc}",
        )


def _build_full_text(segments):
    return " ".join(seg.get("text", "") for seg in segments if isinstance(seg, dict)).strip()


def _transcribe_from_path(path):
    segments = run_pipeline(path)
    if not isinstance(segments, list):
        raise RuntimeError("Pipeline must return a list of segments.")
    return segments


def _summarize_with_fallback(full_text):
    clean_text = (full_text or "").strip()
    if not clean_text:
        return "", None

    if not is_summary_available():
        return "", "Summary service is not configured. Set GEMINI_API_KEY."

    try:
        return summarize_text(clean_text), None
    except SummaryPermissionDeniedError as exc:
        logger.warning("Summary provider denied access: %s", exc)
        return "", str(exc)
    except SummaryServiceError as exc:
        logger.warning("Summary provider request failed: %s", exc)
        return "", str(exc)
    except Exception as exc:
        logger.exception("Unexpected summary failure: %s", exc)
        return "", "Summary service is temporarily unavailable."


async def _run_transcription(file=None, audio_url=None):
    _ensure_stt_ready()
    _validate_single_input(file, audio_url)

    temp_path = None
    try:
        if file is not None:
            temp_path = await _save_upload_file(file)
        else:
            temp_path = _download_audio(_normalize_audio_url(audio_url))

        return _transcribe_from_path(temp_path)
    finally:
        _safe_remove(temp_path)


@router.post("/transcribe")
async def transcribe_audio(
    file: Optional[UploadFile] = File(default=None),
    audio_url: Optional[str] = Form(default=None),
):
    try:
        segments = await _run_transcription(file=file, audio_url=audio_url)
        return {"segments": segments}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Transcription failed: %s", exc)
        raise HTTPException(status_code=500, detail="Transcription failed.")


@router.post("/transcribe-url")
async def transcribe_audio_url(req: AudioURLRequest):
    try:
        segments = await _run_transcription(audio_url=str(req.audio_url))
        return {"segments": segments}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Transcription by URL failed: %s", exc)
        raise HTTPException(status_code=500, detail="Transcription failed.")


@router.post("/transcribe-summary")
async def transcribe_and_summary(
    file: Optional[UploadFile] = File(default=None),
    audio_url: Optional[str] = Form(default=None),
):
    try:
        segments = await _run_transcription(file=file, audio_url=audio_url)
        full_text = _build_full_text(segments)
        summary, summary_error = _summarize_with_fallback(full_text)

        response = {
            "segments": segments,
            "full_text": full_text,
            "summary": summary,
        }
        if summary_error:
            response["summary_error"] = summary_error
        return response
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Transcription + summary failed: %s", exc)
        raise HTTPException(status_code=500, detail="Transcription or summary failed.")


@router.post("/transcribe-summary-url")
async def transcribe_and_summary_url(req: AudioURLRequest):
    try:
        segments = await _run_transcription(audio_url=str(req.audio_url))
        full_text = _build_full_text(segments)
        summary, summary_error = _summarize_with_fallback(full_text)

        response = {
            "segments": segments,
            "full_text": full_text,
            "summary": summary,
        }
        if summary_error:
            response["summary_error"] = summary_error
        return response
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Transcription + summary by URL failed: %s", exc)
        raise HTTPException(status_code=500, detail="Transcription or summary failed.")
