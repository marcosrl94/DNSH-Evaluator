# 🚀 Despliegue Rápido del Backend en Railway

## Pasos para Desplegar

### 1. Preparar el código
```bash
cd backend
npm install
npm run build
```

### 2. Crear proyecto en Railway

1. Ve a https://railway.app
2. Inicia sesión con GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Conecta tu repositorio `ecoinvest-dnsh-evaluator`
6. **IMPORTANTE**: En Settings → Root Directory, establece: `backend`

### 3. Agregar Base de Datos PostgreSQL

1. En tu proyecto de Railway, haz clic en "New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará automáticamente `DATABASE_URL`

### 4. Configurar Variables de Entorno

Ve a tu servicio → "Variables" y agrega:

```env
JWT_SECRET=<genera-uno-seguro>
CORS_ORIGIN=https://dnsh-evaluator.vercel.app
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
NODE_ENV=production
API_PREFIX=/api/v1
ALLOWED_DOMAINS=gmail.com,googlemail.com
```

(El front está en [https://dnsh-evaluator.vercel.app/](https://dnsh-evaluator.vercel.app/); en Vercel configura `VITE_API_URL` y `VITE_SOCKET_URL` con la URL pública de este servicio en Railway.)

**Para generar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Ejecutar Migraciones

Después del primer deploy:

1. Ve a tu servicio → "Deployments" → Último deploy
2. Haz clic en "View Logs"
3. Abre la terminal integrada
4. Ejecuta:
```bash
npm run db:migrate
```

### 6. Verificar

Railway te dará una URL como: `https://tu-servicio.up.railway.app`

Prueba:
```
https://tu-servicio.up.railway.app/health
```

## ⚠️ Nota sobre Errores de Compilación

Si hay errores de TypeScript durante el build, Railway puede fallar. Para desplegar con errores menores:

1. Temporalmente desactiva `strict` en `tsconfig.json`:
```json
{
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": false
  }
}
```

2. O usa `tsc --noEmit false` en el build

## 🔗 URLs Importantes

- **Railway Dashboard**: https://railway.app/dashboard
- **Health Check**: `https://tu-servicio.up.railway.app/health`
- **API Base**: `https://tu-servicio.up.railway.app/api/v1`
