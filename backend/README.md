# Backend de autenticacion

Este backend expone dos microservicios:

- `user-service`: administra usuarios y valida credenciales internas.
- `auth-service`: ejecuta el flujo de login, emite JWT y maneja refresh/logout.

## Requisitos

- Node.js 20 o superior.
- Variables de entorno definidas a partir de `.env.example`.

## Instalacion

```bash
cd backend
npm install
```

## Desarrollo

```bash
npm run dev
```

Servicios:

- `http://localhost:4001/health`
- `http://localhost:4002/health`

Credenciales iniciales sugeridas:

- Email: `admin@argastro.com`
- Password: `ChangeMe123!Admin`

## Seguridad

- Hash de contrasenhas con `bcryptjs`.
- JWT de acceso con expiracion corta.
- Refresh token rotado y almacenado con hash.
- CORS restringido al origen del frontend.
- Validacion de entrada con `zod`.
- Limite de peticiones para el endpoint de login.
