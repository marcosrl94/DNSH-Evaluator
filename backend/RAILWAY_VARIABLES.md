# Variables de Entorno para Railway

Copia y pega estas variables en **Railway → Tu Servicio → Variables**.

**Frontend en producción:** [https://dnsh-evaluator.vercel.app/](https://dnsh-evaluator.vercel.app/) (Vercel)

## 🔴 OBLIGATORIAS:

```env
JWT_SECRET=tu-secret-key-super-segura-genera-una-nueva
CORS_ORIGIN=https://dnsh-evaluator.vercel.app
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
NODE_ENV=production
```

(Para probar también en local: `CORS_ORIGIN=https://dnsh-evaluator.vercel.app,http://localhost:5173,http://localhost:3000`)

## 🟡 RECOMENDADAS:

```env
API_PREFIX=/api/v1
LOG_LEVEL=info
ALLOWED_DOMAINS=gmail.com,googlemail.com
```

## 🟢 OPCIONALES (Solo si necesitas almacenar archivos):

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=ecoinvest-evidence-documents
```

## 📝 NOTAS:

1. **JWT_SECRET**: Genera uno seguro con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **DATABASE_URL**: Railway la configura automáticamente cuando agregas el plugin PostgreSQL. NO la agregues manualmente. Ver abajo cómo añadir PostgreSQL.

3. **CORS_ORIGIN**: Debe incluir la URL del frontend en Vercel: `https://dnsh-evaluator.vercel.app`.

4. **PORT**: Railway lo configura automáticamente. NO lo agregues manualmente.

---

## Cómo añadir PostgreSQL en Railway

1. Entra en [Railway](https://railway.app) y abre tu **proyecto** (el que tiene el backend DNSH).
2. En el panel del proyecto, haz clic en **"+ New"** (o **"Add a plugin"** / **"New"** según la versión).
3. Elige **"Database"** → **"PostgreSQL"**.
4. Railway creará un nuevo servicio de base de datos y te mostrará variables como `DATABASE_URL`, `PGHOST`, `PGPORT`, etc.
5. **Conectar el backend a la base de datos:**
   - Haz clic en el **servicio de tu backend** (no en el de PostgreSQL).
   - Ve a **Variables**.
   - Deberías ver la opción **"Add a variable reference"** o **"Connect to PostgreSQL"**. Si Railway te ofrece **"Add reference"** o **"Connect"** desde el servicio PostgreSQL, úsala para inyectar `DATABASE_URL` en el backend.
   - **Alternativa:** En el servicio **PostgreSQL**, entra en **Variables** o **Connect** y copia `DATABASE_URL`. Luego en el servicio **backend** → **Variables** → **New Variable**: nombre `DATABASE_URL`, valor = la URL que copiaste (o usa "Reference" si aparece para enlazar la variable del plugin).
6. Haz un **redeploy** del backend para que arranque con `DATABASE_URL` y pueda conectar.

Tras el redeploy, en los logs del backend deberías ver algo como `✅ Database connected`.
