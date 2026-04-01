from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as plane_router
from app.core.config import get_api_settings

settings = get_api_settings()

app = FastAPI(
    title="plane-detection-service",
    version="1.0.0",
    description="Servicio de deteccion de planos dominantes para AR",
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "La solicitud contiene errores de validacion",
            "errors": exc.errors(),
        },
    )


@app.get("/")
async def root() -> dict[str, object]:
    return {
        "success": True,
        "service": "plane-detection-service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "detectPlane": "/api/v1/planes/detect",
        },
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "plane-detection-service"}


app.include_router(plane_router, prefix="/api/v1")
