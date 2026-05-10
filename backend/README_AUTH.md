Backend: cómo probar autenticación y control por roles

1) Instalar dependencias (desde `backend`):

```bash
cd backend
npm install
```

2) Variables necesarias:
- `JWT_SECRET`: debe coincidir con la `jwt.secret` usada por el servicio `Admin`. Ejemplo seguro: una cadena aleatoria de al menos 32 caracteres.

- `ALLOWED_ORIGINS` (opcional): orígenes permitidos por CORS, separado por comas. Por defecto: `http://localhost:8080,http://localhost:3000`.

3) Arrancar servicios:

```bash
# En Admin (Spring Boot)
mvn spring-boot:run -Djwt.secret=your_long_secret_here

# En backend (Node)
export JWT_SECRET=your_long_secret_here  # Windows PowerShell: $env:JWT_SECRET = 'your_long_secret_here'
npm run start
```

4) Probar login y obtener token:

```bash
curl -X POST "http://localhost:8080/api/platos/login" -d "usuario=admin&password=1234"
# Respuesta JSON: { "token": "<JWT>", "role": "ADMIN" }
```

5) Usar token para crear un plato (solo ADMIN):

```bash
curl -X POST "http://localhost:3000/api/platos" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Prueba","descripcion":"desc","precio":10.5,"categoria":"principal"}'
```

7) Si usas navegadores: configura `ALLOWED_ORIGINS` en el backend para incluir el origen del frontend.

6) Errores esperados:
- 401: token faltante
- 403: token inválido o rol insuficiente
