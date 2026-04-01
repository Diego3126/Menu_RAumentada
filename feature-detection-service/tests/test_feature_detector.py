from __future__ import annotations

import base64

import cv2
import numpy as np

from app.core.config import FeatureDetectionSettings
from app.services.feature_detector import decode_image, detect_features


def _make_corner_image() -> bytes:
    image = np.zeros((240, 240, 3), dtype=np.uint8)
    cv2.rectangle(image, (20, 20), (220, 220), (255, 255, 255), thickness=3)
    cv2.line(image, (20, 20), (220, 220), (255, 255, 255), thickness=2)
    cv2.line(image, (220, 20), (20, 220), (255, 255, 255), thickness=2)
    ok, encoded = cv2.imencode('.jpg', image)
    assert ok
    return encoded.tobytes()


def test_decode_image_returns_array():
    raw = _make_corner_image()
    payload = base64.b64encode(raw).decode('utf-8')

    image = decode_image(payload)

    assert image.shape[0] == 240
    assert image.shape[1] == 240


def test_orb_detects_keypoints():
    raw = _make_corner_image()
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    settings = FeatureDetectionSettings(
        detector='orb',
        max_features=200,
        orb_scale_factor=1.2,
        orb_n_levels=8,
        orb_edge_threshold=31,
        orb_fast_threshold=10,
        harris_block_size=2,
        harris_ksize=3,
        harris_k=0.04,
        harris_threshold_ratio=0.01,
        min_keypoints=10,
        nats_url='',
        frames_subject='frames.raw',
        features_subject='features.detected',
    )

    result = detect_features(image, settings, detector_name='orb')

    assert result.detector == 'orb'
    assert len(result.features) > 10


def test_harris_detects_keypoints():
    raw = _make_corner_image()
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    settings = FeatureDetectionSettings(
        detector='harris',
        max_features=200,
        orb_scale_factor=1.2,
        orb_n_levels=8,
        orb_edge_threshold=31,
        orb_fast_threshold=10,
        harris_block_size=2,
        harris_ksize=3,
        harris_k=0.04,
        harris_threshold_ratio=0.01,
        min_keypoints=10,
        nats_url='',
        frames_subject='frames.raw',
        features_subject='features.detected',
    )

    result = detect_features(image, settings, detector_name='harris')

    assert result.detector == 'harris'
    assert len(result.features) > 10
