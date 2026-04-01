# Menu_RAumentada
## Descripción
Aplicación web que permite visualizar el menú de un restaurante y personalizar pedidos con realidad aumentada.

## Tecnologías
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Base de datos:** PostgreSQL (Neon)

## Estado de la arquitectura AR

Los servicios antiguos `ra-service` y `vr-service` fueron eliminados.
El nuevo núcleo de AR empieza con `frame-ingest-service` y `plane-detection-service`.

- `frame-ingest-service`: captura frames desde el cliente y los publica en NATS
- `feature-detection-service`: detecta keypoints ORB/Harris desde frames de cámara
- `plane-detection-service`: procesa nubes de puntos y detecta planos dominantes

Ruta del servicio:
- [frame-ingest-service](frame-ingest-service/README.md)
- [feature-detection-service](feature-detection-service/README.md)
- [plane-detection-service](plane-detection-service/README.md)

## Instalación

### Backend
```bash
cd backend
npm install
# Crear archivo .env con DATABASE_URL
npm start
```

### Fronend
```bash
Abrir http://localhost:3000 en el navegador.
```

## Funcionalidades
- Ver categorías del menú

- Ver listado de platos

- Personalizar pedidos (agregar/eliminar ingredientes)

- Realidad Aumentada (simulación)

## Próximo paso técnico

Reconstruir el flujo completo de AR alrededor de:
- ingestión de frames
- detección de features
- SLAM
- detección de planos
- registro de anchors

## Autor
- Diego Fernando España Valderrama