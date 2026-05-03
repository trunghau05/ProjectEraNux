import logging
import warnings

from core.config import get_gemini_api_key, get_summary_model

logger = logging.getLogger(__name__)

_summary_model = None
_summary_backend = None
_summary_api_key = ""
_summary_model_name = ""
_fallback_notice_logged = False


class SummaryServiceError(RuntimeError):
    pass


class SummaryPermissionDeniedError(SummaryServiceError):
    pass


def is_summary_available():
    return bool(get_gemini_api_key(refresh_local_tokens=True))


def _looks_like_permission_denied(exc):
    text = str(exc or "").lower()
    class_name = exc.__class__.__name__.lower()
    return (
        "permissiondenied" in class_name
        or "statuscode.permission_denied" in text
        or ("403" in text and "denied access" in text)
    )


def _init_google_genai_client(api_key):
    from google import genai

    return genai.Client(api_key=api_key)


def _init_google_generativeai_model(api_key, summary_model):
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            category=FutureWarning,
            message=r"(?s).*All support for the `google\.generativeai` package has ended\..*",
        )
        warnings.filterwarnings(
            "ignore",
            category=FutureWarning,
            message=r"You are using a non-supported Python version.*",
        )
        warnings.filterwarnings(
            "ignore",
            category=FutureWarning,
            message=r"You are using a Python version 3\.9 past its end of life\..*",
        )
        import google.generativeai as genai

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(summary_model)


def _get_model():
    global _summary_model, _summary_backend, _summary_api_key, _summary_model_name, _fallback_notice_logged
    api_key = get_gemini_api_key(refresh_local_tokens=True)
    summary_model = get_summary_model(refresh_local_tokens=True)

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing.")

    if (
        _summary_model is not None
        and _summary_api_key == api_key
        and _summary_model_name == summary_model
    ):
        return _summary_backend, _summary_model, summary_model

    if _summary_model is not None:
        logger.info("Gemini key/model updated. Reinitializing summary client.")

    _summary_model = None
    _summary_backend = None
    _summary_api_key = api_key
    _summary_model_name = summary_model

    try:
        _summary_model = _init_google_genai_client(api_key=api_key)
        _summary_backend = "google.genai"
        return _summary_backend, _summary_model, summary_model
    except Exception as exc:
        if not _fallback_notice_logged:
            logger.info(
                "google.genai is unavailable (%s). Using google.generativeai fallback.",
                exc,
            )
            _fallback_notice_logged = True

    _summary_model = _init_google_generativeai_model(
        api_key=api_key,
        summary_model=summary_model,
    )
    _summary_backend = "google.generativeai"
    return _summary_backend, _summary_model, summary_model


def _extract_text_from_response(response):
    direct = getattr(response, "text", None)
    if isinstance(direct, str):
        direct = direct.strip()
        if direct:
            return direct

    candidates = getattr(response, "candidates", None)
    if not isinstance(candidates, list):
        return ""

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None)
        if not isinstance(parts, list):
            continue

        pieces = []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str):
                stripped = part_text.strip()
                if stripped:
                    pieces.append(stripped)

        merged = " ".join(pieces).strip()
        if merged:
            return merged

    return ""


def summarize_text(text):
    clean_text = (text or "").strip()
    if not clean_text:
        return ""

    prompt = (
        "You are a Vietnamese assistant.\n"
        "Summarize the transcript in Vietnamese.\n"
        "Focus on key points, decisions, and action items.\n"
        "Ignore minor speech-recognition typos.\n"
        "Keep the summary concise.\n\n"
        f"Transcript:\n{clean_text}"
    )

    backend, model, summary_model = _get_model()

    try:
        if backend == "google.genai":
            response = model.models.generate_content(
                model=summary_model,
                contents=prompt,
            )
        else:
            response = model.generate_content(prompt)
    except Exception as exc:
        if _looks_like_permission_denied(exc):
            raise SummaryPermissionDeniedError(
                "Summary provider denied access for the configured project/API key. "
                "Please verify Gemini API key/project permissions."
            ) from exc
        raise SummaryServiceError("Summary provider request failed.") from exc

    summary = _extract_text_from_response(response)

    if not summary:
        logger.warning("Gemini returned an empty summary.")
    return summary
