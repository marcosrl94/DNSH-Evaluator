# 🔧 Fix: Error 405 en Google OAuth con Vercel

## ❌ Problema

Cuando intentas hacer login con Google en `dnsh-evaluator.vercel.app`, recibes un error **HTTP 405**.

## 🔍 Causa

El error 405 ocurre porque:
1. Google está haciendo redirect a tu dominio de Vercel
2. Vercel está interceptando la request antes de que el cliente pueda procesar el hash fragment con el `id_token`
3. El redirect URI puede no estar configurado correctamente en Google Cloud Console

## ✅ Solución

### Paso 1: Verificar Redirect URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Selecciona tu proyecto
3. Abre el OAuth 2.0 Client ID: `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2`
4. En **"Authorized redirect URIs"**, asegúrate de tener:

```
https://dnsh-evaluator.vercel.app
https://dnsh-evaluator.vercel.app/
https://dnsh-evaluator-git-main-tu-usuario.vercel.app
https://dnsh-evaluator-git-main-tu-usuario.vercel.app/
```

**IMPORTANTE**: 
- Agrega ambas URLs (con y sin `/` al final)
- Agrega también las URLs de preview si las usas
- Puedes usar wildcards: `https://dnsh-evaluator-git-*-tu-usuario.vercel.app`

### Paso 2: Verificar que Vercel esté sirviendo index.html correctamente

El `vercel.json` ya está configurado para redirigir todas las rutas a `index.html`, pero verifica:

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **General**
3. Verifica que **"Framework Preset"** sea **Vite**
4. Verifica que **"Output Directory"** sea `dist`

### Paso 3: Limpiar caché y hacer nuevo deploy

1. En Vercel, ve a **Deployments**
2. Haz clic en los tres puntos del último deploy
3. Selecciona **"Redeploy"**
4. Espera a que termine

### Paso 4: Probar el login

1. Ve a `https://dnsh-evaluator.vercel.app`
2. Haz clic en "CONTINUE WITH GOOGLE"
3. Debería redirigirte a Google
4. Después de autenticarte, Google te redirigirá de vuelta
5. El código debería detectar el `id_token` en el hash y procesarlo

## 🔍 Debugging

### Verificar en la consola del navegador

1. Abre la consola (F12)
2. Intenta hacer login con Google
3. Busca errores en la consola
4. Verifica que la URL después del redirect tenga el formato:
   ```
   https://dnsh-evaluator.vercel.app/#id_token=...
   ```

### Verificar logs de Vercel

1. Ve a **Deployments** → Último deploy → **View Logs**
2. Busca errores relacionados con el redirect

### Verificar configuración de Google

El código está buscando el `id_token` en:
- Query parameter: `?credential=...`
- Hash fragment: `#id_token=...`

Google OAuth con `response_type=id_token` debería usar el hash fragment.

## 🐛 Si sigue fallando

### Opción 1: Usar una ruta específica para el callback

Puedes crear una ruta específica como `/auth/callback` y configurarla en Google Cloud Console:

1. En Google Cloud Console, agrega:
   ```
   https://dnsh-evaluator.vercel.app/auth/callback
   ```

2. Actualiza el código para usar esta ruta específica (requiere cambios en el código)

### Opción 2: Verificar que el Client ID sea correcto

Asegúrate de que el Client ID en el código coincida con el de Google Cloud Console:
- Código: `169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2`
- Google Cloud Console: Debe ser el mismo

### Opción 3: Verificar variables de entorno en Vercel

Asegúrate de que `VITE_GOOGLE_CLIENT_ID` esté configurada en Vercel:
1. Ve a **Settings** → **Environment Variables**
2. Verifica que `VITE_GOOGLE_CLIENT_ID` esté configurada
3. Asegúrate de que esté aplicada a **Production**

## 📝 Checklist

- [ ] Redirect URIs configurados en Google Cloud Console
- [ ] URLs incluyen tanto con `/` como sin `/`
- [ ] URLs de preview también agregadas
- [ ] `VITE_GOOGLE_CLIENT_ID` configurada en Vercel
- [ ] Nuevo deploy hecho después de cambiar configuración
- [ ] Caché del navegador limpiada
- [ ] Probado en modo incógnito

## 🔗 URLs importantes

- **Tu app**: https://dnsh-evaluator.vercel.app
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **Vercel Dashboard**: https://vercel.com/dashboard
