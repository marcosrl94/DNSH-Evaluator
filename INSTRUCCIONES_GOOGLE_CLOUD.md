# 📋 Instrucciones Paso a Paso: Configurar Google Cloud Console

## 🎯 Objetivo
Configurar Google OAuth para que funcione con `http://localhost:3000`

---

## 📝 Paso 1: Ir a Google Cloud Console

1. Abre tu navegador y ve a: **https://console.cloud.google.com/**
2. Inicia sesión con tu cuenta de Google
3. Si tienes múltiples proyectos, selecciona el proyecto correcto (o créalo si no existe)

---

## 📝 Paso 2: Ir a Credenciales OAuth

1. En el menú lateral izquierdo, busca **"APIs & Services"**
2. Haz clic en **"Credentials"** (Credenciales)
3. Verás una lista de credenciales. Busca tu **OAuth 2.0 Client ID** con este ID:
   ```
   169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
   ```
4. **Haz clic en el nombre** de esa credencial para editarla

---

## 📝 Paso 3: Configurar Authorized JavaScript origins

1. En la página de edición, busca la sección **"Authorized JavaScript origins"**
2. Haz clic en **"+ ADD URI"** (o el botón de añadir)
3. Escribe EXACTAMENTE esto (sin espacios, sin https, sin barra final):
   ```
   http://localhost:3000
   ```
4. **IMPORTANTE:**
   - ✅ Debe empezar con `http://` (no `https://`)
   - ✅ Debe ser `localhost` (no `127.0.0.1`)
   - ✅ Debe terminar en `:3000` (sin barra `/` al final)
   - ❌ NO debe tener `https://`
   - ❌ NO debe tener `/` al final
   - ❌ NO debe ser `http://localhost:3000/`

---

## 📝 Paso 4: Configurar Authorized redirect URIs

1. Busca la sección **"Authorized redirect URIs"**
2. Haz clic en **"+ ADD URI"** (o el botón de añadir)
3. Escribe EXACTAMENTE esto (sin espacios, sin https, sin barra final):
   ```
   http://localhost:3000
   ```
4. **IMPORTANTE:** Mismas reglas que arriba:
   - ✅ `http://localhost:3000` (exactamente así)
   - ❌ NO `https://localhost:3000`
   - ❌ NO `http://localhost:3000/`
   - ❌ NO `http://127.0.0.1:3000`

---

## 📝 Paso 5: Guardar los Cambios

1. Desplázate hacia abajo en la página
2. Haz clic en el botón **"SAVE"** (Guardar) en la parte inferior
3. Espera unos segundos (Google puede tardar 1-2 minutos en propagar los cambios)

---

## 📝 Paso 6: Verificar la Configuración

Después de guardar, deberías ver en la página:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000
```

---

## 🧪 Paso 7: Probar en tu Aplicación

1. **Reinicia tu servidor de desarrollo:**
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a iniciarlo
   npm run dev
   ```

2. **Abre tu navegador en modo incógnito** (para evitar caché):
   - Chrome/Edge: `Ctrl+Shift+N` (Windows) o `Cmd+Shift+N` (Mac)
   - Firefox: `Ctrl+Shift+P` (Windows) o `Cmd+Shift+P` (Mac)

3. **Ve a:** `http://localhost:3000`

4. **Deberías ver:**
   - El botón "CONTINUE WITH GOOGLE" visible
   - Al hacer clic, se abre UNA SOLA pestaña de Google
   - Después de aceptar, vuelves a la aplicación y estás logueado

---

## ❌ Si Aún No Funciona

### Verificar en la Consola del Navegador

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca estos mensajes:

**✅ CORRECTO (no deberías ver estos):**
- ❌ `[GSI_LOGGER]: The given origin is not allowed`
- ❌ `Failed to open popup window`

**✅ CORRECTO (deberías ver):**
- El botón de Google renderizado
- Sin errores relacionados con "origin"

### Si Ves "The given origin is not allowed"

Esto significa que Google Cloud Console no está configurado correctamente:

1. **Verifica que escribiste exactamente:** `http://localhost:3000`
2. **Verifica que guardaste los cambios** (botón SAVE)
3. **Espera 1-2 minutos** después de guardar (Google necesita tiempo para propagar)
4. **Limpia la caché del navegador:**
   - Abre DevTools (F12)
   - Click derecho en el botón de recargar
   - Selecciona "Empty Cache and Hard Reload"

### Si No Aparece el Botón

1. **Verifica que tienes el Client ID en `.env.local`:**
   ```env
   VITE_GOOGLE_CLIENT_ID=169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
   ```

2. **Reinicia el servidor** después de añadir/modificar `.env.local`

3. **Abre la consola del navegador** y busca errores

---

## 📸 Capturas de Pantalla de Referencia

### Dónde Encontrar Credenciales:
```
Google Cloud Console
  → APIs & Services
    → Credentials
      → OAuth 2.0 Client IDs
        → [Tu Client ID]
```

### Qué Deberías Ver Después de Configurar:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000
```

---

## ✅ Checklist Final

Antes de probar, verifica:

- [ ] Tienes el Client ID en `.env.local`
- [ ] `http://localhost:3000` está en **Authorized JavaScript origins**
- [ ] `http://localhost:3000` está en **Authorized redirect URIs**
- [ ] Guardaste los cambios en Google Cloud Console
- [ ] Esperaste 1-2 minutos después de guardar
- [ ] Reiniciaste el servidor de desarrollo
- [ ] Abriste el navegador en modo incógnito

---

## 🆘 Si Necesitas Ayuda

Si después de seguir estos pasos aún no funciona:

1. **Comparte una captura de pantalla** de:
   - La página de Credenciales OAuth en Google Cloud Console
   - La consola del navegador (F12 → Console)

2. **Verifica que:**
   - El servidor está corriendo en `http://localhost:3000`
   - No hay errores en la consola del navegador
   - El archivo `.env.local` tiene el Client ID correcto

---

## 📝 Notas Importantes

- Los cambios en Google Cloud Console pueden tardar **1-2 minutos** en aplicarse
- Si cambias el puerto (ej: 3001), debes actualizar Google Cloud Console también
- En producción, necesitarás añadir tu dominio real (ej: `https://tu-dominio.com`)
