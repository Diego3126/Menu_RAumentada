from __future__ import annotations

from app.core.config import FeatureDetectionSettings
from app.schemas import FeatureDetectedEvent, FrameFeatureRequest
from app.services.feature_detector import FeatureDetectionError, build_feature_event, decode_image, detect_features
from app.services.publisher import FeaturePublisher


class FeatureDetectionWorker:
    def __init__(self, publisher: FeaturePublisher, settings: FeatureDetectionSettings):
        self.publisher = publisher
        self.settings = settings

    async def process_frame(self, request: FrameFeatureRequest) -> FeatureDetectedEvent:
        image = decode_image(request.image_base64)
        result = detect_features(image, self.settings, request.detector)

        if len(result.features) < self.settings.min_keypoints:
            raise FeatureDetectionError(
                f"Se detectaron solo {len(result.features)} features, menos del minimo configurado {self.settings.min_keypoints}"
            )

        event = build_feature_event(request.frame_id, request.source, request.mime_type, result)
        await self.publisher.publish(event)
        return event
