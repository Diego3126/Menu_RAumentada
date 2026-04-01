from __future__ import annotations

import numpy as np

from app.core.config import PlaneDetectionSettings
from app.services.plane_detector import PlaneDetectionError, detect_dominant_plane


def _horizontal_plane_points(n: int = 120, noise: float = 0.005) -> np.ndarray:
    rng = np.random.default_rng(7)
    x = rng.uniform(-1.0, 1.0, size=n)
    z = rng.uniform(-0.8, 0.8, size=n)
    y = np.ones(n, dtype=np.float64)
    points = np.column_stack([x, y, z])
    points += rng.normal(0.0, noise, size=points.shape)

    outliers = rng.uniform(-2.0, 2.0, size=(30, 3))
    return np.vstack([points, outliers])


def test_detect_dominant_horizontal_plane():
    settings = PlaneDetectionSettings(
        ransac_iterations=180,
        ransac_distance_threshold=0.03,
        min_plane_points=60,
        min_plane_area_m2=0.25,
        min_confidence=0.7,
        horizontal_tolerance_deg=15.0,
        vertical_tolerance_deg=15.0,
        voxel_size_m=0.0,
        random_seed=11,
        gravity_axis=(0.0, 1.0, 0.0),
    )

    candidate = detect_dominant_plane(_horizontal_plane_points(), settings)

    assert candidate.plane_type == "horizontal"
    assert candidate.inlier_count >= 90
    assert candidate.width > 0.3
    assert candidate.height > 0.3
    assert candidate.confidence >= 0.7


def test_detect_plane_requires_enough_points():
    settings = PlaneDetectionSettings(
        ransac_iterations=20,
        ransac_distance_threshold=0.03,
        min_plane_points=20,
        min_plane_area_m2=0.25,
        min_confidence=0.7,
        horizontal_tolerance_deg=15.0,
        vertical_tolerance_deg=15.0,
        voxel_size_m=0.0,
        random_seed=11,
        gravity_axis=(0.0, 1.0, 0.0),
    )

    too_few_points = np.array([[0.0, 1.0, 0.0], [1.0, 1.0, 0.0], [2.0, 1.0, 0.0]], dtype=np.float64)

    try:
        detect_dominant_plane(too_few_points, settings)
    except PlaneDetectionError as exc:
        assert "al menos" in str(exc)
    else:
        raise AssertionError("Se esperaba PlaneDetectionError")
