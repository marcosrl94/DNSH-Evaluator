# Deploy en Vercel (sin integración Git)

Si Vercel no hace deploy automático al hacer push, puedes usar **GitHub Actions** o conectar el repo manualmente.

## Opción A: Configurar GitHub Secrets para deploy automático

Este repo incluye `.github/workflows/vercel-deploy.yml` que despliega en cada push a `main`.

### 1. Obtener IDs de Vercel

1. Ve a [vercel.com](https://vercel.com) → tu proyecto
2. **Settings** → **General**
3. En **Project ID** copia el valor
4. Para **Organization ID**: Settings → General (scroll) o usa la API/CLI

Alternativa con CLI:
```bash
npx vercel link   # enlaza el proyecto local
# Crea .vercel/project.json con projectId y orgId
cat .vercel/project.json
```

### 2. Crear token en Vercel

1. [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. **Create** → nombre "GitHub Actions"
3. Copia el token

### 3. Añadir Secrets en GitHub

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** para cada uno:
   - `VERCEL_ORG_ID` = tu org/team ID
   - `VERCEL_PROJECT_ID` = ID del proyecto
   - `VERCEL_TOKEN` = token creado arriba

### 4. Push para disparar

Cualquier push a `main` lanzará el workflow y desplegará en Vercel.

---

## Opción B: Conectar repo en Vercel (deploy automático)

1. [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → busca `DNSH-Evaluator` (o marcosrl94/DNSH-Evaluator)
3. **Root Directory**: déjalo vacío (raíz)
4. **Environment Variables**: añade según `vercel.env.example`
5. **Deploy**

Tras conectar, cada push a `main` hará deploy automático.

---

## Opción C: Deploy manual con CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```
