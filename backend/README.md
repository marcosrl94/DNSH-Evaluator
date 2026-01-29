# DNSH Evaluator Backend API

Backend API para la herramienta colaborativa de evaluación DNSH.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- AWS Account (para S3) - Opcional para desarrollo local

### Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar base de datos:**
```bash
# Crear base de datos
createdb ecoinvest_dnsh_evaluator

# Ejecutar schema
psql -d ecoinvest_dnsh_evaluator -f database/schema.sql
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Iniciar servidor:**
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuración (DB, Socket.IO)
│   ├── middleware/     # Middleware (auth, error handling)
│   ├── routes/         # Rutas API
│   ├── services/       # Servicios (S3, etc.)
│   ├── utils/          # Utilidades
│   └── index.ts        # Entry point
├── database/
│   ├── schema.sql      # Esquema completo
│   └── migrations/     # Migraciones
└── package.json
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refrescar token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Obtener usuario actual

### Operaciones
- `GET /api/v1/operations` - Listar operaciones
- `GET /api/v1/operations/:id` - Obtener operación
- `POST /api/v1/operations` - Crear operación
- `PUT /api/v1/operations/:id` - Actualizar operación
- `DELETE /api/v1/operations/:id` - Eliminar operación

### Assets
- `GET /api/v1/assets/:id` - Obtener asset
- `POST /api/v1/assets` - Crear asset
- `PUT /api/v1/assets/:id` - Actualizar asset
- `DELETE /api/v1/assets/:id` - Eliminar asset

### Evaluaciones
- `GET /api/v1/evaluations/asset/:assetId` - Obtener evaluación
- `POST /api/v1/evaluations` - Crear/actualizar evaluación

### Evidencias
- `POST /api/v1/evidence/upload` - Subir evidencia
- `GET /api/v1/evidence/:id/download` - Descargar evidencia
- `GET /api/v1/evidence/operation/:operationId` - Listar evidencias
- `DELETE /api/v1/evidence/:id` - Eliminar evidencia

### Comentarios
- `GET /api/v1/comments/operation/:operationId` - Listar comentarios
- `POST /api/v1/comments` - Crear comentario
- `PUT /api/v1/comments/:id/resolve` - Resolver comentario
- `DELETE /api/v1/comments/:id` - Eliminar comentario

### Tareas
- `GET /api/v1/tasks` - Listar tareas
- `POST /api/v1/tasks` - Crear tarea
- `PUT /api/v1/tasks/:id/status` - Actualizar estado
- `DELETE /api/v1/tasks/:id` - Eliminar tarea

### Notificaciones
- `GET /api/v1/notifications` - Listar notificaciones
- `PUT /api/v1/notifications/:id/read` - Marcar como leída
- `PUT /api/v1/notifications/read-all` - Marcar todas como leídas
- `DELETE /api/v1/notifications/:id` - Eliminar notificación

## 🔐 Autenticación

Todas las rutas (excepto `/auth/*`) requieren autenticación mediante JWT.

**Header requerido:**
```
Authorization: Bearer <token>
```

## 📡 Socket.IO

El servidor incluye Socket.IO para actualizaciones en tiempo real.

**Eventos del cliente:**
- `join:operation` - Unirse a una operación
- `join:asset` - Unirse a un asset
- `editing:start` - Indicar que se está editando
- `editing:stop` - Indicar que se dejó de editar

**Eventos del servidor:**
- `operation:created` - Nueva operación
- `operation:updated` - Operación actualizada
- `asset:updated` - Asset actualizado
- `evaluation:updated` - Evaluación actualizada
- `evidence:uploaded` - Evidencia subida
- `comment:created` - Nuevo comentario
- `task:assigned` - Tarea asignada

## 🗄️ Base de Datos

Ver `database/schema.sql` para el esquema completo.

### Tablas principales:
- `users` - Usuarios
- `operations` - Operaciones/Deals
- `assets` - Assets
- `dnsh_evaluations` - Evaluaciones DNSH
- `evidence_documents` - Evidencias
- `comments` - Comentarios
- `tasks` - Tareas
- `notifications` - Notificaciones
- `audit_logs` - Auditoría

## 🔧 Desarrollo

```bash
# Modo desarrollo con hot reload
npm run dev

# Build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📝 Notas

- El servidor usa PostgreSQL como base de datos
- Los archivos se almacenan en AWS S3 (configurable)
- Socket.IO para colaboración en tiempo real
- JWT para autenticación
- Rate limiting para prevenir abuso
- Logging completo con Winston
