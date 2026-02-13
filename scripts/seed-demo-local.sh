#!/bin/bash
# Script para cargar la operación demo en local
# Requiere: Docker (o PostgreSQL corriendo) + backend/.env con DATABASE_URL

set -e

cd "$(dirname "$0")/.."
BACKEND_DIR="backend"

echo "🚀 Cargando operación demo en local..."
echo ""

# 1. Iniciar PostgreSQL si usas Docker
if command -v docker &> /dev/null; then
  echo "📦 Iniciando PostgreSQL con Docker..."
  docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null
  echo "⏳ Esperando que PostgreSQL esté listo..."
  sleep 5
else
  echo "⚠️  Docker no encontrado. Asegúrate de tener PostgreSQL corriendo en localhost:5432"
fi

# 2. Configurar DATABASE_URL si no existe
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "📝 Creando .env desde .env.example..."
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "   DATABASE_URL=postgresql://postgres:postgres_dev@localhost:5432/ecoinvest_dnsh_evaluator"
fi

# 3. Compilar y ejecutar migraciones del esquema
echo ""
echo "🔄 Compilando backend..."
cd "$BACKEND_DIR"
npm run build

echo ""
echo "📐 Aplicando migraciones del esquema..."
npm run db:schema

# 4. Ejecutar seed
echo ""
echo "🌱 Ejecutando seed de datos demo..."
npm run db:seed

echo ""
echo "✅ ¡Listo! Operación demo cargada."
echo "   Inicia sesión con: admin@ecoinvest.com / admin123"
echo ""
