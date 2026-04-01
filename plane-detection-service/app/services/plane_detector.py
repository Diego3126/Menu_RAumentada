from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import acos, degrees
from typing import Iterable
from uuid import uuid4

import numpy as np

try:
    import open3d as o3d
except Exception:  # pragma: no cover - optional dependency fallback
    o3d = None

from app.core.config import PlaneDetectionSettings
from app.schemas import PlaneDetectedEvent, PlaneExtent, Point3D

_EPSILON = 1e-9


class PlaneDetectionError(ValueError):
    pass


@dataclass(frozen=True)
class PlaneCandidate:
    normal: np.ndarray
    offset: float
    centroid: np.ndarray
    width: float
    height: float
    confidence: float
    plane_type: str
    inlier_indices: np.ndarray

    @property
    def inlier_count(self) -> int:
        return int(self.inlier_indices.size)


@dataclass(frozen=True)
class PlanePointCloud:
    points: np.ndarray


def _normalize(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm < _EPSILON:
        raise PlaneDetectionError("No se pudo normalizar el vector del plano")
    return vector / norm


def _fit_plane_from_points(sample_points: np.ndarray) -> tuple[np.ndarray, float]:
    p1, p2, p3 = sample_points
    normal = np.cross(p2 - p1, p3 - p1)
    normal = _normalize(normal)
    offset = -float(np.dot(normal, p1))
    return normal, offset


def _distance_to_plane(points: np.ndarray, normal: np.ndarray, offset: float) -> np.ndarray:
    return np.abs(points @ normal + offset)


def _orthonormal_basis(normal: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    reference = np.array([1.0, 0.0, 0.0], dtype=np.float64)
    if abs(float(np.dot(reference, normal))) > 0.9:
        reference = np.array([0.0, 0.0, 1.0], dtype=np.float64)

    basis_u = np.cross(normal, reference)
    basis_u = _normalize(basis_u)
    basis_v = np.cross(normal, basis_u)
    basis_v = _normalize(basis_v)
    return basis_u, basis_v


def _project_points_to_plane(points: np.ndarray, origin: np.ndarray, normal: np.ndarray) -> tuple[float, float, np.ndarray]:
    basis_u, basis_v = _orthonormal_basis(normal)
    centered = points - origin
    projected_u = centered @ basis_u
    projected_v = centered @ basis_v
    width = float(projected_u.max() - projected_u.min())
    height = float(projected_v.max() - projected_v.min())
    coordinates = np.column_stack([projected_u, projected_v])
    return width, height, coordinates


def _estimate_plane_type(normal: np.ndarray, settings: PlaneDetectionSettings) -> str:
    up = np.array(settings.gravity_axis, dtype=np.float64)
    up = _normalize(up)
    cosine = float(np.clip(abs(np.dot(normal, up)), -1.0, 1.0))
    angle_to_up = degrees(acos(cosine))

    if angle_to_up <= settings.horizontal_tolerance_deg:
        return "horizontal"
    if abs(angle_to_up - 90.0) <= settings.vertical_tolerance_deg:
        return "vertical"
    return "horizontal" if angle_to_up < 45.0 else "vertical"


def _compute_confidence(inlier_ratio: float, area_m2: float, min_area_m2: float) -> float:
    area_score = min(1.0, area_m2 / max(min_area_m2, _EPSILON))
    confidence = 0.65 * inlier_ratio + 0.35 * area_score
    return float(np.clip(confidence, 0.0, 1.0))


def _downsample_points(points: np.ndarray, voxel_size_m: float) -> np.ndarray:
    if voxel_size_m <= 0 or o3d is None or len(points) < 5:
        return points

    point_cloud = o3d.geometry.PointCloud()
    point_cloud.points = o3d.utility.Vector3dVector(points.astype(np.float64))
    downsampled = point_cloud.voxel_down_sample(voxel_size=voxel_size_m)
    if len(downsampled.points) < 3:
        return points
    return np.asarray(downsampled.points, dtype=np.float64)


def _validate_points(points: np.ndarray, settings: PlaneDetectionSettings) -> np.ndarray:
    if points.ndim != 2 or points.shape[1] != 3:
        raise PlaneDetectionError("Los puntos deben tener forma Nx3")
    if points.shape[0] < settings.min_plane_points:
        raise PlaneDetectionError(
            f"Se requieren al menos {settings.min_plane_points} puntos para detectar un plano"
        )
    return points.astype(np.float64)


def _build_candidate(
    points: np.ndarray,
    normal: np.ndarray,
    offset: float,
    inlier_indices: np.ndarray,
    settings: PlaneDetectionSettings,
) -> PlaneCandidate | None:
    inlier_points = points[inlier_indices]
    centroid = inlier_points.mean(axis=0)
    width, height, _ = _project_points_to_plane(inlier_points, centroid, normal)
    area_m2 = width * height

    if area_m2 < settings.min_plane_area_m2:
        return None

    plane_type = _estimate_plane_type(normal, settings)
    confidence = _compute_confidence(inlier_indices.size / points.shape[0], area_m2, settings.min_plane_area_m2)

    if confidence < settings.min_confidence:
        return None

    return PlaneCandidate(
        normal=normal,
        offset=offset,
        centroid=centroid,
        width=width,
        height=height,
        confidence=confidence,
        plane_type=plane_type,
        inlier_indices=inlier_indices,
    )


def detect_dominant_plane(points: Iterable[Iterable[float]] | np.ndarray, settings: PlaneDetectionSettings) -> PlaneCandidate:
    point_array = np.asarray(points, dtype=np.float64)
    point_array = _validate_points(point_array, settings)
    point_array = _downsample_points(point_array, settings.voxel_size_m)

    if point_array.shape[0] < settings.min_plane_points:
        raise PlaneDetectionError("El submuestreo dejo muy pocos puntos para continuar")

    rng = np.random.default_rng(settings.random_seed)
    best_candidate: PlaneCandidate | None = None

    for _ in range(settings.ransac_iterations):
        sample_indices = rng.choice(point_array.shape[0], size=3, replace=False)
        sample_points = point_array[sample_indices]

        try:
            normal, offset = _fit_plane_from_points(sample_points)
        except PlaneDetectionError:
            continue

        distances = _distance_to_plane(point_array, normal, offset)
        inlier_indices = np.flatnonzero(distances <= settings.ransac_distance_threshold)

        if inlier_indices.size < settings.min_plane_points:
            continue

        candidate = _build_candidate(point_array, normal, offset, inlier_indices, settings)
        if candidate is None:
            continue

        if best_candidate is None:
            best_candidate = candidate
            continue

        if candidate.inlier_count > best_candidate.inlier_count:
            best_candidate = candidate
            continue

        if candidate.inlier_count == best_candidate.inlier_count and candidate.confidence > best_candidate.confidence:
            best_candidate = candidate

    if best_candidate is None:
        raise PlaneDetectionError("No se encontro un plano dominante que cumpla los criterios configurados")

    return best_candidate


def to_plane_detected_event(candidate: PlaneCandidate, frame_id: str | None, point_count: int) -> PlaneDetectedEvent:
    return PlaneDetectedEvent(
        id=str(uuid4()),
        timestamp=datetime.now(timezone.utc),
        position=Point3D(x=float(candidate.centroid[0]), y=float(candidate.centroid[1]), z=float(candidate.centroid[2])),
        normal=Point3D(x=float(candidate.normal[0]), y=float(candidate.normal[1]), z=float(candidate.normal[2])),
        extent=PlaneExtent(width=float(candidate.width), height=float(candidate.height)),
        confidence=float(candidate.confidence),
        type=candidate.plane_type,
        frame_id=frame_id,
        inlier_count=candidate.inlier_count,
        point_count=point_count,
    )
