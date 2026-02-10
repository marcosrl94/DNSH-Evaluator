# Diagnóstico rápido - DNSH Evaluator

## El problema
**Railway backend no responde** – las peticiones de login (email o Google) van al backend y fallan porque no hay respuesta.

---

## Paso 1: Comprobar Railway

1. Entra en [railway.app](https://railway.app) → tu proyecto.
2. Haz clic en el **servicio del backend** (no en PostgreSQL).
3. Pestaña **Deployments**:
   - ¿El último deploy está en verde (Success)?
   - Si hay error, abre los **logs** y busca mensajes en rojo.
4. Pestaña **Settings** → **Networking**:
   - Comprueba que tenga un **dominio público** (ej. `dnsh-evaluator-production.up.railway.app`).
   - Si no hay dominio, créalo con "Generate Domain".

5. **Variables** (mínimo):
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (string largo aleatorio)
   - `DATABASE_URL` = (referencia al plugin PostgreSQL)

6. **PostgreSQL**:
   - ¿Tienes el plugin PostgreSQL añadido al proyecto?
   - ¿`DATABASE_URL` está conectada al servicio backend?

---

## Paso 2: Redeploy manual

1. Railway → servicio backend → **Deployments**.
2. Los 3 puntos del último deploy → **Redeploy**.
3. Espera a que termine y revisa los **logs en vivo**.
4. Busca:
   - `Server running on port XXXX`
   - `✅ Database connected` (o aviso si la DB falla)

---

## Paso 3: Probar desde terminal

```bash
# Health (debería responder en ~10–30 s si Railway está despierto)
curl -v --max-time 60 https://dnsh-evaluator-production.up.railway.app/health

# Si funciona, prueba login
curl -X POST https://dnsh-evaluator-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  --max-time 30
```

---

## Paso 4: Si Railway Free Tier está dormido

En el plan gratuito, Railway puede poner el servicio en sleep.

- La **primera** petición puede tardar 30–60 s mientras despierta.
- Prueba `/health` varias veces con `curl` y espera hasta 60 s.

---

## Paso 5: Usar la app sin backend (temporal)

Si necesitas usar la app mientras revisas Railway:

1. En **Vercel** → Settings → Environment Variables.
2. Quita `VITE_USE_API` o ponla en `false`.
3. Redeploy del frontend.

La app usará auth local (demo) y datos en memoria. No es la versión final, pero te deja probar la interfaz.
