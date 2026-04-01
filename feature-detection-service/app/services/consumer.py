from __future__ import annotations

import json
from dataclasses import dataclass

try:
    import nats
except Exception:  # pragma: no cover - optional dependency
    nats = None

from app.core.config import FeatureDetectionSettings
from app.schemas import FrameFeatureRequest
from app.services.publisher import FeaturePublisher
from app.services.worker import FeatureDetectionWorker


@dataclass
class FrameEnvelope:
    topic: str
    schema: str | None
    frame: dict


class NatsFrameConsumer:
    def __init__(self, settings: FeatureDetectionSettings, publisher: FeaturePublisher):
        self.settings = settings
        self.publisher = publisher
        self.client = None
        self.subscription = None
        self.worker = FeatureDetectionWorker(publisher, settings)

    async def start(self) -> None:
        if not self.settings.nats_url or nats is None:
            return

        self.client = await nats.connect(self.settings.nats_url)
        self.subscription = await self.client.subscribe(self.settings.frames_subject, cb=self._on_message)

    async def _on_message(self, message) -> None:
        try:
            payload = json.loads(message.data.decode("utf-8"))
            frame_data = payload.get("frame", {})
            request = FrameFeatureRequest(
                frame_id=frame_data.get("frameId") or frame_data.get("frame_id"),
                timestamp=frame_data.get("timestamp"),
                image_base64=self._extract_image_base64(frame_data),
                mime_type=frame_data.get("mimeType") or frame_data.get("mime_type") or "image/jpeg",
                source=frame_data.get("source"),
            )
            await self.worker.process_frame(request)
        except Exception:
            return

    async def stop(self) -> None:
        if self.client is not None:
            await self.client.close()
            self.client = None
            self.subscription = None

    def _extract_image_base64(self, frame_data: dict) -> str:
        payload = frame_data.get("payload")
        if isinstance(payload, str):
            return payload
        if isinstance(payload, bytes):
            import base64

            return base64.b64encode(payload).decode("utf-8")
        if isinstance(frame_data.get("payloadBase64"), str):
            return frame_data["payloadBase64"]
        return ""
