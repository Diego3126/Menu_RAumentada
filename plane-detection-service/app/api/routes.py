from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.config import get_plane_detection_settings
from app.schemas import PlaneDetectionRequest, PlaneDetectionResponse
from app.services.plane_detector import PlaneDetectionError, detect_dominant_plane, to_plane_detected_event

router = APIRouter(prefix="/planes", tags=["plane-detection"])


@router.post("/detect", response_model=PlaneDetectionResponse)
async def detect_plane(request: PlaneDetectionRequest) -> PlaneDetectionResponse:
    settings = get_plane_detection_settings()

    try:
        candidate = detect_dominant_plane(request.as_numpy(), settings)
    except PlaneDetectionError as exc:
        return PlaneDetectionResponse(success=False, message=str(exc), data=None)
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado detectando el plano: {exc}",
        ) from exc

    event = to_plane_detected_event(candidate, request.frame_id, len(request.points))
    return PlaneDetectionResponse(
        success=True,
        message="Plano dominante detectado correctamente",
        data=event,
    )
