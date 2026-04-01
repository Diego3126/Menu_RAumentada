from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as feature_router
from app.core.config import get_api_settings
from app.deps import shutdown_services, startup_services

settings = get_api_settings()

app = FastAPI(
    title="feature-detection-service",
    version="1.0.0",
    description="Servicio de deteccion de keypoints para AR",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

if settings.cors_origins == ("*",):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
async def root() -> dict[str, object]:
    return {
        "success": True,
        "service": "feature-detection-service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "detectFeatures": "/api/v1/features/detect",
        },
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "feature-detection-service"}


app.include_router(feature_router, prefix="/api/v1")


@app.on_event("startup")
async def on_startup() -> None:
    await startup_services()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await shutdown_services()
