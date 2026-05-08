Roles y control de acceso

- ADMIN:
  - Puede crear, actualizar y eliminar platos.
  - Puede ver listados administrativos de pedidos.
  - Ruta de login: `Admin` service POST `/api/platos/login` devuelve `{ token, role }`.

- COCINERO:
  - Acceso limitado a funciones de cocina (tareas internas).

Protecciones implementadas:

- Backend (Node):
  - `backend/middleware/auth.js` — decode JWT y expone `authenticateToken` y `requireRole(role)`.
  - Rutas protegidas:
    - `POST /api/platos` — requiere `ADMIN` (ya aplicado en `backend/routes/platos.js`).
    - `PUT/DELETE /api/platos/:id` — requieren `ADMIN`.
    - `GET /api/pedidos/recientes/...` — requiere `ADMIN` (en `backend/routes/pedidos.js`).
    - `POST /api/personalizacion` — ahora requiere autenticación (any authenticated user).

- Admin (Spring Boot):
  - `POST /api/platos/login` — emite JWT con claim `role` (`ADMIN` o `COCINERO`).
  - Endpoints administrativos validan el rol leyendo el token.

Frontend:
- `FrontEnd/login.html` + `FrontEnd/login.js` para iniciar sesión contra el servicio `Admin`.
- Token y rol se guardan en `localStorage` (`authToken`, `authRole`).
- `FrontEnd/script.js` usa `fetchWithAuth` para solicitudes que requieren token y redirige a login en 401/403.

Notas de despliegue:
- Asegurar que `JWT_SECRET` sea el mismo en `Admin` y `backend`.
- Configurar `ALLOWED_ORIGINS` en `backend` para el dominio del frontend.

Si quieres, continúo: 1) restringir más rutas según casos de uso, 2) añadir vistas admin en frontend, 3) pruebas con múltiples usuarios.
