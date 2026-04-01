from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

try:
    import nats
except Exception:  # pragma: no cover - optional dependency
    nats = None

from app.core.config import FeatureDetectionSettings
from app.schemas import FeatureDetectedEvent
from app.services.feature_detector import encode_feature_event


class FeaturePublisher(Protocol):
    async def publish(self, event: FeatureDetectedEvent) -> None:
        ...

    async def health(self) -> None:
        ...

    async def close(self) -> None:
        ...


@dataclass
class MemoryFeaturePublisher:
    events: list[FeatureDetectedEvent]

    async def publish(self, event: FeatureDetectedEvent) -> None:
        self.events.append(event)

    async def health(self) -> None:
        return None

    async def close(self) -> None:
        return None


@dataclass
class NatsFeaturePublisher:
    client: any
    subject: str

    async def publish(self, event: FeatureDetectedEvent) -> None:
        await self.client.publish(self.subject, encode_feature_event(event))

    async def health(self) -> None:
        if self.client is None or self.client.is_closed:
            raise RuntimeError("NATS no disponible")

    async def close(self) -> None:
        await self.client.close()


async def create_publisher(settings: FeatureDetectionSettings) -> tuple[FeaturePublisher, callable]:
    if not settings.nats_url or nats is None:
        memory = MemoryFeaturePublisher(events=[])
        return memory, memory.close

    client = await nats.connect(settings.nats_url)
    publisher = NatsFeaturePublisher(client=client, subject=settings.features_subject)
    return publisher, publisher.close
