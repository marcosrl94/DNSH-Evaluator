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
6. **CRÍTICO – Root Directory**: En el servicio del backend → **Settings** → pon **`backend`** en Root Directory
   - Si no lo haces, Railway usará el Dockerfile de la raíz (frontend con nginx) y la API no funcionará
   - **Dónde está Root Directory:** No está en "Settings" genérico. Busca la sección **"Source"** dentro del servicio:
     - Entra en tu **proyecto** de Railway
     - Haz clic en el **servicio** del backend (el que desplegaste desde GitHub)
     - Ve a la pestaña **Settings** del servicio
     - Busca la sección **"Source"** (o "Repositorio" / "Repository")
     - Ahí debería aparecer **"Root Directory"** (o "Directorio raíz")
     - Escribe `backend` y guarda
   - Si no encuentras "Source", busca también en: sección de **Build**, o junto a **Watch Paths** / **Build Command**

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

### Si no encuentras Root Directory

- La opción está en **Settings** → sección **Source** (junto a la conexión del repo).
- En algunas versiones de la UI aparece al hacer clic en el repositorio conectado o en el enlace del código fuente.
- Si sigue sin aparecer, consulta en el [Foro de Railway](https://discord.gg/railway) o en [Railway Help](https://help.railway.app).

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

### 6. Target Port (si obtienes 502)

Si la app arranca bien en los logs pero las peticiones devuelven **502**:

1. Railway → servicio backend → **Settings** → **Networking** (o la sección del dominio)
2. Busca **"Target Port"** o "Puerto objetivo" en la configuración del dominio público
3. El backend escucha en el puerto **8080** (o el que Railway inyecte en `PORT`)
4. Configura Target Port = **8080** para que coincida
5. Redeploy si hace falta

### 7. Verificar

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
