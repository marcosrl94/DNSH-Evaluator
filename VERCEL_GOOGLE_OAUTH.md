# Configuración de Google OAuth para Vercel

## URL de Producción
```
https://dnsh-evaluator.vercel.app
```

## Configuración Requerida en Google Cloud Console

### 1. Orígenes Autorizados de JavaScript
En Google Cloud Console → Credenciales → Tu Client ID → **"Orígenes autorizados de JavaScript"**, agrega:

```
https://dnsh-evaluator.vercel.app
```

**IMPORTANTE:** 
- Sin trailing slash (`/`)
- Sin `http://` (solo `https://`)
- Sin rutas adicionales (solo el dominio base)

### 2. URIs de Redireccionamiento Autorizados
En **"URIs de redireccionamiento autorizados"**, agrega:

```
https://dnsh-evaluator.vercel.app
https://dnsh-evaluator.vercel.app/
```

**IMPORTANTE:**
- Incluye AMBAS versiones (con y sin trailing slash)
- El código normaliza quitando el `/`, pero Google requiere ambas en la configuración

## Verificación

1. **Guarda los cambios** en Google Cloud Console
2. **Espera 5-10 minutos** para que los cambios se propaguen
3. **Abre la consola del navegador** (F12) en tu app de Vercel
4. **Haz clic en "Continuar con Google"**
5. **Revisa los logs** en la consola:
   ```
   [Google OAuth] Redirect URI: https://dnsh-evaluator.vercel.app
   ```
6. **Verifica** que esta URI coincida EXACTAMENTE con una de las configuradas

## Errores Comunes

### Error: "redirect_uri_mismatch"
- **Causa:** La URI en el código no coincide con las configuradas
- **Solución:** Verifica que `https://dnsh-evaluator.vercel.app` esté en AMBAS listas (JavaScript Origins Y Redirect URIs)

### Error: "access_denied"
- **Causa:** El origen JavaScript no está autorizado
- **Solución:** Asegúrate de que `https://dnsh-evaluator.vercel.app` esté en "Orígenes autorizados de JavaScript"

### El login redirige pero no procesa el token
- **Causa:** El callback no está detectando el token correctamente
- **Solución:** Revisa la consola del navegador para ver si hay errores de procesamiento

## Debug en Producción

El código incluye logs de debug que puedes ver en la consola del navegador:

```javascript
[Google OAuth] Initiating login...
[Google OAuth] Redirect URI: https://dnsh-evaluator.vercel.app
[Google OAuth] Make sure this URI is in Google Cloud Console:
[Google OAuth]   - Authorized JavaScript origins: https://dnsh-evaluator.vercel.app
[Google OAuth]   - Authorized redirect URIs: https://dnsh-evaluator.vercel.app and https://dnsh-evaluator.vercel.app/
```

Si ves estos logs, verifica que las URIs mostradas coincidan exactamente con las configuradas en Google Cloud Console.

## Configuración Final Recomendada

### Orígenes Autorizados de JavaScript:
```
https://dnsh-evaluator.vercel.app
http://localhost:3000
http://localhost:5173
```

### URIs de Redireccionamiento Autorizados:
```
https://dnsh-evaluator.vercel.app
https://dnsh-evaluator.vercel.app/
http://localhost:3000
http://localhost:3000/
http://localhost:5173
http://localhost:5173/
```
