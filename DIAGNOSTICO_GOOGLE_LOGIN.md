# Diagnóstico: Login con Google no funciona

## Comprobaciones rápidas

### 1. Backend (Railway)
```bash
curl https://dnsh-evaluator-production.up.railway.app/health
```
Debe devolver `{"status":"ok",...}` con HTTP 200.

### 2. API de Google
```bash
curl -X POST https://dnsh-evaluator-production.up.railway.app/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -H "Origin: https://dnsh-evaluator.vercel.app" \
  -d '{"credential":"test"}'
```
Si el backend responde (aunque sea 400 por credential inválida), la conexión funciona.

### 3. En el navegador (F12 → pestaña Network)

1. Abre https://dnsh-evaluator.vercel.app
2. Abre DevTools (F12) → pestaña **Network**
3. Haz clic en "Continuar con Google"
4. Observa las peticiones:
   - ¿Hay una petición a `dnsh-evaluator-production.up.railway.app`?
   - Si va a `dnsh-evaluator.vercel.app` → la API está mal configurada
   - Si va a Railway pero falla → revisa el código de estado (405, 403, etc.)

### 4. Consola del navegador (F12 → Console)

- Busca mensajes `[Google OAuth]` o `[API]`
- En desarrollo verás `[API] Base URL: ...` → confirma que apunta a Railway

### 5. Variables en Vercel

- `VITE_USE_API` = `true`
- `VITE_API_URL` = `https://dnsh-evaluator-production.up.railway.app/api/v1`
- `VITE_GOOGLE_CLIENT_ID` = tu Client ID de Google Cloud

### 6. Google Cloud Console

- **Authorized JavaScript origins**: `https://dnsh-evaluator.vercel.app`
- **Authorized redirect URIs**: `https://dnsh-evaluator.vercel.app`, `https://dnsh-evaluator.vercel.app/`

### 7. Railway

- `CORS_ORIGIN` = `https://dnsh-evaluator.vercel.app`
- `ALLOWED_DOMAINS` = `gmail.com,googlemail.com`
