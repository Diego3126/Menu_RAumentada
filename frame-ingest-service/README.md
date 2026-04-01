# frame-ingest-service

Servicio de baja latencia para capturar frames de cámara desde un cliente móvil y encolarlos en un bus de mensajes.

## Funciones

- Recibe frames por `POST /frames`
- Recibe frames por WebSocket en `/ws/frames`
- Publica frames en NATS con el subject `frames.raw`
- Soporta fallback en memoria si `NATS_URL` no está configurado

## Variables de entorno

- `HOST` por defecto `0.0.0.0`
- `PORT` por defecto `5301`
- `MAX_FRAME_BYTES` por defecto `8388608`
- `NATS_URL` URL de NATS
- `NATS_SUBJECT` por defecto `frames.raw`
- `CORS_ORIGINS` orígenes permitidos separados por coma

## Endpoints

- `GET /health`
- `GET /ready`
- `POST /frames`
- `GET /ws/frames`

## Ejemplo de payload

```json
{
  "frameId": "frame-001",
  "source": "ios",
  "mimeType": "image/jpeg",
  "payloadBase64": "...",
  "sequence": 120,
  "timestamp": "2026-04-01T12:00:00Z"
}
```
