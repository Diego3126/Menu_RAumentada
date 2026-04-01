from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


class FramePoint(BaseModel):
    x: float
    y: float
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)


class FrameFeatureRequest(BaseModel):
    frame_id: str | None = None
    timestamp: datetime | None = None
    image_base64: str
    mime_type: str = Field(default="image/jpeg")
    source: str | None = None
    detector: Literal["orb", "harris"] | None = None

    @field_validator("timestamp")
    @classmethod
    def normalize_timestamp(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class DetectedFeature(BaseModel):
    x: float
    y: float
    size: float = 1.0
    angle: float = 0.0
    response: float = 0.0
    octave: int = 0
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)


class FeatureCloudResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


class FeatureDetectedEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    frame_id: str | None = None
    source: str | None = None
    mime_type: str
    detector: Literal["orb", "harris"]
    image_width: int
    image_height: int
    total_features: int
    keypoints: list[DetectedFeature]
