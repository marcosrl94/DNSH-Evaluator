# Checklist: Login con Google en producción

Si ves **HTTP 405** o el login con Google no funciona en dnsh-evaluator.vercel.app:

## 1. Vercel – Variables de entorno

En **Vercel** → proyecto → **Settings** → **Environment Variables** (Production):

| Variable | Valor |
|----------|-------|
| `VITE_USE_API` | `true` |
| `VITE_API_URL` | `https://dnsh-evaluator-production.up.railway.app/api/v1` |
| `VITE_SOCKET_URL` | `https://dnsh-evaluator-production.up.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | Tu Client ID de Google Cloud Console |

Tras cambiar variables → **Redeploy** del proyecto.

## 2. Railway – Variables

En **Railway** → backend → **Variables**:

| Variable | Valor |
|----------|-------|
| `CORS_ORIGIN` | `https://dnsh-evaluator.vercel.app` |
| `GOOGLE_CLIENT_ID` | El mismo que en Vercel (opcional, backend puede validar sin él) |
| `ALLOWED_DOMAINS` | `gmail.com,googlemail.com` (si quieres restringir dominios) |

## 3. Google Cloud Console

En [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials):

- **Authorized JavaScript origins**: `https://dnsh-evaluator.vercel.app` (obligatorio para popup)
- **Authorized redirect URIs**: `https://dnsh-evaluator.vercel.app`, `https://dnsh-evaluator.vercel.app/` (por si acaso)

> **Nota**: La app usa modo **popup** (no redirect). Google devuelve la credential por callback JS y el front hace POST a Railway. Así evitamos el 405 que Vercel devuelve para POST.

## 4. Comprobar

1. Backend activo: `https://dnsh-evaluator-production.up.railway.app/health` → debe responder `{"status":"ok"}`
2. Front: `https://dnsh-evaluator.vercel.app`
3. Abre DevTools (F12) → pestaña Network
4. Haz clic en "Continuar con Google"
5. Comprueba que la petición `auth/google` vaya a Railway, no a Vercel
