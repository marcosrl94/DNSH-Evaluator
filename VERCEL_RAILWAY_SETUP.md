# 🚀 Configuración Vercel + Railway

Guía completa para configurar el frontend en Vercel y el backend en Railway.

## 📋 Arquitectura

- **Frontend**: Vercel (https://tu-app.vercel.app)
- **Backend**: Railway (https://tu-backend.up.railway.app)
- **Base de Datos**: PostgreSQL en Railway

---

## 🔧 Paso 1: Configurar Backend en Railway

### 1.1 Crear Servicio Backend

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Crea un nuevo proyecto o usa el existente
3. Haz clic en **"New"** → **"GitHub Repo"**
4. Selecciona tu repositorio: `DNSH-Evaluator`
5. **CRÍTICO**: En **"Root Directory"**, escribe: `backend`
6. Railway detectará automáticamente el Dockerfile

### 1.2 Agregar PostgreSQL

1. En tu proyecto de Railway, haz clic en **"New"**
2. Selecciona **"Database"** → **"PostgreSQL"**
3. Railway configurará automáticamente `DATABASE_URL`

### 1.3 Variables de Entorno en Railway

Ve a tu servicio backend → **"Variables"** y agrega:

```env
# OBLIGATORIAS
JWT_SECRET=tu-secret-key-super-segura-genera-una-nueva
CORS_ORIGIN=https://tu-app.vercel.app,https://tu-app-git-main-tu-usuario.vercel.app
GOOGLE_CLIENT_ID=169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
NODE_ENV=production
API_PREFIX=/api/v1

# RECOMENDADAS
LOG_LEVEL=info
ALLOWED_DOMAINS=gmail.com,googlemail.com
```

**Generar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**IMPORTANTE**: 
- `CORS_ORIGIN` debe incluir tu URL de Vercel
- Railway genera URLs como: `https://tu-app.vercel.app` y `https://tu-app-git-main-tu-usuario.vercel.app`
- Agrega ambas URLs separadas por comas
- Puedes usar wildcards: `https://tu-app-git-*-tu-usuario.vercel.app`

### 1.4 Obtener URL del Backend

1. Ve a tu servicio backend → **"Settings"** → **"Networking"**
2. Haz clic en **"Generate Domain"** (si no tienes uno)
3. Copia la URL completa (ej: `https://tu-backend.up.railway.app`)
4. **Guarda esta URL** - la necesitarás para Vercel

### 1.5 Ejecutar Migraciones

Después del primer deploy:

1. Ve a tu servicio → **"Deployments"** → Último deploy
2. Abre la terminal
3. Ejecuta:
   ```bash
   npm run db:migrate
   ```

### 1.6 Verificar Backend

Prueba el health check:
```
https://tu-backend.up.railway.app/health
```

Deberías ver:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

---

## 🌐 Paso 2: Configurar Frontend en Vercel

### 2.1 Conectar Repositorio

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **"Add New"** → **"Project"**
3. Importa tu repositorio: `DNSH-Evaluator`
4. Vercel detectará automáticamente que es un proyecto Vite

### 2.2 Configurar Variables de Entorno en Vercel

Ve a tu proyecto → **"Settings"** → **"Environment Variables"** y agrega:

```env
# URL del Backend (REEMPLAZA con tu URL de Railway)
VITE_API_URL=https://tu-backend.up.railway.app/api/v1

# Habilitar uso de API
VITE_USE_API=true

# Google OAuth
VITE_GOOGLE_CLIENT_ID=169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com

# Gemini AI (Opcional)
VITE_GEMINI_API_KEY=tu-gemini-api-key
```

**IMPORTANTE**:
- Reemplaza `https://tu-backend.up.railway.app` con tu URL real de Railway
- La URL debe terminar en `/api/v1`
- Aplica estas variables a **Production**, **Preview**, y **Development**
- Las variables que empiezan con `VITE_` se incluyen en el build

### 2.3 Configurar Build Settings

Vercel debería detectar automáticamente:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install --legacy-peer-deps` (ya configurado en vercel.json)

### 2.4 Deploy

1. Haz clic en **"Deploy"**
2. Espera a que termine el build
3. Vercel te dará una URL: `https://tu-app.vercel.app`

### 2.5 Actualizar CORS en Railway

Después de obtener tu URL de Vercel, actualiza `CORS_ORIGIN` en Railway:

```env
CORS_ORIGIN=https://tu-app.vercel.app,https://tu-app-git-main-tu-usuario.vercel.app,https://tu-app-git-*-tu-usuario.vercel.app
```

**Nota**: Vercel genera múltiples URLs para diferentes branches. Puedes usar wildcards o agregar todas las URLs específicas.

---

## ✅ Checklist de Verificación

### Backend (Railway)
- [ ] Servicio creado con Root Directory = `backend`
- [ ] PostgreSQL agregado y `DATABASE_URL` configurada automáticamente
- [ ] Variables de entorno configuradas:
  - [ ] `JWT_SECRET`
  - [ ] `CORS_ORIGIN` (con URL de Vercel)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `NODE_ENV=production`
- [ ] Deploy completado exitosamente
- [ ] Migraciones ejecutadas (`npm run db:migrate`)
- [ ] Health check funcionando: `/health`

### Frontend (Vercel)
- [ ] Repositorio conectado
- [ ] Variables de entorno configuradas:
  - [ ] `VITE_API_URL` (URL completa de Railway + `/api/v1`)
  - [ ] `VITE_USE_API=true`
  - [ ] `VITE_GOOGLE_CLIENT_ID`
- [ ] Variables aplicadas a Production, Preview y Development
- [ ] Deploy completado exitosamente
- [ ] App accesible en Vercel

### Conexión
- [ ] CORS configurado correctamente en Railway (con URL de Vercel)
- [ ] Frontend puede hacer requests al backend
- [ ] Login funciona correctamente
- [ ] Google OAuth funciona

---

## 🔍 Verificar Conexión

1. Abre tu app en Vercel: `https://tu-app.vercel.app`
2. Abre la consola del navegador (F12)
3. Intenta hacer login
4. Deberías ver requests a: `https://tu-backend.up.railway.app/api/v1/auth/login`

---

## 🐛 Troubleshooting

### Error: CORS bloqueado

**Síntoma**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solución**:
1. Verifica que `CORS_ORIGIN` en Railway incluya tu URL de Vercel
2. Asegúrate de incluir todas las variantes de URL de Vercel (con y sin git branch)
3. Usa wildcards si es necesario: `https://tu-app-git-*-tu-usuario.vercel.app`
4. Reinicia el servicio en Railway después de cambiar `CORS_ORIGIN`

### Error: Cannot connect to backend

**Síntoma**: `Failed to fetch` o `Network error`

**Solución**:
1. Verifica que `VITE_API_URL` esté configurada correctamente en Vercel
2. Verifica que la URL termine en `/api/v1`
3. Prueba el health check directamente: `https://tu-backend.up.railway.app/health`
4. Verifica que el backend esté corriendo en Railway (ve a Deployments)

### Error: 401 Unauthorized

**Síntoma**: Login falla con 401

**Solución**:
1. Verifica que `JWT_SECRET` esté configurado en Railway
2. Verifica que las migraciones se hayan ejecutado
3. Revisa los logs del backend en Railway

### Error: Database connection failed

**Síntoma**: Backend no puede conectar a PostgreSQL

**Solución**:
1. Verifica que PostgreSQL esté agregado al proyecto en Railway
2. Verifica que `DATABASE_URL` esté configurada (Railway la configura automáticamente)
3. Ejecuta las migraciones: `npm run db:migrate`

### Variables de entorno no funcionan en Vercel

**Síntoma**: `VITE_API_URL` es `undefined` en producción

**Solución**:
1. Verifica que las variables empiecen con `VITE_`
2. Asegúrate de aplicar las variables a **Production**
3. Haz un nuevo deploy después de agregar variables
4. Las variables de Vite se inyectan en tiempo de build

### Railway usa Dockerfile incorrecto

**Síntoma**: Railway intenta usar el Dockerfile del frontend

**Solución**:
1. Verifica que **Root Directory** sea exactamente `backend` (sin espacios, sin `/`)
2. Elimina y recrea el servicio si es necesario
3. Verifica que `backend/Dockerfile` exista

---

## 📝 URLs de Ejemplo

### Backend (Railway)
```
Health Check: https://tu-backend.up.railway.app/health
API Base: https://tu-backend.up.railway.app/api/v1
Login: https://tu-backend.up.railway.app/api/v1/auth/login
```

### Frontend (Vercel)
```
App: https://tu-app.vercel.app
Preview: https://tu-app-git-main-tu-usuario.vercel.app
```

---

## 🔄 Flujo de Datos

```
Usuario → Vercel (Frontend) → Railway (Backend) → PostgreSQL
                ↓
         Railway (Backend) → Vercel (Frontend) → Usuario
```

1. Usuario accede a `https://tu-app.vercel.app`
2. Frontend hace requests a `https://tu-backend.up.railway.app/api/v1`
3. Backend consulta PostgreSQL
4. Backend responde al frontend
5. Frontend muestra los datos al usuario

---

## 🎯 Próximos Pasos

1. ✅ Configurar dominio personalizado en Vercel (opcional)
2. ✅ Configurar dominio personalizado en Railway (opcional)
3. ✅ Configurar SSL automático (ya configurado por defecto)
4. ✅ Configurar monitoreo y alertas
5. ✅ Configurar backups de base de datos en Railway

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway → Deployments → View Logs
2. Revisa los logs en Vercel → Deployments → View Logs
3. Verifica las variables de entorno en ambas plataformas
4. Prueba el health check del backend directamente

---

## 🔐 Seguridad

- ✅ SSL/HTTPS configurado automáticamente en ambas plataformas
- ✅ CORS configurado para permitir solo tu dominio de Vercel
- ✅ JWT para autenticación segura
- ✅ Variables de entorno nunca se exponen en el código del frontend
- ✅ Base de datos protegida con credenciales seguras
