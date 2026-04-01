from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import base64
import json
from typing import Iterable

import numpy as np

try:
    import cv2
except Exception as exc:  # pragma: no cover - required dependency guard
    raise RuntimeError("opencv-python es requerido para feature-detection-service") from exc

from app.core.config import FeatureDetectionSettings
from app.schemas import DetectedFeature, FeatureDetectedEvent


class FeatureDetectionError(ValueError):
    pass


@dataclass(frozen=True)
class FeatureDetectionResult:
    features: list[DetectedFeature]
    image_width: int
    image_height: int
    detector: str


def decode_image(image_base64: str) -> np.ndarray:
    if not image_base64:
        raise FeatureDetectionError("image_base64 es requerido")

    payload = image_base64
    if "," in payload:
        payload = payload.split(",", 1)[1]

    try:
        raw = base64.b64decode(payload)
    except Exception as exc:
        raise FeatureDetectionError(f"No se pudo decodificar la imagen: {exc}") from exc

    buffer = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise FeatureDetectionError("No se pudo reconstruir la imagen desde el buffer")
    return image


def detect_features(image: np.ndarray, settings: FeatureDetectionSettings, detector_name: str | None = None) -> FeatureDetectionResult:
    if image.ndim not in {2, 3}:
        raise FeatureDetectionError("La imagen debe ser 2D o 3D")

    grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    detector_name = (detector_name or settings.detector).lower()

    if detector_name == "harris":
        return _detect_harris(grayscale, settings)
    return _detect_orb(grayscale, settings)


def _detect_orb(grayscale: np.ndarray, settings: FeatureDetectionSettings) -> FeatureDetectionResult:
    orb = cv2.ORB_create(
        nfeatures=settings.max_features,
        scaleFactor=settings.orb_scale_factor,
        nlevels=settings.orb_n_levels,
        edgeThreshold=settings.orb_edge_threshold,
        fastThreshold=settings.orb_fast_threshold,
    )
    keypoints = orb.detect(grayscale, None)
    keypoints = sorted(keypoints, key=lambda kp: kp.response, reverse=True)[: settings.max_features]

    features = [
        DetectedFeature(
            x=float(kp.pt[0]),
            y=float(kp.pt[1]),
            size=float(kp.size),
            angle=float(kp.angle),
            response=float(kp.response),
            octave=int(kp.octave),
            confidence=_normalize_response(kp.response),
        )
        for kp in keypoints
    ]
    height, width = grayscale.shape[:2]
    return FeatureDetectionResult(features=features, image_width=width, image_height=height, detector="orb")


def _detect_harris(grayscale: np.ndarray, settings: FeatureDetectionSettings) -> FeatureDetectionResult:
    float_image = np.float32(grayscale)
    harris = cv2.cornerHarris(float_image, settings.harris_block_size, settings.harris_ksize, settings.harris_k)
    harris = cv2.dilate(harris, None)

    threshold = settings.harris_threshold_ratio * float(harris.max() if harris.size else 0.0)
    y_coords, x_coords = np.where(harris > threshold)
    responses = harris[y_coords, x_coords]

    order = np.argsort(responses)[::-1][: settings.max_features]
    features = [
        DetectedFeature(
            x=float(x_coords[idx]),
            y=float(y_coords[idx]),
            size=1.0,
            angle=0.0,
            response=float(responses[idx]),
            octave=0,
            confidence=_normalize_response(float(responses[idx])),
        )
        for idx in order
    ]

    height, width = grayscale.shape[:2]
    return FeatureDetectionResult(features=features, image_width=width, image_height=height, detector="harris")


def _normalize_response(response: float) -> float:
    return float(np.clip(abs(response), 0.0, 1.0))


def build_feature_event(frame_id: str | None, source: str | None, mime_type: str, result: FeatureDetectionResult) -> FeatureDetectedEvent:
    return FeatureDetectedEvent(
        frame_id=frame_id,
        source=source,
        mime_type=mime_type,
        detector=result.detector, 
        image_width=result.image_width,
        image_height=result.image_height,
        total_features=len(result.features),
        keypoints=result.features,
    )


def encode_feature_event(event: FeatureDetectedEvent) -> bytes:
    return event.model_dump_json().encode("utf-8")
