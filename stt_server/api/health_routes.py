from fastapi import APIRouter
from fastapi.responses import JSONResponse

import core.loader as loader
from services.summary import is_summary_available

router = APIRouter()


@router.get("/health/live")
def health_live():
    return {"status": "ok"}


@router.get("/health/ready")
def health_ready():
    runtime = loader.get_runtime_status()
    runtime["summary_ready"] = is_summary_available()

    ready = runtime["stt_ready"]
    if ready:
        return runtime

    return JSONResponse(status_code=503, content=runtime)
