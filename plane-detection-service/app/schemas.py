from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

import numpy as np
from pydantic import BaseModel, Field, field_validator


class Point3D(BaseModel):
    x: float
    y: float
    z: float

    def as_array(self) -> np.ndarray:
        return np.array([self.x, self.y, self.z], dtype=np.float64)


class PlaneExtent(BaseModel):
    width: float = Field(ge=0)
    height: float = Field(ge=0)


class PlaneDetectionRequest(BaseModel):
    frame_id: str | None = None
    timestamp: datetime | None = None
    points: list[Point3D] = Field(min_length=3)

    @field_validator("timestamp")
    @classmethod
    def normalize_timestamp(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def as_numpy(self) -> np.ndarray:
        return np.array([point.as_array() for point in self.points], dtype=np.float64)


class PlaneDetectedEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    position: Point3D
    normal: Point3D
    extent: PlaneExtent
    confidence: float = Field(ge=0.0, le=1.0)
    type: Literal["horizontal", "vertical"]
    frame_id: str | None = None
    inlier_count: int = Field(ge=0)
    point_count: int = Field(ge=0)


class PlaneDetectionResponse(BaseModel):
    success: bool
    message: str
    data: PlaneDetectedEvent | None = None
