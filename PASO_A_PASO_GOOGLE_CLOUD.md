# 🚀 GUÍA PASO A PASO: Configurar Google Cloud Console

## ⚠️ ERROR ACTUAL
Estás viendo este error porque Google Cloud Console NO está configurado:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID
```

**Solución:** Sigue estos pasos EXACTAMENTE.

---

## 📋 PASO 1: Abrir Google Cloud Console

1. Abre tu navegador
2. Ve a: **https://console.cloud.google.com/**
3. Inicia sesión con tu cuenta de Google
4. Si tienes múltiples proyectos, selecciona el proyecto correcto en el selector de proyectos (arriba a la izquierda)

---

## 📋 PASO 2: Ir a Credenciales

1. En el menú lateral izquierdo, busca **"APIs & Services"** (APIs y Servicios)
2. Haz clic en **"Credentials"** (Credenciales)
3. Verás una lista de credenciales

---

## 📋 PASO 3: Encontrar tu OAuth Client ID

1. En la lista de credenciales, busca una que diga **"OAuth 2.0 Client ID"**
2. Busca el que tenga este ID (o uno similar):
   ```
   169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
   ```
3. **Haz clic en el NOMBRE** de esa credencial (no en el icono de editar, sino en el nombre mismo)

---

## 📋 PASO 4: Configurar Authorized JavaScript origins

1. En la página de edición, busca la sección **"Authorized JavaScript origins"**
2. Verás un campo de texto o una lista
3. Haz clic en **"+ ADD URI"** (o el botón "+" o "Añadir URI")
4. En el campo que aparece, escribe EXACTAMENTE esto:
   ```
   http://localhost:3000
   ```
5. **VERIFICA que escribiste:**
   - ✅ `http://` (no `https://`)
   - ✅ `localhost` (no `127.0.0.1`)
   - ✅ `:3000` (el puerto)
   - ✅ **SIN** barra final `/`
   - ✅ **SIN** espacios antes o después

---

## 📋 PASO 5: Configurar Authorized redirect URIs

1. Busca la sección **"Authorized redirect URIs"**
2. Haz clic en **"+ ADD URI"** (o el botón "+" o "Añadir URI")
3. En el campo que aparece, escribe EXACTAMENTE esto:
   ```
   http://localhost:3000
   ```
4. **VERIFICA que escribiste exactamente igual que arriba:**
   - ✅ `http://localhost:3000`
   - ✅ Sin `https://`
   - ✅ Sin barra final `/`

---

## 📋 PASO 6: Guardar

1. Desplázate hacia abajo en la página
2. Busca el botón **"SAVE"** (Guardar) - normalmente está en la parte inferior
3. **Haz clic en SAVE**
4. Espera a que aparezca un mensaje de confirmación (puede tardar unos segundos)

---

## 📋 PASO 7: Esperar Propagación

**IMPORTANTE:** Los cambios en Google Cloud Console pueden tardar **1-2 minutos** en aplicarse.

Espera al menos **2 minutos** antes de probar.

---

## 📋 PASO 8: Verificar .env.local

Antes de probar, verifica que tienes el Client ID configurado:

1. Abre el archivo `.env.local` en la raíz de tu proyecto
2. Debe tener esta línea:
   ```env
   VITE_GOOGLE_CLIENT_ID=169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
   ```
3. Si no existe el archivo o no tiene esa línea:
   - Crea el archivo `.env.local` en la raíz del proyecto
   - Añade la línea de arriba
   - Guarda el archivo

---

## 📋 PASO 9: Reiniciar el Servidor

1. **Detén el servidor** (si está corriendo):
   - Presiona `Ctrl+C` en la terminal donde corre `npm run dev`

2. **Inicia el servidor de nuevo:**
   ```bash
   npm run dev
   ```

3. Espera a que el servidor inicie completamente

---

## 📋 PASO 10: Probar

