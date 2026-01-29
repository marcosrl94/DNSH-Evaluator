#!/bin/bash

# Script de configuración de Google OAuth
# Este script te guiará para configurar Google OAuth

clear
echo "═══════════════════════════════════════════════════════════════"
echo "🔐 Configuración de Google OAuth para EcoInvest DNSH Evaluator"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Este script te guiará paso a paso para configurar Google OAuth."
echo ""
echo "📋 Necesitarás:"
echo "   ✓ Una cuenta de Google"
echo "   ✓ Acceso a Google Cloud Console"
echo "   ✓ 5-10 minutos de tu tiempo"
echo ""
echo "───────────────────────────────────────────────────────────────"
read -p "¿Tienes ya un Client ID de Google? (s/n): " has_client_id

if [ "$has_client_id" = "s" ] || [ "$has_client_id" = "S" ]; then
    read -p "Pega tu Client ID aquí: " client_id
    if [ ! -z "$client_id" ]; then
        # Create .env.local if it doesn't exist
        if [ ! -f .env.local ]; then
            cat > .env.local << EOF
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=$client_id

# Backend API Configuration (opcional)
VITE_USE_API=false
VITE_API_URL=http://localhost:3001/api/v1
EOF
            echo "✅ Archivo .env.local creado con tu Client ID"
        else
            # Update existing .env.local
            if grep -q "VITE_GOOGLE_CLIENT_ID" .env.local; then
                sed -i.bak "s/VITE_GOOGLE_CLIENT_ID=.*/VITE_GOOGLE_CLIENT_ID=$client_id/" .env.local
                echo "✅ Client ID actualizado en .env.local"
            else
                echo "VITE_GOOGLE_CLIENT_ID=$client_id" >> .env.local
                echo "✅ Client ID añadido a .env.local"
            fi
        fi
        echo ""
        echo "✅ Configuración completada!"
        echo "   Recarga tu aplicación para usar Google OAuth"
    else
        echo "❌ Client ID vacío. Por favor, ejecuta el script de nuevo."
    fi
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "📚 GUÍA PASO A PASO PARA OBTENER TU CLIENT ID"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Sigue estos pasos en orden:"
    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│ PASO 1: Crear/Seleccionar Proyecto                      │"
    echo "└─────────────────────────────────────────────────────────┘"
    echo "1. Ve a: https://console.cloud.google.com/"
    echo "2. Haz clic en el selector de proyectos (arriba)"
    echo "3. Crea un nuevo proyecto llamado 'EcoInvest DNSH Evaluator'"
    echo "4. Selecciona el proyecto recién creado"
    echo ""
    read -p "Presiona Enter cuando hayas completado el Paso 1..."
    
    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│ PASO 2: Habilitar Google Identity Services API          │"
    echo "└─────────────────────────────────────────────────────────┘"
    echo "1. Menú lateral > 'APIs & Services' > 'Library'"
    echo "2. Busca 'Google Identity Services API'"
    echo "3. Haz clic en 'ENABLE'"
    echo ""
    read -p "Presiona Enter cuando hayas completado el Paso 2..."
    
    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│ PASO 3: Configurar OAuth Consent Screen                │"
    echo "└─────────────────────────────────────────────────────────┘"
    echo "1. 'APIs & Services' > 'OAuth consent screen'"
    echo "2. Selecciona 'External'"
    echo "3. App name: 'EcoInvest DNSH Evaluator'"
    echo "4. User support email: Tu email"
    echo "5. Developer contact: Tu email"
    echo "6. En Scopes, añade: email, profile, openid"
    echo "7. En Test users, añade tu email"
    echo "8. Guarda y continúa hasta completar"
    echo ""
    read -p "Presiona Enter cuando hayas completado el Paso 3..."
    
    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│ PASO 4: Crear Credenciales OAuth 2.0                    │"
    echo "└─────────────────────────────────────────────────────────┘"
    echo "1. 'APIs & Services' > 'Credentials'"
    echo "2. '+ CREATE CREDENTIALS' > 'OAuth client ID'"
    echo "3. Application type: 'Web application'"
    echo "4. Name: 'EcoInvest DNSH Evaluator Web Client'"
    echo "5. Authorized JavaScript origins:"
    echo "   → Añade: http://localhost:3000"
    echo "6. Authorized redirect URIs:"
    echo "   → Añade: http://localhost:3000"
    echo "7. Haz clic en 'CREATE'"
    echo "8. ⚠️  COPIA EL CLIENT ID que aparece en el popup"
    echo ""
    read -p "Presiona Enter cuando tengas tu Client ID copiado..."
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "💾 CONFIGURAR CLIENT ID EN TU PROYECTO"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    read -p "Pega tu Client ID aquí: " client_id
    
    if [ ! -z "$client_id" ]; then
        # Create .env.local if it doesn't exist
        if [ ! -f .env.local ]; then
            cat > .env.local << EOF
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=$client_id

# Backend API Configuration (opcional)
VITE_USE_API=false
VITE_API_URL=http://localhost:3001/api/v1
EOF
            echo ""
            echo "✅ Archivo .env.local creado con tu Client ID"
        else
            # Update existing .env.local
            if grep -q "VITE_GOOGLE_CLIENT_ID" .env.local; then
                # Backup original
                cp .env.local .env.local.bak
                sed -i.bak "s/VITE_GOOGLE_CLIENT_ID=.*/VITE_GOOGLE_CLIENT_ID=$client_id/" .env.local 2>/dev/null || \
                sed -i '' "s/VITE_GOOGLE_CLIENT_ID=.*/VITE_GOOGLE_CLIENT_ID=$client_id/" .env.local
                echo ""
                echo "✅ Client ID actualizado en .env.local"
            else
                echo "VITE_GOOGLE_CLIENT_ID=$client_id" >> .env.local
                echo ""
                echo "✅ Client ID añadido a .env.local"
            fi
        fi
        
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        echo "🎉 ¡CONFIGURACIÓN COMPLETADA!"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        echo "✅ Tu Client ID ha sido guardado en .env.local"
        echo ""
        echo "📋 Próximos pasos:"
        echo "   1. Recarga tu aplicación (detén y vuelve a iniciar npm run dev)"
        echo "   2. Ve a la página de login"
        echo "   3. Haz clic en 'CONTINUE WITH GOOGLE'"
        echo "   4. Deberías ver el popup de Google para seleccionar tu cuenta"
        echo ""
        echo "📖 Para más detalles, consulta: GUIA_GOOGLE_CLIENT_ID.md"
        echo ""
    else
        echo ""
        echo "❌ Client ID vacío. Por favor, ejecuta el script de nuevo."
    fi
fi
