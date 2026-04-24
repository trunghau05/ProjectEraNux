import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import router
from core.config import (
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOWED_HEADERS,
    CORS_ALLOWED_METHODS,
    CORS_ALLOWED_ORIGINS,
)
from core.loader import load_all

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)
allow_credentials = CORS_ALLOW_CREDENTIALS and "*" not in CORS_ALLOWED_ORIGINS
if CORS_ALLOW_CREDENTIALS and "*" in CORS_ALLOWED_ORIGINS:
    logger.warning(
        "CORS_ALLOW_CREDENTIALS=True is ignored when '*' is used in CORS_ALLOWED_ORIGINS."
    )

app = FastAPI(
    title="STT Backend",
    description="Speech-to-text and summary backend APIs.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=allow_credentials,
    allow_methods=CORS_ALLOWED_METHODS,
    allow_headers=CORS_ALLOWED_HEADERS,
)


@app.on_event("startup")
def startup():
    load_all()
    logger.info("STT backend startup complete")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


@app.get("/")
def root():
    return {"service": "stt-backend", "status": "ok"}


app.include_router(router)