1. **Abre el navegador en modo incógnito:**
   - Chrome/Edge: `Ctrl+Shift+N` (Windows) o `Cmd+Shift+N` (Mac)
   - Firefox: `Ctrl+Shift+P` (Windows) o `Cmd+Shift+P` (Mac)

2. **Ve a:** `http://localhost:3000`

3. **Abre la consola del navegador** (F12 → pestaña "Console")

4. **Deberías ver:**
   - ✅ El botón "CONTINUE WITH GOOGLE" visible
   - ✅ **NO** deberías ver el error `[GSI_LOGGER]: The given origin is not allowed`
   - ✅ **NO** deberías ver errores 403

5. **Haz clic en "CONTINUE WITH GOOGLE"**
   - Debería abrirse **UNA SOLA** pestaña de Google
   - Después de aceptar, deberías volver a la aplicación y estar logueado

---

## ❌ Si Aún No Funciona

### Verificar en Google Cloud Console

1. Vuelve a la página de edición de tu OAuth Client ID
2. Verifica que ves esto:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000
```

3. Si NO los ves, añádelos de nuevo y guarda

### Verificar en la Consola del Navegador

1. Abre la consola (F12)
2. Busca estos mensajes:

**❌ MAL (si ves esto, Google Cloud no está configurado):**
- `[GSI_LOGGER]: The given origin is not allowed`
- `Failed to load resource: 403`
- `Failed to open popup window`

**✅ BIEN (si NO ves esos errores):**
- El botón de Google aparece
- No hay errores relacionados con "origin" o "403"

### Limpiar Caché

1. Abre DevTools (F12)
2. Click derecho en el botón de recargar
3. Selecciona **"Empty Cache and Hard Reload"**

---

## 📸 Qué Deberías Ver en Google Cloud Console

Después de configurar correctamente, en la página de edición de tu OAuth Client ID deberías ver:

```
┌─────────────────────────────────────────┐
│ Authorized JavaScript origins           │
│                                         │
│ http://localhost:3000                   │
│                                         │
│ [+ ADD URI]                             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Authorized redirect URIs                 │
│                                         │
│ http://localhost:3000                   │
│                                         │
│ [+ ADD URI]                             │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist Final

Antes de probar, marca cada punto:

- [ ] Abrí Google Cloud Console
- [ ] Encontré mi OAuth Client ID
- [ ] Añadí `http://localhost:3000` en **Authorized JavaScript origins**
- [ ] Añadí `http://localhost:3000` en **Authorized redirect URIs**
- [ ] Guardé los cambios (botón SAVE)
- [ ] Esperé 2 minutos después de guardar
- [ ] Verifiqué que `.env.local` tiene el Client ID
- [ ] Reinicié el servidor (`npm run dev`)
- [ ] Abrí el navegador en modo incógnito
- [ ] Abrí la consola del navegador (F12)

---

## 🆘 Si Necesitas Ayuda

Si después de seguir TODOS estos pasos aún no funciona:

1. **Comparte una captura de pantalla** de:
   - La página de edición de OAuth Client ID en Google Cloud Console (mostrando las secciones de Authorized origins y redirect URIs)
   - La consola del navegador (F12 → Console)

2. **Verifica:**
   - ¿El servidor está corriendo en `http://localhost:3000`?
   - ¿El archivo `.env.local` existe y tiene el Client ID?
   - ¿Guardaste los cambios en Google Cloud Console?
   - ¿Esperaste 2 minutos después de guardar?

---

## 🎯 Resumen Rápido

**El problema:** Google Cloud Console no tiene `http://localhost:3000` autorizado.

**La solución:**
1. Ve a Google Cloud Console → Credentials → Tu OAuth Client ID
2. Añade `http://localhost:3000` en **Authorized JavaScript origins**
3. Añade `http://localhost:3000` en **Authorized redirect URIs**
4. Guarda
5. Espera 2 minutos
6. Reinicia el servidor
7. Prueba en modo incógnito

**Una vez configurado, el login funcionará perfectamente.**
