# 🚂 Setup Rápido de Railway - Checklist

## ✅ Paso 1: Configurar el Servicio

1. Ve a tu proyecto: https://railway.com/project/e223c649-0977-4c16-a9bf-7420ec5a8d17
2. Si ya tienes un servicio creado:
   - Haz clic en el servicio
   - Ve a **Settings** → **Root Directory**
   - Establece: `backend`
   - Guarda

3. Si NO tienes servicio aún:
   - Haz clic en **"New"** → **"GitHub Repo"**
   - Selecciona tu repositorio
   - En **"Root Directory"**, escribe: `backend`
   - Railway detectará el Dockerfile automáticamente

## ✅ Paso 2: Agregar PostgreSQL

1. En tu proyecto de Railway, haz clic en **"New"**
2. Selecciona **"Database"** → **"PostgreSQL"**
3. Railway creará automáticamente la base de datos
4. **IMPORTANTE**: Railway configurará `DATABASE_URL` automáticamente

## ✅ Paso 3: Variables de Entorno

Ve a tu servicio → **"Variables"** y agrega:

### Genera un JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Agrega estas variables:

| Variable | Valor |
|----------|-------|
| `JWT_SECRET` | (Pega el valor generado arriba) |
| `CORS_ORIGIN` | `https://marcosrl94.github.io` |
| `GOOGLE_CLIENT_ID` | `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com` |
| `NODE_ENV` | `production` |
| `API_PREFIX` | `/api/v1` |
| `LOG_LEVEL` | `info` |

**NOTA**: NO agregues `DATABASE_URL` ni `PORT` - Railway los configura automáticamente.

## ✅ Paso 4: Deploy

1. Railway debería hacer deploy automáticamente cuando:
   - Configuras el Root Directory correctamente
   - Agregas las variables de entorno
   - Haces push a GitHub

2. Ve a **"Deployments"** para ver el progreso
3. Espera a que termine el build (puede tardar 2-5 minutos)

## ✅ Paso 5: Ejecutar Migraciones

Después del primer deploy exitoso:

1. Ve a tu servicio → **"Deployments"** → Selecciona el último deploy
2. Haz clic en **"View Logs"**
3. Abre la terminal (icono de terminal en Railway)
4. Ejecuta:
   ```bash
   npm run db:migrate
   ```

## ✅ Paso 6: Obtener la URL del Backend

1. Ve a tu servicio en Railway
2. Haz clic en **"Settings"** → **"Networking"**
3. Haz clic en **"Generate Domain"** (si no tienes uno)
4. Copia la URL (algo como: `https://tu-servicio.up.railway.app`)

## ✅ Paso 7: Configurar el Frontend

Necesitas decirle al frontend dónde está el backend:

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Secrets and variables** → **Actions**
3. Agrega un nuevo secreto:
   - Nombre: `VITE_API_URL`
   - Valor: `https://tu-servicio.up.railway.app/api/v1`
   (Reemplaza `tu-servicio` con tu URL real de Railway)

4. Actualiza el workflow de GitHub Actions para incluir esta variable:

Edita `.github/workflows/deploy.yml` y agrega en el paso de Build:

```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY || '' }}
  VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID || '169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com' }}
  VITE_API_URL: ${{ secrets.VITE_API_URL || '' }}
  GITHUB_PAGES: 'true'
```

5. Haz commit y push de este cambio

## ✅ Paso 8: Verificar

1. **Backend Health Check**:
   ```
   https://tu-servicio.up.railway.app/health
   ```
   Deberías ver: `{"status":"ok","database":"connected",...}`

2. **Frontend**:
   - Ve a: https://marcosrl94.github.io/DNSH-Evaluator/
   - El frontend debería conectarse al backend automáticamente

## 🐛 Troubleshooting

### El deploy falla
- ✅ Verifica que `Root Directory` sea `backend`
- ✅ Verifica que el Dockerfile esté en `backend/Dockerfile`
- ✅ Revisa los logs en Railway → Deployments

### Error de conexión a base de datos
- ✅ Verifica que PostgreSQL esté agregado al proyecto
- ✅ Verifica que `DATABASE_URL` esté en las variables (Railway la agrega automáticamente)
- ✅ Ejecuta las migraciones: `npm run db:migrate`

### El frontend no se conecta al backend
- ✅ Verifica que `VITE_API_URL` esté configurado en GitHub Secrets
- ✅ Verifica que el workflow de GitHub Actions incluya `VITE_API_URL`
- ✅ Verifica que `CORS_ORIGIN` en Railway incluya `https://marcosrl94.github.io`

### Error 404 en las rutas
- ✅ Verifica que `API_PREFIX=/api/v1` esté configurado
- ✅ Las rutas deben ser: `https://tu-backend.up.railway.app/api/v1/auth/login`

## 📞 URLs Importantes

- **Railway Dashboard**: https://railway.app/dashboard
- **Tu Proyecto**: https://railway.com/project/e223c649-0977-4c16-a9bf-7420ec5a8d17
- **Health Check**: `https://tu-servicio.up.railway.app/health`
