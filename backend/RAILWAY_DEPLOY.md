# 🚂 Guía de Deploy en Railway

Esta guía te ayudará a desplegar el backend en Railway.

## 📋 Prerrequisitos

1. Cuenta en [Railway](https://railway.app)
2. Repositorio de GitHub con el código del backend

## 🚀 Pasos para Deploy

### 1. Crear un Nuevo Proyecto en Railway

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Haz clic en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio de GitHub
5. Selecciona el repositorio `ecoinvest-dnsh-evaluator`
6. **IMPORTANTE**: Selecciona el directorio `backend` como raíz del proyecto

### 2. Agregar Base de Datos PostgreSQL

1. En tu proyecto de Railway, haz clic en "New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará automáticamente una base de datos y la variable `DATABASE_URL`
4. **Nota**: Railway configurará automáticamente `DATABASE_URL` en las variables de entorno

### 3. Configurar Variables de Entorno

Ve a tu servicio → "Variables" y agrega las siguientes:

#### **Obligatorias:**

```env
# JWT Secret (genera uno seguro)
JWT_SECRET=tu-secret-key-super-segura-aqui

# CORS - URL del frontend en Vercel (separadas por comas si añades más orígenes)
CORS_ORIGIN=https://dnsh-evaluator.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
ALLOWED_DOMAINS=gmail.com,googlemail.com

# Node Environment
NODE_ENV=production
```

#### **Opcionales (pero recomendadas):**

```env
# API Prefix
API_PREFIX=/api/v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,image/jpeg,image/png
```

#### **Opcionales (AWS S3 para almacenamiento de archivos):**

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=ecoinvest-evidence-documents
```

**Nota**: Si no configuras AWS, el backend funcionará pero no podrá subir archivos.

### 4. Configurar el Deploy

Railway debería detectar automáticamente:
- ✅ El `Dockerfile` en el directorio `backend`
- ✅ El `railway.toml` para configuración
- ✅ El comando `npm start` desde `package.json`

Si no detecta el directorio correcto:
1. Ve a Settings → "Root Directory"
2. Establece: `backend`

### 5. Ejecutar Migraciones

Después del primer deploy, necesitas ejecutar las migraciones de la base de datos:

1. Ve a tu servicio en Railway
2. Haz clic en "Deployments" → Selecciona el último deploy
3. Haz clic en "View Logs"
4. Abre una terminal (Railway tiene una terminal integrada)
5. Ejecuta:

```bash
npm run db:migrate
```

O manualmente desde la terminal de Railway:

```bash
cd /app
node dist/database/migrate.js
```

### 5b. Cargar Operación Demo (para presentaciones)

Para tener una operación de ejemplo pre-cargada en producción:

```bash
npm run db:seed
```

Esto crea:
- Organización **EcoInvest Demo** (plan professional)
- Usuario admin: `admin@ecoinvest.com` / `admin123` (si no existe)
- Cliente **EcoEnergy Iberia**
- Operación **Iberia Solar PV Portfolio** con 3 activos y evaluaciones DNSH (Compliant, Non-Compliant, Conditional)

El seed es **idempotente**: si la operación demo ya existe, no duplica datos.

### 6. Verificar el Deploy

1. Railway te dará una URL pública (algo como: `https://tu-servicio.up.railway.app`)
2. Prueba el endpoint de health:
   ```
   https://tu-servicio.up.railway.app/health
   ```
3. Deberías ver una respuesta JSON con el estado del servidor

### 7. Configurar Dominio Personalizado (Opcional)

1. Ve a Settings → "Domains"
2. Agrega tu dominio personalizado
3. Railway configurará automáticamente el SSL

## 🔧 Troubleshooting

### El deploy falla

**Problema**: Error al compilar TypeScript
- **Solución**: Verifica que el Dockerfile esté en el directorio `backend` y que `tsconfig.json` exista

**Problema**: Error al conectar a la base de datos
- **Solución**: Verifica que `DATABASE_URL` esté configurada correctamente. Railway la configura automáticamente si agregaste PostgreSQL.

**Problema**: Puerto no disponible
- **Solución**: Railway usa la variable `PORT` automáticamente. No necesitas configurarla manualmente.

### El servidor no inicia

**Problema**: Error "Cannot find module"
- **Solución**: Verifica que el build se completó correctamente. Revisa los logs del deploy.

**Problema**: Error de autenticación con base de datos
- **Solución**: Verifica que la base de datos PostgreSQL esté corriendo y que `DATABASE_URL` sea correcta.

### Variables de entorno no funcionan

**Problema**: Las variables no se cargan
- **Solución**: 
  1. Verifica que las variables estén en "Variables" del servicio (no del proyecto)
  2. Haz un nuevo deploy después de agregar variables
  3. Las variables se inyectan en tiempo de ejecución

## 📝 Checklist de Deploy

- [ ] Proyecto creado en Railway
- [ ] Repositorio conectado desde GitHub
- [ ] Directorio `backend` configurado como raíz
- [ ] Base de datos PostgreSQL agregada
- [ ] Variables de entorno configuradas:
  - [ ] `JWT_SECRET`
  - [ ] `CORS_ORIGIN`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `NODE_ENV=production`
- [ ] Deploy completado exitosamente
- [ ] Migraciones ejecutadas
- [ ] Health check funcionando (`/health`)
- [ ] Frontend configurado para usar la URL de Railway

## 🔗 URLs Importantes

- **Railway Dashboard**: https://railway.app/dashboard
- **Documentación Railway**: https://docs.railway.app
- **Health Check**: `https://tu-servicio.up.railway.app/health`
- **API Base**: `https://tu-servicio.up.railway.app/api/v1`

## 💡 Tips

1. **Generar JWT_SECRET seguro**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Ver logs en tiempo real**:
   - Ve a tu servicio → "View Logs"
   - Los logs se actualizan automáticamente

3. **Rollback rápido**:
   - Ve a "Deployments"
   - Selecciona un deploy anterior
   - Haz clic en "Redeploy"

4. **Monitoreo**:
   - Railway proporciona métricas básicas en el dashboard
   - Para más detalles, considera integrar Sentry (configura `SENTRY_DSN`)

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs del deploy en Railway
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que la base de datos esté corriendo
4. Verifica que el frontend esté usando la URL correcta de Railway
