#!/bin/bash
# Ejecutar el seed de datos demo en Railway
# Requiere: npx @railway/cli login (una vez)

set -e

cd "$(dirname "$0")/../backend"

echo "🌱 Ejecutando seed en Railway..."
npx @railway/cli run npm run db:seed

echo ""
echo "✅ Listo. Inicia sesión con admin@ecoinvest.com / admin123"
