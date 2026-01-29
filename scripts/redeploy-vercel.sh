#!/bin/bash

# Script para hacer redeploy en Vercel
# Uso: ./scripts/redeploy-vercel.sh

echo "🚀 Iniciando redeploy en Vercel..."

# Verificar si vercel CLI está disponible
if ! command -v vercel &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Error: Vercel CLI no está disponible"
    echo "💡 Instala con: npm install -g vercel"
    exit 1
fi

# Intentar hacer redeploy
if command -v vercel &> /dev/null; then
    echo "📦 Usando Vercel CLI global..."
    vercel --prod
else
    echo "📦 Usando Vercel CLI vía npx..."
    npx vercel --prod
fi

echo "✅ Redeploy iniciado. Verifica el estado en https://vercel.com/dashboard"
