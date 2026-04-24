import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.summary import (
    SummaryPermissionDeniedError,
    SummaryServiceError,
    is_summary_available,
    summarize_text,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class SummaryRequest(BaseModel):
    text: str = Field(min_length=1, description="Transcript text to summarize")


@router.post("/summary")
def summary_api(req: SummaryRequest):
    if not is_summary_available():
        raise HTTPException(
            status_code=503,
            detail="Summary service is not configured. Set GEMINI_API_KEY.",
        )

    try:
        result = summarize_text(req.text)
    except SummaryPermissionDeniedError as exc:
        logger.warning("Summary access denied: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except SummaryServiceError as exc:
        logger.warning("Summary provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        logger.exception("Summary generation failed: %s", exc)
        raise HTTPException(status_code=502, detail="Summary generation failed.")

    return {"summary": result}
