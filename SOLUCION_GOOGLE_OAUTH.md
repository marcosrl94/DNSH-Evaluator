# 🔧 Solución: Problemas con Google OAuth

## 🔍 Problemas Comunes y Soluciones

### ❌ Error: "redirect_uri_mismatch"
Este es el error más común. Ocurre cuando el `redirect_uri` usado en el código NO coincide EXACTAMENTE con lo configurado en Google Cloud Console.

### ✅ Solución Paso a Paso

#### 1. Verificar la URL Actual de tu Aplicación

Abre la consola del navegador (F12) y ejecuta:
```javascript
console.log('Origin:', window.location.origin);
```

Esto te mostrará la URL exacta que está usando tu aplicación (ej: `https://dnsh-evaluator.vercel.app`).

#### 2. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Selecciona tu proyecto
3. Abre el OAuth 2.0 Client ID: `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2`
4. Haz clic en **EDITAR** (lápiz)

#### 3. Configurar "Orígenes Autorizados de JavaScript"

En la sección **"Authorized JavaScript origins"**, añade EXACTAMENTE:

```
https://dnsh-evaluator.vercel.app
```

**IMPORTANTE:**
- ✅ Debe empezar con `https://`
- ✅ NO debe terminar con `/` (sin barra final)
- ✅ Debe coincidir EXACTAMENTE con `window.location.origin`

Si también usas localhost para desarrollo, añade también:
```
http://localhost:3000
```

#### 4. Configurar "URIs de Redireccionamiento Autorizados"

En la sección **"Authorized redirect URIs"**, añade AMBAS URLs:

```
https://dnsh-evaluator.vercel.app
https://dnsh-evaluator.vercel.app/
```

**IMPORTANTE:**
- ✅ Añade AMBAS (con y sin barra final) para evitar problemas
- ✅ Debe empezar con `https://`
- ✅ Debe coincidir EXACTAMENTE con lo que usa el código

Si también usas localhost para desarrollo, añade también:
```
http://localhost:3000
http://localhost:3000/
```

#### 5. Guardar y Esperar

1. Haz clic en **GUARDAR**
2. Espera 1-2 minutos para que los cambios se propaguen
3. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

#### 6. Verificar la Configuración

Después de guardar, verifica que ambas secciones tengan las URLs correctas:

**Orígenes Autorizados de JavaScript:**
- ✅ `https://dnsh-evaluator.vercel.app`
- ✅ `http://localhost:3000` (si desarrollas localmente)

**URIs de Redireccionamiento Autorizados:**
- ✅ `https://dnsh-evaluator.vercel.app`
- ✅ `https://dnsh-evaluator.vercel.app/`
- ✅ `http://localhost:3000` (si desarrollas localmente)
- ✅ `http://localhost:3000/` (si desarrollas localmente)

## 🐛 Otros Problemas Comunes

### Error: "The given origin is not allowed"
**Causa:** El dominio desde el que se hace la solicitud no está en "Orígenes Autorizados de JavaScript"

**Solución:** Añade el dominio exacto (sin barra final) a "Orígenes Autorizados de JavaScript"

### Error: "Access blocked: This app's request is invalid"
**Causa:** El Client ID no es correcto o la aplicación OAuth no está configurada correctamente

**Solución:**
1. Verifica que el Client ID en el código sea: `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com`
2. Verifica que la "OAuth consent screen" esté configurada correctamente

### Error: "popup_closed_by_user" o ventana se cierra inmediatamente
**Causa:** El código está intentando usar popup pero está bloqueado

**Solución:** El código ya está configurado para usar solo redirect mode. Si ves este error, puede ser caché del navegador. Limpia la caché y prueba de nuevo.

## 🔍 Debugging

### Verificar en la Consola del Navegador

1. Abre la consola (F12)
2. Intenta hacer login con Google
3. Busca estos mensajes:
   - `[Google OAuth] Redirect URI: https://dnsh-evaluator.vercel.app`
   - `[Google OAuth] Full auth URL: ...`

### Verificar la URL después del Redirect

Después de hacer clic en "CONTINUE WITH GOOGLE", la URL debería cambiar a:
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...
```

Después de autenticarte, Google te redirigirá a:
```
https://dnsh-evaluator.vercel.app/#id_token=...
```

Si ves un error en la URL, verifica:
- Que el `redirect_uri` en la URL coincida EXACTAMENTE con lo configurado en Google Cloud Console
- Que no haya espacios o caracteres especiales

## ✅ Checklist de Verificación

Antes de probar el login, verifica:

- [ ] Google Cloud Console está abierto y el Client ID es correcto
- [ ] "Orígenes Autorizados de JavaScript" incluye `https://dnsh-evaluator.vercel.app` (sin barra final)
- [ ] "URIs de Redireccionamiento Autorizados" incluye AMBAS:
  - [ ] `https://dnsh-evaluator.vercel.app` (sin barra final)
  - [ ] `https://dnsh-evaluator.vercel.app/` (con barra final)
- [ ] Los cambios se guardaron en Google Cloud Console
- [ ] Esperaste 1-2 minutos después de guardar
- [ ] Limpiaste la caché del navegador
- [ ] Probaste en modo incógnito (para evitar caché)

## 📝 Notas Importantes

1. **Coincidencia Exacta:** El `redirect_uri` debe coincidir EXACTAMENTE con lo configurado en Google Cloud Console. Cualquier diferencia (espacios, barras, protocolo) causará un error.

2. **Propagación de Cambios:** Los cambios en Google Cloud Console pueden tardar 1-2 minutos en propagarse. Si acabas de hacer cambios, espera un momento antes de probar.

3. **Caché del Navegador:** El navegador puede cachear configuraciones antiguas. Siempre prueba en modo incógnito después de hacer cambios.

4. **Protocolo HTTPS:** En producción, siempre usa `https://`. Google OAuth requiere HTTPS en producción (excepto para localhost).

5. **Múltiples Entornos:** Si tienes múltiples entornos (producción, staging, desarrollo), añade todas las URLs a Google Cloud Console.

## 🎯 Resumen Rápido

**El problema más común es que el `redirect_uri` no coincide exactamente con lo configurado en Google Cloud Console.**

**Solución:**
1. Añade `https://dnsh-evaluator.vercel.app` (sin barra) a "Orígenes Autorizados"
2. Añade AMBAS `https://dnsh-evaluator.vercel.app` y `https://dnsh-evaluator.vercel.app/` a "URIs de Redireccionamiento"
3. Guarda y espera 1-2 minutos
4. Limpia la caché del navegador
5. Prueba de nuevo

Si después de seguir estos pasos aún tienes problemas, revisa la consola del navegador para ver el error exacto y el `redirect_uri` que se está usando.
