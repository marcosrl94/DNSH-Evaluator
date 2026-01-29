<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1IRX1ogGWutffnzbskpe391_Z7JAth7zu

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Opcional) Para autenticación con Google, crea un archivo `.env` con:
   ```
   VITE_GOOGLE_CLIENT_ID=tu_client_id_de_google
   ```
   Obtén tu Client ID en: https://console.cloud.google.com/apis/credentials
4. Run the app:
   `npm run dev`

## Autenticación con Google

La aplicación soporta login con Google (Gmail) para acceso rápido y seguro.

### Configuración

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crea un proyecto y habilita Google Identity Services API
3. Crea credenciales OAuth 2.0 (tipo: Aplicación web)
4. Añade orígenes autorizados: `http://localhost:3000` (desarrollo)
5. Copia el Client ID y añádelo a `.env` como `VITE_GOOGLE_CLIENT_ID`
6. Reinicia el servidor

**Nota**: Si no configuras el Client ID, el botón funcionará en modo demo.
