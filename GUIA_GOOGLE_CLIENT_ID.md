# 🎯 Guía Paso a Paso: Obtener Google Client ID

## 📋 Resumen Rápido

Necesitas crear credenciales OAuth 2.0 en Google Cloud Console. Tiempo estimado: **5-10 minutos**.

---

## 🚀 Paso 1: Acceder a Google Cloud Console

1. **Abre tu navegador** y ve a:
   ```
   https://console.cloud.google.com/
   ```

2. **Inicia sesión** con tu cuenta de Google

3. Si es tu primera vez, acepta los términos y condiciones

---

## 📁 Paso 2: Crear o Seleccionar un Proyecto

### Opción A: Crear un Nuevo Proyecto (Recomendado)

1. En la parte superior, haz clic en el **selector de proyectos** (junto al logo de Google Cloud)
2. Haz clic en **"NEW PROJECT"** o **"NUEVO PROYECTO"**
3. Completa:
   - **Project name**: `EcoInvest DNSH Evaluator`
   - **Organization**: (deja el que viene por defecto)
   - **Location**: (deja el que viene por defecto)
4. Haz clic en **"CREATE"** o **"CREAR"**
5. Espera unos segundos a que se cree el proyecto
6. Selecciona el proyecto recién creado desde el selector de proyectos

### Opción B: Usar un Proyecto Existente

1. En el selector de proyectos, selecciona el proyecto que quieras usar

---

## 🔌 Paso 3: Habilitar Google Identity Services API

1. En el menú lateral izquierdo, busca y haz clic en **"APIs & Services"** o **"APIs y servicios"**
2. Haz clic en **"Library"** o **"Biblioteca"**
3. En el buscador, escribe: **"Google Identity Services API"**
4. Haz clic en el resultado **"Google Identity Services API"**
5. Haz clic en el botón **"ENABLE"** o **"HABILITAR"**
6. Espera unos segundos hasta que aparezca el mensaje de confirmación

---

## ⚙️ Paso 4: Configurar OAuth Consent Screen

1. En el menú lateral, ve a **"APIs & Services"** > **"OAuth consent screen"** o **"Pantalla de consentimiento de OAuth"**

2. Selecciona **"External"** (a menos que tengas Google Workspace, entonces usa "Internal")
   - Haz clic en **"CREATE"** o **"CREAR"**

3. **Paso 1: App information**
   - **App name**: `EcoInvest DNSH Evaluator`
   - **User support email**: Selecciona tu email
   - **App logo**: (opcional, puedes saltarlo)
   - **App domain**: (opcional, puedes saltarlo)
   - **Application home page**: `http://localhost:3000`
   - **Authorized domains**: (déjalo vacío por ahora)
   - **Developer contact information**: Tu email
   - Haz clic en **"SAVE AND CONTINUE"** o **"GUARDAR Y CONTINUAR"**

4. **Paso 2: Scopes**
   - Haz clic en **"ADD OR REMOVE SCOPES"** o **"AGREGAR O QUITAR ALCANCES"**
   - Busca y selecciona:
     - ✅ `.../auth/userinfo.email`
     - ✅ `.../auth/userinfo.profile`
     - ✅ `openid`
   - Haz clic en **"UPDATE"** o **"ACTUALIZAR"**
   - Haz clic en **"SAVE AND CONTINUE"** o **"GUARDAR Y CONTINUAR"**

5. **Paso 3: Test users** (solo si seleccionaste "External")
   - Haz clic en **"ADD USERS"** o **"AGREGAR USUARIOS"**
   - Añade tu email de Google
   - Haz clic en **"ADD"** o **"AGREGAR"**
   - Haz clic en **"SAVE AND CONTINUE"** o **"GUARDAR Y CONTINUAR"**

6. **Paso 4: Summary**
   - Revisa la información
   - Haz clic en **"BACK TO DASHBOARD"** o **"VOLVER AL PANEL"**

---

## 🔑 Paso 5: Crear Credenciales OAuth 2.0

1. En el menú lateral, ve a **"APIs & Services"** > **"Credentials"** o **"Credenciales"**

2. Haz clic en **"+ CREATE CREDENTIALS"** o **"+ CREAR CREDENCIALES"** (arriba a la izquierda)

3. Selecciona **"OAuth client ID"** o **"ID de cliente de OAuth"**

4. Si te aparece un mensaje sobre configurar el consent screen, haz clic en **"CONFIGURE CONSENT SCREEN"** y completa el Paso 4 primero

5. **Application type**: Selecciona **"Web application"** o **"Aplicación web"**

6. **Name**: `EcoInvest DNSH Evaluator Web Client`

7. **Authorized JavaScript origins**:
   - Haz clic en **"+ ADD URI"** o **"+ AGREGAR URI"**
   - Añade: `http://localhost:3000`
   - (Para producción, añade también tu dominio, ej: `https://tu-dominio.com`)

8. **Authorized redirect URIs**:
   - Haz clic en **"+ ADD URI"** o **"+ AGREGAR URI"**
   - Añade: `http://localhost:3000`
   - (Para producción, añade también tu dominio)

9. Haz clic en **"CREATE"** o **"CREAR"**

10. **¡IMPORTANTE!** Se abrirá un popup con tu Client ID:
    - **Client ID**: Algo como `123456789-abcdefghijklmnop.apps.googleusercontent.com`
    - **Client secret**: (No lo necesitas para este flujo)
    - **COPIA EL CLIENT ID** y guárdalo en un lugar seguro

---

## 💾 Paso 6: Configurar en tu Proyecto

1. Abre el archivo `.env.local` en la raíz de tu proyecto

2. Busca la línea:
   ```env
   VITE_GOOGLE_CLIENT_ID=
   ```

3. Pega tu Client ID después del `=`:
   ```env
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```
   (Reemplaza con tu Client ID real)

4. Guarda el archivo

---

## ✅ Paso 7: Probar

1. **Recarga completamente** tu aplicación:
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a iniciarlo
   npm run dev
   ```

2. Abre tu navegador en `http://localhost:3000`

3. Ve a la página de login

4. Deberías ver el **botón oficial de Google** (no el demo)

5. Haz clic en **"CONTINUE WITH GOOGLE"**

6. Se abrirá el **popup de Google** para seleccionar tu cuenta

7. Selecciona tu cuenta y autoriza

8. ¡Deberías ser redirigido al dashboard!

---

## 🐛 Problemas Comunes

### "redirect_uri_mismatch"
**Solución**: Verifica que `http://localhost:3000` está exactamente igual en:
- Authorized JavaScript origins
- Authorized redirect URIs
- La URL de tu navegador

### "access_denied"
**Solución**: 
- Si usaste "External", asegúrate de que tu email está en "Test users"
- O cambia a "Internal" si tienes Google Workspace

### El botón no aparece
**Solución**:
- Verifica que `.env.local` tiene el Client ID correcto
- Verifica que no hay espacios extra
- Recarga completamente (Ctrl+Shift+R)

### El popup no se abre
**Solución**:
- Desactiva bloqueadores de popups
- Verifica la consola del navegador (F12) para errores
- Asegúrate de que el script de Google se carga

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas en algún paso:
1. Toma una captura de pantalla del error
2. Revisa la consola del navegador (F12)
3. Verifica que seguiste todos los pasos

---

## 🎉 ¡Listo!

Una vez configurado, el login con Google funcionará igual que en CapitalEngine:
- Botón oficial de Google
- Popup para seleccionar cuenta
- Autenticación segura
- Redirección automática
