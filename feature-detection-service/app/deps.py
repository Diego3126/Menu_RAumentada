from __future__ import annotations

from app.core.config import get_feature_settings
from app.services.publisher import create_publisher
from app.services.consumer import NatsFrameConsumer

settings = get_feature_settings()

publisher = None
consumer = None


async def startup_services() -> None:
    global publisher, consumer
    publisher, _ = await create_publisher(settings)
    consumer = NatsFrameConsumer(settings, publisher)
    await consumer.start()


async def shutdown_services() -> None:
    global publisher, consumer
    if consumer is not None:
        await consumer.stop()
        consumer = None
    if publisher is not None:
        await publisher.close()
        publisher = None
