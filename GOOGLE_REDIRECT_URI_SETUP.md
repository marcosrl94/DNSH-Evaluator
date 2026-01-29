# 🔧 Configuración de Redirect URI para Google OAuth

## ❌ Error Actual

```
redirect_uri=https://dnsh-evaluator.vercel.app/
flowName=GeneralOAuthFlow
```

Este error indica que el redirect URI no está autorizado en Google Cloud Console.

## ✅ Solución: Configurar Redirect URIs en Google Cloud Console

### Paso 1: Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Selecciona tu proyecto
3. En el menú lateral, ve a **"APIs & Services"** → **"Credentials"**

### Paso 2: Editar el OAuth 2.0 Client ID

1. Busca el Client ID: `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2`
2. Haz clic en el nombre del Client ID para editarlo

### Paso 3: Agregar Authorized Redirect URIs

En la sección **"Authorized redirect URIs"**, haz clic en **"+ ADD URI"** y agrega **EXACTAMENTE** estas URLs:

```
https://dnsh-evaluator.vercel.app
https://dnsh-evaluator.vercel.app/
```

**IMPORTANTE**: 
- Agrega **AMBAS** variantes (con y sin `/` al final)
- Las URLs deben coincidir **EXACTAMENTE** (sin espacios, sin mayúsculas/minúsculas incorrectas)
- No agregues `http://` (solo `https://`)

### Paso 4: Agregar URLs de Preview (Opcional pero Recomendado)

Si usas preview deployments de Vercel, también agrega:

```
https://dnsh-evaluator-git-main-tu-usuario.vercel.app
https://dnsh-evaluator-git-main-tu-usuario.vercel.app/
```

Reemplaza `tu-usuario` con tu usuario de Vercel.

**O usa wildcards** (más fácil):
```
https://dnsh-evaluator-git-*-*.vercel.app
```

### Paso 5: Guardar Cambios

1. Haz clic en **"SAVE"** al final de la página
2. Espera unos segundos para que los cambios se propaguen

### Paso 6: Verificar

1. Ve a `https://dnsh-evaluator.vercel.app`
2. Intenta hacer login con Google
3. Debería funcionar correctamente

## 🔍 Verificación

### Lista de Redirect URIs que DEBEN estar configurados:

```
✅ https://dnsh-evaluator.vercel.app
✅ https://dnsh-evaluator.vercel.app/
```

### URLs Adicionales (si usas preview):

```
✅ https://dnsh-evaluator-git-main-tu-usuario.vercel.app
✅ https://dnsh-evaluator-git-main-tu-usuario.vercel.app/
```

O con wildcards:
```
✅ https://dnsh-evaluator-git-*-*.vercel.app
```

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"

**Causa**: El redirect URI en el código no coincide con los configurados en Google Cloud Console.

**Solución**:
1. Verifica que las URLs en Google Cloud Console coincidan **EXACTAMENTE** con `https://dnsh-evaluator.vercel.app` (sin barra final)
2. El código ahora usa `window.location.origin` sin barra final para consistencia
3. Asegúrate de haber guardado los cambios en Google Cloud Console

### Error: "access_denied"

**Causa**: El usuario canceló el login o no dio permisos.

**Solución**: Esto es normal, el usuario puede intentar de nuevo.

### Error: "invalid_client"

**Causa**: El Client ID no es correcto o no está activo.

**Solución**:
1. Verifica que el Client ID sea: `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2`
2. Verifica que el Client ID esté activo en Google Cloud Console
3. Verifica que `VITE_GOOGLE_CLIENT_ID` esté configurada en Vercel

## 📝 Checklist

- [ ] Accedido a Google Cloud Console
- [ ] Encontrado el Client ID correcto
- [ ] Agregado `https://dnsh-evaluator.vercel.app` (sin barra)
- [ ] Agregado `https://dnsh-evaluator.vercel.app/` (con barra)
- [ ] Guardados los cambios
- [ ] Esperado unos segundos para propagación
- [ ] Probado el login en Vercel

## 🔗 Enlaces Útiles

- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **Tu App**: https://dnsh-evaluator.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard

## 💡 Nota Importante

El código ahora usa `window.location.origin` sin barra final para asegurar consistencia. Esto significa que el redirect URI será siempre `https://dnsh-evaluator.vercel.app` (sin barra), pero es recomendable tener ambas variantes configuradas en Google Cloud Console por si acaso.
