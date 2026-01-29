# 🔐 Configuración Rápida de Google OAuth

## Opción 1: Script Automático (Recomendado)

```bash
./setup-google-oauth.sh
```

El script te guiará paso a paso.

## Opción 2: Configuración Manual

### Paso 1: Crear proyecto en Google Cloud Console

1. Ve a: **https://console.cloud.google.com/**
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el nombre del proyecto

### Paso 2: Habilitar Google Identity Services API

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca **"Google Identity Services API"**
3. Haz clic en **Enable**

### Paso 3: Configurar OAuth Consent Screen

1. Ve a **APIs & Services** > **OAuth consent screen**
2. Selecciona **External** (o Internal si tienes Google Workspace)
3. Completa:
   - **App name**: `EcoInvest DNSH Evaluator`
   - **User support email**: Tu email
   - **Developer contact information**: Tu email
4. Haz clic en **Save and Continue**
5. En **Scopes**, haz clic en **Add or Remove Scopes**
6. Selecciona:
   - `email`
   - `profile`
   - `openid`
7. Haz clic en **Update** y luego **Save and Continue**
8. En **Test users** (si es External), añade tu email de prueba
9. Haz clic en **Save and Continue** hasta completar

### Paso 4: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth client ID**
3. Si te pide configurar el consent screen primero, sigue el Paso 3
4. Selecciona **Web application**
5. Configura:
   - **Name**: `EcoInvest DNSH Evaluator Web Client`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     ```
     (Añade tu dominio de producción después)
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000
     ```
     (Añade tu dominio de producción después)
6. Haz clic en **Create**
7. **Copia el Client ID** que aparece (algo como: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

### Paso 5: Configurar en tu proyecto

1. Crea o edita el archivo `.env.local` en la raíz del proyecto:
   ```bash
   touch .env.local
   ```

2. Añade tu Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
   ```

3. Recarga tu aplicación:
   ```bash
   npm run dev
   ```

### Paso 6: Probar

1. Abre tu aplicación en el navegador
2. Ve a la página de login
3. Haz clic en **"CONTINUE WITH GOOGLE"**
4. Deberías ver el popup de Google para seleccionar tu cuenta
5. Selecciona tu cuenta y autoriza
6. ¡Deberías ser redirigido al dashboard!

## ✅ Verificación

Si todo está configurado correctamente:
- ✅ Verás el botón oficial de Google (no el demo)
- ✅ Al hacer clic, se abre el popup de Google
- ✅ Puedes seleccionar tu cuenta de Google
- ✅ Después del login, eres redirigido al dashboard

## 🐛 Solución de Problemas

### El botón no aparece
- Verifica que `.env.local` existe y tiene `VITE_GOOGLE_CLIENT_ID`
- Verifica que el Client ID no tiene espacios extra
- Recarga completamente la aplicación (Ctrl+Shift+R)

### Error "redirect_uri_mismatch"
- Verifica que `http://localhost:3000` está en "Authorized JavaScript origins"
- Verifica que `http://localhost:3000` está en "Authorized redirect URIs"
- Asegúrate de que la URL en el navegador coincide exactamente

### Error "access_denied"
- Verifica que tu email está en "Test users" (si es External)
- Verifica que el OAuth Consent Screen está publicado o en modo Testing

### El popup no se abre
- Verifica que no hay bloqueadores de popups activos
- Verifica la consola del navegador para errores
- Asegúrate de que el script de Google se carga correctamente

## 📚 Recursos

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
