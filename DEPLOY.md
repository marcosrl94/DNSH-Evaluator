# Guía de Despliegue

Esta aplicación puede desplegarse en varias plataformas. Aquí tienes las opciones más comunes:

## 🚀 Opción 1: Vercel (Recomendado - Más Fácil)

### Pasos:

1. **Instala Vercel CLI** (opcional, también puedes usar la web):
   ```bash
   npm i -g vercel
   ```

2. **Despliega desde la terminal**:
   ```bash
   vercel
   ```
   
   O simplemente ve a [vercel.com](https://vercel.com) y:
   - Conecta tu repositorio de GitHub
   - Selecciona este proyecto
   - Vercel detectará automáticamente que es un proyecto Vite
   - (Opcional) Agrega la variable de entorno `GEMINI_API_KEY` si quieres usar IA real
   - ¡Listo! Se desplegará automáticamente en cada push a `main`

3. **(Opcional) Configurar variables de entorno**:
   - Ve a tu proyecto en Vercel Dashboard
   - Settings → Environment Variables
   - Agrega: `GEMINI_API_KEY` con tu clave (solo si quieres usar IA real)

**Ventajas:**
- ✅ Despliegue automático en cada push
- ✅ HTTPS gratuito
- ✅ Dominio personalizado gratuito
- ✅ Muy rápido y fácil

---

## 🌐 Opción 2: GitHub Pages

### Pasos:

1. **Habilita GitHub Pages** en tu repositorio:
   - Ve a Settings → Pages
   - Source: GitHub Actions

2. **(Opcional) Configura el secreto** si quieres usar IA real:
   - Ve a Settings → Secrets and variables → Actions
   - Agrega un nuevo secreto: `GEMINI_API_KEY` con tu clave
   - **Nota:** No es necesario, la app funciona sin él

3. **Haz push de los cambios**:
   ```bash
   git add .
   git commit -m "Add deployment config"
   git push
   ```

4. **El workflow se ejecutará automáticamente** y desplegará en:
   `https://marcosrl94.github.io/DNSH-Evaluator/`

**Nota:** Si tu repositorio es privado, necesitarás GitHub Pro para usar GitHub Pages.

---

## ☁️ Opción 3: Netlify

### Pasos:

1. Ve a [netlify.com](https://netlify.com)
2. Conecta tu repositorio de GitHub
3. Configuración de build:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. (Opcional) Agrega variable de entorno: `GEMINI_API_KEY` si quieres usar IA real
5. Deploy!

---

## 🔧 Opción 4: Cloudflare Pages

### Pasos:

1. Ve a [pages.cloudflare.com](https://pages.cloudflare.com)
2. Conecta tu repositorio
3. Configuración:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4. (Opcional) Agrega variable de entorno: `GEMINI_API_KEY` si quieres usar IA real
5. Deploy!

---

## 📝 Variables de Entorno (Opcional)

La aplicación funciona sin variables de entorno. Si quieres usar la funcionalidad de IA con Gemini, puedes agregar:

- `GEMINI_API_KEY`: Tu clave de API de Google Gemini (opcional)

**Nota:** La aplicación funciona perfectamente sin esta clave usando respuestas simuladas.

---

## 🎯 Recomendación

**Vercel** es la opción más fácil y rápida para este tipo de proyectos. Solo necesitas:
1. Conectar tu repositorio
2. (Opcional) Agregar la variable de entorno si quieres usar IA real
3. ¡Listo! Se despliega automáticamente
