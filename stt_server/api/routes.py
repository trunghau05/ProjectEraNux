from fastapi import APIRouter
from api.health_routes import router as health_router
from api.stt_routes import router as stt_router
from api.summary_routes import router as summary_router

router = APIRouter(prefix="/api")

# health
router.include_router(health_router, tags=["Health"])

# group STT
router.include_router(stt_router, prefix="/stt", tags=["Speech To Text"])

# group AI (Gemini)
router.include_router(summary_router, prefix="/ai", tags=["AI Processing"])
