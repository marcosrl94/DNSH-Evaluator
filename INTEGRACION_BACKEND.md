# Guía de Integración Backend-Frontend

## 📋 Resumen

Se ha creado un backend completo con API REST y Socket.IO para convertir la aplicación en una herramienta colaborativa real.

## 🗂️ Estructura Creada

### Backend (`/backend`)
- ✅ Esquema de base de datos PostgreSQL completo
- ✅ API REST con todas las rutas necesarias
- ✅ Autenticación JWT
- ✅ Socket.IO para tiempo real
- ✅ Integración S3 para archivos
- ✅ Sistema de permisos y roles
- ✅ Auditoría completa

### Frontend (`/src/services`)
- ✅ `api.ts` - Cliente API para todas las operaciones
- ✅ `socketService.ts` - Cliente Socket.IO para tiempo real

## 🚀 Pasos para Integrar

### 1. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar .env (copiar de .env.example)
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos
createdb ecoinvest_dnsh_evaluator

# Ejecutar schema
psql -d ecoinvest_dnsh_evaluator -f database/schema.sql

# Migrar datos demo (opcional)
npm run db:migrate

# Iniciar servidor
npm run dev
```

### 2. Configurar Frontend

Agregar variables de entorno en `.env`:
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001
```

### 3. Actualizar Servicios Existentes

Reemplazar `dataManagement.ts` para usar API:

```typescript
// Antes: localStorage/dataStore
// Ahora: apiClient.getOperations(), apiClient.updateOperation(), etc.
```

### 4. Integrar Socket.IO

En componentes que necesiten tiempo real:

```typescript
import { socketService } from '../services/socketService';

// Conectar cuando usuario inicia sesión
socketService.connect(token);

// Unirse a operación cuando se carga
socketService.joinOperation(operationId);

// Escuchar actualizaciones
socketService.onOperationUpdated((data) => {
  // Refrescar datos
});
```

## 📝 Cambios Necesarios en el Frontend

### 1. Actualizar AuthContext

```typescript
// Usar apiClient en lugar de servicios mock
import { apiClient } from '../services/api';

const login = async (email: string, password: string) => {
  const response = await apiClient.login(email, password);
  // Conectar Socket.IO
  socketService.connect(response.token);
  // ...
};
```

### 2. Actualizar dataManagement.ts

```typescript
// Reemplazar dataStore con llamadas API
import { apiClient } from './api';

export async function getAllOperations() {
  const response = await apiClient.getOperations();
  return response.operations;
}

export async function updateOperation(operation: Operation) {
  await apiClient.updateOperation(operation.id, operation);
}
```

### 3. Actualizar EvidenceModal

```typescript
// Usar apiClient.uploadEvidence() en lugar de URLs locales
const handleUpload = async () => {
  const result = await apiClient.uploadEvidence(selectedFile, {
    operationId,
    assetId,
    name: documentName,
    type: documentType,
    // ...
  });
  // ...
};
```

## 🔄 Migración de Datos

Los datos actuales en `constants.ts` (DEMO_OPERATIONS, DEMO_CLIENTS) se pueden migrar ejecutando:

```bash
cd backend
npm run db:migrate
```

Esto creará:
- Usuario admin (admin@ecoinvest.com / admin123)
- Todos los clients y operations de demo
- Assets y evaluaciones existentes

## 🔐 Autenticación

El backend usa JWT. El token se almacena en localStorage y se envía en cada request.

**Flujo:**
1. Usuario hace login → recibe `token` y `refreshToken`
2. Token se guarda en localStorage
3. Cada request incluye `Authorization: Bearer <token>`
4. Si token expira, usar `refreshToken` para obtener nuevo token

## 📡 Socket.IO

Para colaboración en tiempo real:

**Eventos principales:**
- `operation:updated` - Operación modificada
- `asset:updated` - Asset modificado
- `evaluation:updated` - Evaluación guardada
- `evidence:uploaded` - Nueva evidencia
- `comment:created` - Nuevo comentario
- `task:assigned` - Tarea asignada

**Uso:**
```typescript
socketService.onOperationUpdated((data) => {
  // Refrescar operación en UI
  refreshOperation(data.operationId);
});
```

## 📦 Próximos Pasos

1. **Conectar frontend a API:**
   - Actualizar `dataManagement.ts` para usar `apiClient`
   - Actualizar `AuthContext` para usar API real
   - Actualizar `EvidenceModal` para subir a S3

2. **Implementar Socket.IO:**
   - Conectar cuando usuario inicia sesión
   - Escuchar eventos y actualizar UI
   - Mostrar indicadores de "usuario X está editando"

3. **Testing:**
   - Probar todas las rutas API
   - Verificar permisos y roles
   - Probar subida de archivos

4. **Deployment:**
   - Configurar variables de entorno en producción
   - Configurar S3 bucket
   - Configurar base de datos en producción

## 🐛 Troubleshooting

**Error: "Cannot connect to database"**
- Verificar que PostgreSQL esté corriendo
- Verificar credenciales en `.env`
- Verificar que la base de datos exista

**Error: "JWT secret not configured"**
- Agregar `JWT_SECRET` en `.env`

**Error: "S3 upload failed"**
- Verificar credenciales AWS en `.env`
- Verificar que el bucket exista
- Para desarrollo local, puedes usar un servicio mock de S3

## 📚 Documentación API

Ver `backend/README.md` para documentación completa de todos los endpoints.
