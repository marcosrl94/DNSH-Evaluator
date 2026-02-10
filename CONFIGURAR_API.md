# Configuración de la API

Guía para conectar el frontend con el backend y tener un 1.0 funcional.

**Frontend en producción:** [https://dnsh-evaluator.vercel.app/](https://dnsh-evaluator.vercel.app/) (Vercel)  
**Backend en producción:** Railway

---

## Producción: Vercel + Railway (resumen)

- **Front:** [https://dnsh-evaluator.vercel.app/](https://dnsh-evaluator.vercel.app/) (Vercel)
- **Back:** desplegado en [Railway](https://railway.app) (la URL la obtienes en Railway → tu servicio → Settings → Domains)

1. **En Vercel** (Project → Settings → Environment Variables). Usa los valores del archivo **`vercel.env.example`** o:
   - `VITE_USE_API` = `true`
   - `VITE_API_URL` = `https://dnsh-evaluator-production.up.railway.app/api/v1`
   - `VITE_SOCKET_URL` = `https://dnsh-evaluator-production.up.railway.app`
   - `VITE_GOOGLE_CLIENT_ID` = tu Client ID de Google (opcional)

2. **En Railway** (tu servicio → Variables):
   - `CORS_ORIGIN` = `https://dnsh-evaluator.vercel.app` (y si quieres probar en local: `https://dnsh-evaluator.vercel.app,http://localhost:5173,http://localhost:3000`)
   - El resto según [backend/RAILWAY_VARIABLES.md](backend/RAILWAY_VARIABLES.md) (JWT_SECRET, GOOGLE_CLIENT_ID, DATABASE_URL automática con PostgreSQL en Railway, etc.)

3. **Google OAuth:** En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), en "Authorized JavaScript origins" y "Redirect URIs" añade:
   - `https://dnsh-evaluator.vercel.app`

Sin backend configurado, la app en Vercel funciona en modo local (datos en memoria / localStorage).

---

## 1. Frontend (variables de entorno)

Crea o edita **`.env`** o **`.env.local`** en la **raíz del proyecto** (donde está `vite.config.ts`):

```env
# Activar uso de la API (obligatorio para datos reales)
VITE_USE_API=true

# URL base del backend (incluir /api/v1)
VITE_API_URL=http://localhost:3001/api/v1

# Socket.IO para usuarios online y colaboración en tiempo real
VITE_SOCKET_URL=http://localhost:3001

# Opcional: Google OAuth
# VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

**Reglas:**

- Si **`VITE_USE_API`** es `true` **o** **`VITE_API_URL`** tiene valor, el front usará la API para operaciones, clientes, auth y evaluaciones.
- Si no configuras nada, el front trabaja en modo local (datos en memoria / localStorage, sin backend).

**Producción (Vercel + Railway):** En Vercel configura `VITE_API_URL` y `VITE_SOCKET_URL` con la URL pública de tu backend en Railway (Settings → Domains). Ejemplo: si Railway te da `https://ecoinvest-dnsh-backend.up.railway.app`, entonces `VITE_API_URL=https://ecoinvest-dnsh-backend.up.railway.app/api/v1` y `VITE_SOCKET_URL=https://ecoinvest-dnsh-backend.up.railway.app`.

---

## 2. Backend (variables de entorno)

El backend en **producción** está en **Railway**; las variables se configuran en Railway → tu servicio → Variables (y `DATABASE_URL` la genera Railway al añadir PostgreSQL). Para **desarrollo local**, en la carpeta **`backend/`** crea un **`.env`** con al menos:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos PostgreSQL (obligatorio)
DATABASE_URL=postgresql://postgres:postgres_dev@localhost:5432/ecoinvest_dnsh_evaluator
# O por partes:
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_NAME=ecoinvest_dnsh_evaluator
# DATABASE_USER=postgres
# DATABASE_PASSWORD=postgres_dev

# JWT (obligatorio en producción: usa un secreto fuerte)
JWT_SECRET=tu-secreto-muy-seguro-cambiar-en-produccion
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d

# CORS: orígenes permitidos (frontend)
# Producción Vercel: incluir https://dnsh-evaluator.vercel.app
CORS_ORIGIN=https://dnsh-evaluator.vercel.app,http://localhost:5173,http://localhost:3000
```

**Opcionales:**

```env
# Google OAuth (backend valida el token)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
ALLOWED_DOMAINS=tuempresa.com,gmail.com

# Subida de evidencias (S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Suscripciones (Stripe)
STRIPE_CHECKOUT_URL=https://checkout.stripe.com/...

# Logs
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 3. Base de datos

1. **PostgreSQL** instalado y en marcha.
2. **Crear la base de datos:**
   ```bash
   createdb ecoinvest_dnsh_evaluator
   ```
3. **Aplicar el esquema:**
   ```bash
   cd backend
   psql -d ecoinvest_dnsh_evaluator -f database/schema.sql
   ```
4. **(Opcional)** Migraciones y seed:
   ```bash
   npm run build
   npm run db:migrate
   npm run db:seed
   ```

---

## 4. Arrancar todo

**Opción A – Todo con Docker**

```bash
docker-compose up -d
```

El front suele estar en el puerto 80 (o el que definas) y el backend en 3001. Ajusta en el front `VITE_API_URL` y `VITE_SOCKET_URL` si usas otras URLs.

**Opción B – Manual**

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Debe responder en `http://localhost:3001` y la API en `http://localhost:3001/api/v1`.

2. **Frontend:**
   ```bash
   npm install
   npm run dev
   ```
   Con `.env.local` con `VITE_USE_API=true` y `VITE_API_URL=http://localhost:3001/api/v1` (y `VITE_SOCKET_URL=http://localhost:3001` si quieres Socket).

---

## 5. Comprobar que está bien

1. **Health:** `GET http://localhost:3001/api/v1/health` (o la ruta que tenga tu backend) → 200.
2. **Registro:** Crear usuario en la app (Register) y comprobar que aparece en la tabla `users` en PostgreSQL.
3. **Login:** Iniciar sesión y que el front no muestre error de red y guarde token.
4. **Datos:** En la app, que se listen operaciones y clientes (vacío al principio si no hay seed).

Si algo falla, revisa CORS (`CORS_ORIGIN` debe incluir la URL del front), que la base esté creada y el esquema aplicado, y que `JWT_SECRET` sea el mismo en todos los entornos donde uses ese backend.

---

## Resumen mínimo

| Dónde   | Variable          | Ejemplo / valor                          |
|--------|-------------------|------------------------------------------|
| Front  | `VITE_USE_API`    | `true`                                   |
| Front  | `VITE_API_URL`    | `http://localhost:3001/api/v1`           |
| Front  | `VITE_SOCKET_URL` | `http://localhost:3001`                  |
| Backend| `DATABASE_URL`    | `postgresql://user:pass@host:5432/dbname` |
| Backend| `JWT_SECRET`      | String largo y aleatorio                 |
| Backend (Railway) | `CORS_ORIGIN`     | `https://dnsh-evaluator.vercel.app` (producción) + `http://localhost:5173` (dev) |

Con esto tienes lo necesario para configurar la API. **Front:** [dnsh-evaluator.vercel.app](https://dnsh-evaluator.vercel.app/) (Vercel). **Back:** Railway.
