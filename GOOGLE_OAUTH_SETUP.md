# Configuración de Google OAuth

## 🚀 Inicio Rápido

Ejecuta el script de configuración:
```bash
./setup-google-oauth.sh
```

O sigue los pasos manuales abajo.

## Pasos para configurar Google Sign-In

### 1. Crear proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de "Google Identity Services"

### 2. Configurar OAuth Consent Screen

1. Ve a **APIs & Services** > **OAuth consent screen**
2. Selecciona **External** (o Internal si tienes Google Workspace)
3. Completa la información requerida:
   - App name: EcoInvest DNSH Evaluator
   - User support email: tu email
   - Developer contact information: tu email
4. Añade los scopes necesarios:
   - `email`
   - `profile`
   - `openid`

### 3. Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth client ID**
3. Selecciona **Web application**
4. Configura:
   - **Name**: EcoInvest DNSH Evaluator Web Client
   - **Authorized JavaScript origins** (MUY IMPORTANTE - añade exactamente):
     - `http://localhost:3000` (desarrollo - SIN barra final)
     - `https://tu-dominio.com` (producción - SIN barra final)
   - **Authorized redirect URIs** (MUY IMPORTANTE - añade exactamente):
     - `http://localhost:3000` (desarrollo - SIN barra final)
     - `http://localhost:3000/` (desarrollo - CON barra final, por si acaso)
     - `https://tu-dominio.com` (producción - SIN barra final)
     - `https://tu-dominio.com/` (producción - CON barra final, por si acaso)
   
   ⚠️ **NOTA CRÍTICA**: Si ves el error `[GSI_LOGGER]: The given origin is not allowed for the given client ID`, significa que `http://localhost:3000` NO está en la lista de "Authorized JavaScript origins". Añádelo exactamente como se muestra arriba (sin `https://` ni barra final).
5. Copia el **Client ID** generado

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
VITE_USE_API=true
VITE_API_URL=http://localhost:3001/api/v1
```

### 5. Configurar backend (si usas API)

El backend debe tener un endpoint `/auth/google` que:

1. Reciba el `credential` (JWT token de Google)
2. Verifique el token con Google
3. Extraiga la información del usuario
4. Cree o actualice el usuario en la base de datos
5. Genere un JWT token para tu aplicación
6. Devuelva el token y la información del usuario

Ejemplo de endpoint (Node.js/Express):

```javascript
app.post('/api/v1/auth/google', async (req, res) => {
  const { credential } = req.body;
  
  // Verificar token con Google
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  
  // Buscar o crear usuario
  let user = await User.findOne({ email: payload.email });
  if (!user) {
    user = await User.create({
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
      authProvider: 'google',
    });
  }
  
  // Generar JWT token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    token,
    refreshToken: generateRefreshToken(user.id),
  });
});
```

## Características implementadas

### ✅ Botón oficial de Google Sign-In
- Usa `renderButton` de Google Identity Services
- Diseño moderno y responsive
- Estilos personalizados para coincidir con el tema

### ✅ Flujo de autenticación
- One Tap para usuarios que ya han iniciado sesión
- Botón para nuevos usuarios o cuando One Tap no está disponible
- Manejo de errores robusto
- Redirección automática después del login

### ✅ Persistencia de sesión
- Google users por defecto mantienen la sesión activa (30 días)
- Tokens almacenados de forma segura
- Soporte para refresh tokens

### ✅ Integración con backend
- Soporte para API backend con fallback a autenticación local
- Manejo de tokens JWT
- Conexión automática de Socket.IO después del login

## Uso

1. Configura `VITE_GOOGLE_CLIENT_ID` en tu `.env.local`
2. El botón de Google aparecerá automáticamente en la página de login
3. Los usuarios pueden hacer clic en el botón para iniciar sesión
4. Después del login exitoso, serán redirigidos automáticamente al dashboard

## Notas

- El botón usa el diseño oficial de Google para cumplir con las guías de marca
- Los estilos personalizados mantienen la coherencia visual con el resto de la aplicación
- El sistema funciona tanto con backend API como sin él (modo demo)
