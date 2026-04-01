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


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _env_csv(name: str, default: str) -> tuple[str, ...]:
    value = os.getenv(name, default)
    items = tuple(item.strip() for item in value.split(",") if item.strip())
    return items or ("*",)


@dataclass(frozen=True)
class ApiSettings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = _env_int("PORT", 5200)
    cors_origins: tuple[str, ...] = _env_csv("CORS_ORIGINS", "*")
    reload: bool = _env_bool("RELOAD", False)


@dataclass(frozen=True)
class FeatureDetectionSettings:
    detector: str = os.getenv("FEATURE_DETECTOR", "orb")
    max_features: int = _env_int("MAX_FEATURES", 800)
    orb_scale_factor: float = _env_float("ORB_SCALE_FACTOR", 1.2)
    orb_n_levels: int = _env_int("ORB_N_LEVELS", 8)
    orb_edge_threshold: int = _env_int("ORB_EDGE_THRESHOLD", 31)
    orb_fast_threshold: int = _env_int("ORB_FAST_THRESHOLD", 20)
    harris_block_size: int = _env_int("HARRIS_BLOCK_SIZE", 2)
    harris_ksize: int = _env_int("HARRIS_KSIZE", 3)
    harris_k: float = _env_float("HARRIS_K", 0.04)
    harris_threshold_ratio: float = _env_float("HARRIS_THRESHOLD_RATIO", 0.01)
    min_keypoints: int = _env_int("MIN_KEYPOINTS", 40)
    nats_url: str = os.getenv("NATS_URL", "")
    frames_subject: str = os.getenv("FRAMES_SUBJECT", "frames.raw")
    features_subject: str = os.getenv("FEATURES_SUBJECT", "features.detected")


def get_api_settings() -> ApiSettings:
    return ApiSettings()


def get_feature_settings() -> FeatureDetectionSettings:
    return FeatureDetectionSettings()
