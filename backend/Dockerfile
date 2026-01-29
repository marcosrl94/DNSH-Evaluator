# ============================================
# DNSH Evaluator Backend - Dockerfile
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para TypeScript)
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer puerto (Railway usa PORT automáticamente)
EXPOSE 3001

# Health check (usa PORT de Railway o 3001 por defecto)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3001; require('http').get(`http://localhost:${port}/health`, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/index.js"]
