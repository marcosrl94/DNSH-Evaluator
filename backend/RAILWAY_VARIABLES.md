# Variables de Entorno para Railway

Copia y pega estas variables en Railway → Tu Servicio → Variables

## 🔴 OBLIGATORIAS (Copia estas exactamente):

```env
JWT_SECRET=tu-secret-key-super-segura-genera-una-nueva
CORS_ORIGIN=https://marcosrl94.github.io
GOOGLE_CLIENT_ID=169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com
NODE_ENV=production
```

## 🟡 RECOMENDADAS:

```env
API_PREFIX=/api/v1
LOG_LEVEL=info
ALLOWED_DOMAINS=gmail.com,googlemail.com
```

## 🟢 OPCIONALES (Solo si necesitas almacenar archivos):

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=ecoinvest-evidence-documents
```

## 📝 NOTAS:

1. **JWT_SECRET**: Genera uno seguro con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **DATABASE_URL**: Railway la configura automáticamente cuando agregas PostgreSQL. NO la agregues manualmente.

3. **CORS_ORIGIN**: Debe incluir la URL de tu frontend en GitHub Pages.

4. **PORT**: Railway lo configura automáticamente. NO lo agregues manualmente.
