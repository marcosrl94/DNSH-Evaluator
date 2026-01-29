# 🚀 Quick Start - Backend Colaborativo

## Instalación Rápida (5 minutos)

### 1. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Crear base de datos
createdb ecoinvest_dnsh_evaluator

# Ejecutar schema
psql -d ecoinvest_dnsh_evaluator -f database/schema.sql

# Iniciar servidor (modo desarrollo)
npm run dev
```

El servidor estará en `http://localhost:3001`

### 2. Frontend

```bash
# En la raíz del proyecto, crear .env.local
echo "VITE_API_URL=http://localhost:3001/api/v1" > .env.local
echo "VITE_SOCKET_URL=http://localhost:3001" >> .env.local

# Instalar dependencias (si no están)
npm install

# Iniciar frontend
npm run dev
```

### 3. Usuario por Defecto

Después de ejecutar el schema, tienes un usuario admin:
- **Email:** `admin@ecoinvest.com`
- **Password:** `admin123`
- **Rol:** Admin

⚠️ **IMPORTANTE:** Cambia la contraseña en producción.

## Verificar que Funciona

1. **Backend saludable:**
   ```bash
   curl http://localhost:3001/health
   ```
   Debería responder: `{"status":"ok",...}`

2. **Login funciona:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@ecoinvest.com","password":"admin123"}'
   ```
   Debería devolver un token JWT.

3. **Frontend conecta:**
   - Abre `http://localhost:3000`
   - Login con `admin@ecoinvest.com` / `admin123`
   - Deberías ver el dashboard

## Próximos Pasos

1. **Migrar datos existentes:**
   ```bash
   cd backend
   npm run db:seed
   ```

2. **Configurar S3 (opcional para desarrollo):**
   - Puedes usar URLs locales temporalmente
   - Para producción, configura AWS S3 en `.env`

3. **Integrar en el frontend:**
   - Ver `INTEGRACION_BACKEND.md` para detalles
   - Reemplazar `dataManagement.ts` con `apiClient`
   - Conectar Socket.IO en `AuthContext`

## Troubleshooting

**Error: "Cannot connect to database"**
- Verifica que PostgreSQL esté corriendo: `pg_isready`
- Verifica credenciales en `.env`
- Verifica que la DB exista: `psql -l | grep ecoinvest`

**Error: "Port 3001 already in use"**
- Cambia `PORT` en `.env` del backend
- Actualiza `VITE_API_URL` en frontend

**Error: "Module not found"**
- Ejecuta `npm install` en `backend/`
- Verifica que todas las dependencias estén instaladas

## Estructura Completa

```
backend/                    ✅ Backend completo
├── database/schema.sql    ✅ Esquema DB
├── src/
│   ├── routes/           ✅ 9 módulos de rutas
│   ├── middleware/       ✅ Auth, errors, logging
│   ├── services/        ✅ S3, migraciones
│   └── config/          ✅ DB, Socket.IO
└── package.json         ✅ Dependencias

src/services/
├── api.ts               ✅ Cliente API frontend
└── socketService.ts     ✅ Cliente Socket.IO
```

## Documentación

- **Backend completo:** `backend/README.md`
- **Integración:** `INTEGRACION_BACKEND.md`
- **Roadmap:** `ROADMAP_COLABORACION.md`
- **Implementación:** `IMPLEMENTACION_COMPLETA.md`

¡Listo para trabajar colaborativamente! 🎉
