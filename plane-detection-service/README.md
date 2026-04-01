# plane-detection-service

Servicio de deteccion de planos dominantes para el sistema AR.

## Objetivo

Recibe nubes de puntos 3D generadas por el `slam-service`, ejecuta RANSAC configurable por variables de entorno y publica un plano validado para que `anchor-registry-service` cree anchors persistentes.

## Variables de entorno

- `PORT` puerto HTTP, por defecto `5400`
- `RANSAC_ITERATIONS` numero de iteraciones RANSAC, por defecto `200`
- `RANSAC_DISTANCE_THRESHOLD` distancia maxima de inlier, por defecto `0.015`
- `MIN_PLANE_POINTS` minimo de puntos inlier, por defecto `60`
- `MIN_PLANE_AREA_M2` area minima del plano, por defecto `0.3`
- `MIN_CONFIDENCE` confianza minima, por defecto `0.85`
- `HORIZONTAL_TOLERANCE_DEG` tolerancia para planos horizontales, por defecto `15`
- `VERTICAL_TOLERANCE_DEG` tolerancia para planos verticales, por defecto `15`
- `VOXEL_SIZE_M` voxel para downsample con Open3D, por defecto `0.005`
- `CORS_ORIGINS` lista separada por comas

## Endpoints

- `GET /health`
- `POST /api/v1/planes/detect`

## Ejemplo de request

```json
{
  "frame_id": "frame-123",
  "timestamp": "2026-04-01T12:00:00Z",
  "points": [
    { "x": 0.0, "y": 1.0, "z": 0.0 },
    { "x": 0.5, "y": 1.0, "z": 0.2 },
    { "x": 1.0, "y": 1.0, "z": 0.5 }
  ]
}
```

## Desarrollo local

```bash
cd plane-detection-service
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5400
```
