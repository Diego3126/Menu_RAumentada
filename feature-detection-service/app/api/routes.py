from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.config import get_feature_settings
from app.schemas import FeatureCloudResponse, FrameFeatureRequest
from app.services.feature_detector import FeatureDetectionError
from app import deps
from app.services.worker import FeatureDetectionWorker

router = APIRouter(prefix="/features", tags=["feature-detection"])


@router.post("/detect", response_model=FeatureCloudResponse)
async def detect_features_route(request: FrameFeatureRequest) -> FeatureCloudResponse:
    settings = get_feature_settings()
    publisher = deps.publisher
    if publisher is None:
        from app.services.publisher import MemoryFeaturePublisher

        publisher = MemoryFeaturePublisher(events=[])

    worker = FeatureDetectionWorker(publisher, settings)

    try:
        event = await worker.process_frame(request)
    except FeatureDetectionError as exc:
        return FeatureCloudResponse(success=False, message=str(exc), data=None)
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado detectando features: {exc}",
        ) from exc

    return FeatureCloudResponse(
        success=True,
        message="Features detectadas correctamente",
        data=event.model_dump(),
    )
