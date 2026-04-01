# feature-detection-service

Servicio de deteccion de keypoints para AR.

## Funciones

- Recibe un frame en base64
- Detecta puntos con ORB o Harris corners
- Publica un evento `features.detected`
- Puede trabajar con NATS o en memoria para pruebas locales

## Variables de entorno

- `HOST` por defecto `0.0.0.0`
- `PORT` por defecto `5200`
- `FEATURE_DETECTOR` por defecto `orb`
- `MAX_FEATURES` por defecto `800`
- `MIN_KEYPOINTS` por defecto `40`
- `NATS_URL` URL de NATS
- `FRAMES_SUBJECT` por defecto `frames.raw`
- `FEATURES_SUBJECT` por defecto `features.detected`
- `CORS_ORIGINS` lista separada por coma

## Endpoints

- `GET /health`
- `POST /api/v1/features/detect`

## Ejemplo

```json
{
  "frame_id": "frame-001",
  "image_base64": "data:image/jpeg;base64,...",
  "mime_type": "image/jpeg",
  "detector": "orb"
}
```
