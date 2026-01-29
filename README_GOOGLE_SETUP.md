# 🚀 Configuración Rápida de Google OAuth

## Opción 1: Script Automático (Más Fácil) ⭐

Ejecuta en tu terminal:

```bash
./setup-google-oauth.sh
```

El script te guiará paso a paso y abrirá las páginas necesarias automáticamente.

## Opción 2: Guía Visual Detallada

Abre el archivo `GUIA_GOOGLE_CLIENT_ID.md` para ver la guía completa con todos los detalles.

## Opción 3: Configuración Manual Rápida

1. Ve a: https://console.cloud.google.com/
2. Crea proyecto → Habilita "Google Identity Services API"
3. Configura OAuth Consent Screen (External)
4. Crea OAuth Client ID (Web application)
5. Añade `http://localhost:5173` en origins y redirect URIs
6. Copia el Client ID
7. Pégalo en `.env.local`:
   ```env
   VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui
   ```
8. Recarga tu app

## ✅ Verificación

Después de configurar:
- El botón oficial de Google aparecerá
- Al hacer clic, se abrirá el popup de Google
- Podrás seleccionar tu cuenta
- Serás redirigido al dashboard

## 🆘 ¿Problemas?

Consulta `GUIA_GOOGLE_CLIENT_ID.md` en la sección "Problemas Comunes"
