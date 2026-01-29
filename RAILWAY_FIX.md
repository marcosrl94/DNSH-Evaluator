# 🔧 Fix: Railway está usando el Dockerfile incorrecto

## ❌ Problema Detectado

Railway está intentando usar el Dockerfile del **frontend** (raíz del proyecto) en lugar del Dockerfile del **backend**.

Los logs muestran:
- Está intentando usar `nginx` (solo frontend)
- Está intentando hacer build de Vite (solo frontend)
- Error: `npm ci` sin `--legacy-peer-deps`

## ✅ Solución

### Opción 1: Configurar Root Directory en Railway (RECOMENDADO)

1. Ve a tu proyecto en Railway: https://railway.com/project/e223c649-0977-4c16-a9bf-7420ec5a8d17
2. Haz clic en tu **servicio del backend**
3. Ve a **Settings** → **Root Directory**
4. **IMPORTANTE**: Establece exactamente: `backend`
5. Guarda los cambios
6. Railway hará un nuevo deploy automáticamente

### Opción 2: Crear un servicio nuevo desde cero

Si el servicio actual está mal configurado:

1. En Railway, elimina el servicio actual (o créalo nuevo)
2. Haz clic en **"New"** → **"GitHub Repo"**
3. Selecciona tu repositorio: `DNSH-Evaluator`
4. **CRÍTICO**: En **"Root Directory"**, escribe exactamente: `backend`
5. Railway debería detectar automáticamente:
   - ✅ `backend/Dockerfile`
   - ✅ `backend/package.json`
   - ✅ `backend/railway.toml`

### Verificación

Después de configurar el Root Directory correctamente, Railway debería:

- ✅ Usar `backend/Dockerfile` (no el de la raíz)
- ✅ Ejecutar `npm ci --legacy-peer-deps` (ya corregido)
- ✅ Compilar TypeScript (`npm run build`)
- ✅ Iniciar con `node dist/index.js` (no nginx)

## 📋 Checklist de Configuración

- [ ] Root Directory configurado como `backend`
- [ ] PostgreSQL agregado al proyecto
- [ ] Variables de entorno configuradas:
  - [ ] `JWT_SECRET`
  - [ ] `CORS_ORIGIN`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `NODE_ENV=production`
- [ ] Deploy completado sin errores
- [ ] Health check funcionando: `https://tu-servicio.up.railway.app/health`

## 🔍 Cómo Verificar que está Correcto

En los logs de Railway, deberías ver:

✅ **Correcto** (Backend):
```
[backend] Building...
[builder] RUN npm ci --legacy-peer-deps
[builder] RUN npm run build
[stage-1] CMD ["node", "dist/index.js"]
```

❌ **Incorrecto** (Frontend):
```
[builder] COPY vite.config.ts
[builder] RUN npm run build
[stage-1] FROM nginx:alpine
[stage-1] CMD ["nginx", "-g", "daemon off;"]
```

## 🆘 Si Sigue Fallando

1. **Verifica el Root Directory**:
   - Debe ser exactamente `backend` (sin espacios, sin `/` al inicio)
   - No debe ser `/backend` o `./backend`

2. **Verifica que el Dockerfile existe**:
   - Debe estar en: `backend/Dockerfile`
   - No en la raíz del proyecto

3. **Elimina y recrea el servicio**:
   - A veces Railway cachea la configuración incorrecta
   - Elimina el servicio y créalo de nuevo con Root Directory = `backend`

4. **Revisa los logs completos**:
   - Ve a Deployments → Último deploy → View Logs
   - Busca qué Dockerfile está usando
