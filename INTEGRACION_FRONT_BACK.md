# Revisión de integración Frontend ↔ Backend

**Frontend:** [https://dnsh-evaluator.vercel.app/](https://dnsh-evaluator.vercel.app/) (Vercel)  
**Backend:** https://dnsh-evaluator-production.up.railway.app (Railway)

---

## 1. Configuración comprobada

### Frontend (Vercel)

| Variable | Valor | Uso |
|----------|--------|-----|
| `VITE_USE_API` | `true` | Activa llamadas al API |
| `VITE_API_URL` | `https://dnsh-evaluator-production.up.railway.app/api/v1` | Base de todas las rutas REST |
| `VITE_SOCKET_URL` | `https://dnsh-evaluator-production.up.railway.app` | Socket.IO (sin `/api/v1`) |

- El cliente API (`src/services/api.ts`) usa `VITE_API_URL` y añade el path (ej. `/auth/login` → `.../api/v1/auth/login`).
- Socket.IO usa `VITE_SOCKET_URL` y envía `auth: { token }` en el handshake; el backend valida ese token.

### Backend (Railway)

| Variable | Valor | Uso |
|----------|--------|-----|
| `CORS_ORIGIN` | `https://dnsh-evaluator.vercel.app` | Origen permitido (CORS y Socket.IO) |
| `JWT_SECRET` | (secreto seguro) | Firmar/verificar JWT |
| `DATABASE_URL` | (PostgreSQL) | Generada por Railway al añadir PostgreSQL |
| `PORT` | 3000 (según Railway) | Railway asigna; no hace falta ponerlo si ya lo inyectan |

- CORS y Socket.IO leen `CORS_ORIGIN`; si falta, por defecto solo localhost.
- Rutas bajo `API_PREFIX` = `/api/v1` (o `process.env.API_PREFIX`).

---

## 2. Rutas y contratos

### Auth

| Frontend llama | Backend ruta | Contrato |
|----------------|--------------|----------|
| `POST /auth/login` | `POST /api/v1/auth/login` | Body: `{ email, password }` → `{ user, token, refreshToken }` |
| `POST /auth/register` | `POST /api/v1/auth/register` | Body: `{ email, password, name }` → `{ user, token, refreshToken }` |
| `POST /auth/google` | `POST /api/v1/auth/google` | Body: `{ credential, domain? }` → `{ user, token, refreshToken }` |
| `POST /auth/refresh` | `POST /api/v1/auth/refresh` | Body: `{ refreshToken }` → `{ token, user }` |
| `GET /auth/me` | `GET /api/v1/auth/me` | Header `Authorization: Bearer <token>` → `{ user }` |
| `POST /auth/logout` | `POST /api/v1/auth/logout` | Opcional body `{ refreshToken }` |

- Tras login/register/Google, el front guarda el token y llama a `socketService.connect(token)`.

### Datos

| Frontend llama | Backend ruta | Notas |
|----------------|--------------|--------|
| `GET /operations?limit=1000` | `GET /api/v1/operations` | Lista sin `assets`; el front pide detalle con `GET /operations/:id` al seleccionar. |
| `GET /operations/:id` | `GET /api/v1/operations/:id` | Incluye `assets` y `evidenceDocuments`. |
| `GET /clients` | `GET /api/v1/clients` | Respuesta `{ clients }`. |
| Resto (assets, evaluations, evidence, comments, etc.) | Mismo prefijo `/api/v1/...` | Según `src/services/api.ts`. |

- El backend devuelve campos en snake_case (p. ej. `client_id`, `sector_nace`). El front usa `utils/apiTransformers.ts` (transformApiOperation, transformApiClient, transformApiAsset) para normalizar a camelCase.

### Socket.IO

| Evento (front → back) | Evento (back → front) |
|----------------------|------------------------|
| `auth: { token }` en handshake | - |
| `users:get-list` | `users:list` con `{ users }` |
| `user:update-presence` | - |
| `join:operation`, `leave:operation` | - |
| `join:asset`, `leave:asset` | - |
| - | `user:online`, `user:offline`, `user:update` |

- Sin token válido en el handshake, el backend rechaza la conexión Socket.IO.

---

## 3. Roles y permisos

- Backend crea usuarios con rol `Evaluator` (registro y Google). El frontend incluye `Evaluator` en `UserRole` y en `getPermissionsForRole()` con los mismos permisos que `Analyst`, para que la app no deje sin permisos a los usuarios del API.

---

## 4. Comportamiento del frontend con el API

- **Listado de operaciones:** `getAllOperations()` → `GET /operations`; las operaciones no traen `assets`. Al seleccionar una operación, el front hace `getOperation(selectedOperationId)` y actualiza el estado con la operación completa (con `assets`) para la vista de detalle y DNSH.
- **Clientes:** `getAllClients()` → `GET /clients`; se sincronizan con el store y se pasan por props.
- **401:** El cliente API borra el token y redirige a `/login` (excepto en rutas de auth).
- **Fallback:** Si `VITE_USE_API` no está activo o el API falla, se usa el store local (vacío si solo hay API).

---

## 5. Health check

- Backend: `GET /health` (sin prefijo `/api/v1`) → `{ status: 'ok', database, uptime, ... }`.
- Útil para comprobar que el backend responde antes de probar login o operaciones.

---

## 6. Checklist antes de producción

- [ ] Vercel: `VITE_USE_API`, `VITE_API_URL`, `VITE_SOCKET_URL` definidos (ver `vercel.env.example`).
- [ ] Railway: `CORS_ORIGIN=https://dnsh-evaluator.vercel.app`, `JWT_SECRET`, PostgreSQL (y resto en `backend/RAILWAY_VARIABLES.md`).
- [ ] Google OAuth (opcional): en Google Cloud, origen autorizado `https://dnsh-evaluator.vercel.app`; en backend `GOOGLE_CLIENT_ID` y `ALLOWED_DOMAINS` si aplica.
- [ ] Probar: registro → login → listado operaciones → abrir una operación (debe cargar assets) → usuarios online (Socket conectado).

Con esto, front y back quedan alineados y listos para producción.
