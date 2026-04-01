from __future__ import annotations

from dataclasses import dataclass
import os


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return int(value)


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return float(value)


def _env_csv(name: str, default: str) -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class ApiSettings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = _env_int("PORT", 5400)
    reload: bool = os.getenv("RELOAD", "false").lower() == "true"
    cors_origins: tuple[str, ...] = tuple(_env_csv("CORS_ORIGINS", "*"))


@dataclass(frozen=True)
class PlaneDetectionSettings:
    ransac_iterations: int = _env_int("RANSAC_ITERATIONS", 200)
    ransac_distance_threshold: float = _env_float("RANSAC_DISTANCE_THRESHOLD", 0.015)
    min_plane_points: int = _env_int("MIN_PLANE_POINTS", 60)
    min_plane_area_m2: float = _env_float("MIN_PLANE_AREA_M2", 0.3)
    min_confidence: float = _env_float("MIN_CONFIDENCE", 0.85)
    horizontal_tolerance_deg: float = _env_float("HORIZONTAL_TOLERANCE_DEG", 15.0)
    vertical_tolerance_deg: float = _env_float("VERTICAL_TOLERANCE_DEG", 15.0)
    voxel_size_m: float = _env_float("VOXEL_SIZE_M", 0.005)
    random_seed: int = _env_int("RANDOM_SEED", 42)
    gravity_axis: tuple[float, float, float] = (0.0, 1.0, 0.0)


def get_api_settings() -> ApiSettings:
    return ApiSettings()


def get_plane_detection_settings() -> PlaneDetectionSettings:
    return PlaneDetectionSettings()
