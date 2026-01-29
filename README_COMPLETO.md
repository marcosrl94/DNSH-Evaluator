# 🚀 DNSH Evaluator - Guía Completa

## ✅ Estado del Proyecto

**Todas las mejoras profesionales están implementadas:**
- ✅ Tests automatizados
- ✅ Docker configurado
- ✅ Swagger/OpenAPI documentación
- ✅ Linting y formatting
- ✅ Monitoreo con Sentry
- ✅ Migraciones automatizadas
- ✅ Scripts de backup
- ✅ Seguridad mejorada
- ✅ Health checks avanzados

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env  # Editar con tus credenciales
npm run dev

# 2. Frontend (en otra terminal)
npm install
npm run dev
```

### Con Docker

```bash
docker-compose up
```

## 📚 Documentación API

Accede a `http://localhost:3001/api-docs` para ver la documentación interactiva de Swagger.

## 🧪 Tests

```bash
# Backend
cd backend
npm test

# Frontend
npm test
```

## 📝 Formateo y Linting

```bash
# Formatear código
npm run format
cd backend && npm run format

# Verificar formato
npm run format:check

# Linting
npm run lint
npm run lint:fix
```

## 💾 Backups

```bash
# Crear backup
cd backend
./scripts/backup.sh

# Restaurar backup
./scripts/restore.sh backups/backup_file.sql.gz
```

## 🔒 Seguridad

- Rate limiting configurado
- CSP headers activos
- Validación de entrada robusta
- Autenticación JWT con refresh tokens

## 📊 Monitoreo

Configura `SENTRY_DSN` en `.env` para habilitar error tracking.

## 🐳 Docker

Ver `docker-compose.yml` para desarrollo y producción.
