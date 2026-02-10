# Configuración Correcta de Google OAuth

## Problema Identificado

El login de Google no funciona porque las URIs configuradas en Google Cloud Console no coinciden exactamente con las que usa la aplicación.

## Solución

### 1. Orígenes Autorizados de JavaScript

En Google Cloud Console, en la sección **"Orígenes autorizados de JavaScript"**, asegúrate de tener:

```
https://dnsh-evaluator.vercel.app
http://localhost:3000
http://localhost:5173
```

**Nota:** Agrega `http://localhost:5173` porque Vite puede usar ese puerto en desarrollo.

### 2. URIs de Redireccionamiento Autorizados

En la sección **"URIs de redireccionamiento autorizados"**, asegúrate de tener:

```
https://dnsh-evaluator.vercel.app
https://dnsh-evaluator.vercel.app/
http://localhost:3000
http://localhost:3000/
http://localhost:5173
http://localhost:5173/
```

**Importante:** 
- El código normaliza las URIs quitando el trailing slash (`/`), pero Google requiere ambas versiones (con y sin `/`)
- Incluye ambos puertos (3000 y 5173) para desarrollo

### 3. Verificación

Después de actualizar la configuración en Google Cloud Console:

1. Espera 5-10 minutos para que los cambios se propaguen
2. Prueba el login en:
   - Producción: `https://dnsh-evaluator.vercel.app`
   - Desarrollo local: `http://localhost:3000` o `http://localhost:5173`

### 4. Debug

Si aún no funciona, abre la consola del navegador y busca los logs:
- `[Google OAuth] Redirect URI:` - muestra qué URI está usando la app
- Verifica que coincida EXACTAMENTE con una de las URIs en Google Cloud Console

### 5. Errores Comunes

- **Error: "redirect_uri_mismatch"**: Las URIs no coinciden exactamente
- **Error: "access_denied"**: El origen JavaScript no está autorizado
- **Solución**: Asegúrate de que ambas listas (JavaScript Origins y Redirect URIs) tengan las mismas URIs base

## Configuración Recomendada Final

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
