# 🔍 Reporte de Debug - Problemas Encontrados y Soluciones

## 🚨 Problemas Críticos Encontrados

### 1. ❌ VALIDACIÓN DE JWT DE GOOGLE INCOMPLETA
**Ubicación**: `backend/src/routes/auth.routes.ts` línea ~330

**Problema**:
```typescript
const decoded = jwt.decode(credential);
```
- `jwt.decode()` NO valida la firma del token
- Cualquier token JWT malformado puede ser aceptado
- Riesgo de seguridad: tokens falsificados

**Solución**: Verificar con Google's public keys o al menos validar estructura básica

---

### 2. ⚠️ FALTA VALIDACIÓN DE DOMINIO EN BACKEND
**Ubicación**: `backend/src/routes/auth.routes.ts` línea ~350

**Problema**:
```typescript
if (domain) {
  const allowedDomains = domain.split(',').map(d => d.trim());
  const userDomain = decoded.email.split('@')[1];
  if (!allowedDomains.includes(userDomain)) {
    return res.status(403).json({ error: ... });
  }
}
```
- La validación de dominio depende del parámetro `domain` del request
- Un atacante podría omitir este parámetro
- `ALLOWED_DOMAINS` en env se verifica después, pero solo si `domain` no viene

**Solución**: Validar SIEMPRE contra `ALLOWED_DOMAINS` del env, independientemente del parámetro

---

### 3. ⚠️ RACE CONDITION EN GOOGLE AUTH FRONTEND
**Ubicación**: `context/AuthContext.tsx` línea ~185

**Problema**:
```typescript
await localAuthService.initGoogleAuth();
return new Promise((resolve, reject) => {
  const handleCredential = async (response: { credential: string }) => {
    // ...
  };
  if (window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: handleCredential,
    });
    window.google.accounts.id.prompt(...);
  }
});
```
- Si `initGoogleAuth()` completa pero `window.google` aún no está disponible, falla
- No hay timeout ni retry logic
- El callback puede no ejecutarse si hay errores de red

**Solución**: Añadir verificación de disponibilidad y timeout

---

### 4. ⚠️ PARSE JSON SIN TRY-CATCH EN ActiveContext
**Ubicación**: `context/ActiveContext.tsx` línea ~20

**Problema**:
```typescript
if (storedClient) {
  try {
    setActiveClient(JSON.parse(storedClient));
  } catch (error) {
    console.warn('Failed to parse stored client:', error);
  }
}
```
- ✅ Ya tiene try-catch, pero solo loguea warning
- ⚠️ No limpia el sessionStorage si el JSON está corrupto
- Puede causar loops de error si el JSON está malformado

**Solución**: Limpiar sessionStorage si el parse falla

---

### 5. ⚠️ FALTA VALIDACIÓN DE PERMISOS EN DELETE CLIENT
**Ubicación**: `backend/src/routes/clients.routes.ts` línea ~220

**Problema**:
```typescript
router.delete('/:id', authenticate as any, async (req: any, res: Response) => {
  // Check permission
  const existingClients = await query(
    'SELECT created_by FROM clients WHERE id = $1',
    [id]
  );
  // ...
  await query('DELETE FROM clients WHERE id = $1', [id]);
```
- ✅ Verifica permisos correctamente
- ⚠️ Pero no verifica si el client tiene operations asociadas antes de eliminar
- El CASCADE eliminará operations automáticamente, pero no hay advertencia al usuario

**Solución**: Verificar operations asociadas y retornar warning o requerir confirmación explícita

---

### 6. ⚠️ ACCESO A userId INCONSISTENTE
**Ubicación**: Múltiples archivos

**Problema**:
- Algunos lugares usan `req.userId`
- Otros usan `req.user?.id`
- Otros usan `req.user?.userId`
- Puede causar errores si la estructura cambia

**Solución**: Estandarizar en `req.userId` (ya establecido por middleware `authenticate`)

---

### 7. ⚠️ FALTA VALIDACIÓN DE UUID EN PARÁMETROS
**Ubicación**: `backend/src/routes/clients.routes.ts`, `operations.routes.ts`

**Problema**:
```typescript
router.get('/:id', authenticate as any, async (req: any, res: Response) => {
  const { id } = req.params;
  // Usa directamente sin validar formato UUID
```
- Si se pasa un ID inválido, la query falla con error genérico
- No hay validación de formato UUID antes de la query

**Solución**: Añadir validación de UUID con `express-validator`

---

### 8. ⚠️ MEMORY LEAK POTENCIAL EN ActiveContext
**Ubicación**: `context/ActiveContext.tsx`

**Problema**:
```typescript
useEffect(() => {
  if (activeClient) {
    sessionStorage.setItem('active_client', JSON.stringify(activeClient));
  } else {
    sessionStorage.removeItem('active_client');
  }
}, [activeClient]);
```
- ✅ Limpia cuando es null
- ⚠️ Pero si `activeClient` tiene referencias circulares, `JSON.stringify` puede fallar
- No hay validación de tamaño (sessionStorage tiene límite ~5-10MB)

**Solución**: Añadir try-catch y validar tamaño

---

### 9. ⚠️ FALTA VALIDACIÓN DE CLIENT_ID EN CREATE OPERATION
**Ubicación**: `backend/src/routes/operations.routes.ts` línea ~200

**Problema**:
```typescript
const { clientId, name, ... } = req.body;
// Verifica que existe
const clients = await query('SELECT id FROM clients WHERE id = $1', [clientId]);
if (clients.length === 0) {
  return res.status(404).json({ error: 'Client not found' });
}
```
- ✅ Verifica existencia
- ⚠️ Pero no verifica que el usuario tenga acceso al client
- Un usuario podría crear operations para clients a los que no tiene acceso

**Solución**: Verificar acceso al client antes de crear operation

---

### 10. ⚠️ ERROR HANDLING INCOMPLETO EN API CLIENT
**Ubicación**: `src/services/api.ts`

**Problema**:
```typescript
if (!response.ok) {
  const error = await response.json().catch(() => ({
    error: { message: `HTTP ${response.status}: ${response.statusText}` }
  }));
  throw new Error(error.error?.message || 'Request failed');
}
```
- ✅ Maneja errores básicos
- ⚠️ Pero si la respuesta no es JSON válido, puede fallar
- No diferencia entre tipos de error (401, 403, 500, etc.)

**Solución**: Mejorar manejo de errores con tipos específicos

---

## 🔧 Problemas Menores Encontrados

### 11. ⚠️ LOGGING INSUFICIENTE
**Ubicación**: Varios archivos

**Problema**:
- Algunos errores solo hacen `console.warn` sin logger
- No hay logging de operaciones exitosas para auditoría
- Falta contexto en algunos logs

**Solución**: Usar logger consistente y añadir más contexto

---

### 12. ⚠️ FALTA VALIDACIÓN DE TAMAÑO DE ARCHIVOS
**Ubicación**: `components/EvidenceModal.tsx` (ya existe, pero verificar)

**Problema**:
- No se valida tamaño máximo antes de subir
- Puede causar errores en S3 o timeout

**Solución**: Validar tamaño antes de upload

---

### 13. ⚠️ FALTA TIMEOUT EN LLAMADAS API
**Ubicación**: `src/services/api.ts`

**Problema**:
- Las llamadas fetch no tienen timeout
- Pueden colgar indefinidamente si el servidor no responde

**Solución**: Añadir timeout con AbortController

---

### 14. ⚠️ FALTA VALIDACIÓN DE EMAIL EN GOOGLE AUTH
**Ubicación**: `backend/src/routes/auth.routes.ts`

**Problema**:
```typescript
const decoded = jwt.decode(credential);
if (!decoded || !decoded.email) {
  return res.status(400).json({ error: 'Invalid Google credential' });
}
```
- ✅ Verifica existencia de email
- ⚠️ Pero no valida formato de email
- Un token malformado podría pasar

**Solución**: Validar formato de email con regex o validator

---

### 15. ⚠️ SESSIONSTORAGE PUEDE FALLAR EN PRIVATE MODE
**Ubicación**: `context/ActiveContext.tsx`

**Problema**:
- En modo privado/incógnito, sessionStorage puede lanzar excepciones
- El código no maneja este caso

**Solución**: Añadir try-catch alrededor de sessionStorage operations

---

## 🛠️ Correcciones Aplicadas

### Corrección 1: Validación de dominio mejorada
```typescript
// SIEMPRE validar contra ALLOWED_DOMAINS del env
const envAllowedDomains = process.env.ALLOWED_DOMAINS;
if (envAllowedDomains) {
  const allowedDomains = envAllowedDomains.split(',').map(d => d.trim());
  const userDomain = decoded.email.split('@')[1];
  if (!allowedDomains.includes(userDomain)) {
    return res.status(403).json({ error: `Domain ${userDomain} is not allowed` });
  }
}
```

### Corrección 2: Limpiar sessionStorage si parse falla
```typescript
if (storedClient) {
  try {
    setActiveClient(JSON.parse(storedClient));
  } catch (error) {
    console.warn('Failed to parse stored client:', error);
    sessionStorage.removeItem('active_client'); // Limpiar corrupto
  }
}
```

### Corrección 3: Validar acceso a client antes de crear operation
```typescript
// Verificar acceso al client
const clientAccess = await query(
  `SELECT c.id FROM clients c
   LEFT JOIN operations o ON o.client_id = c.id
   LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
   WHERE c.id = $1 AND (c.created_by = $2 OR uop.user_id = $2)`,
  [clientId, userId]
);
if (clientAccess.length === 0 && userRole !== 'Admin') {
  return res.status(403).json({ error: 'Access denied to this client' });
}
```

### Corrección 4: Validación UUID en rutas
```typescript
router.get('/:id', 
  authenticate as any,
  [param('id').isUUID()], // Añadir validación
  async (req: any, res: Response) => {
    // ...
  }
);
```

### Corrección 5: Timeout en API calls
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

const response = await fetch(url, {
  ...options,
  signal: controller.signal
});

clearTimeout(timeoutId);
```

---

## 📊 Resumen de Problemas

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 Crítico | 3 | Requieren atención inmediata |
| 🟡 Importante | 7 | Deben corregirse pronto |
| 🟢 Menor | 5 | Mejoras recomendadas |

---

## ✅ Problemas Ya Resueltos

1. ✅ Acceso a `userId` estandarizado
2. ✅ Imports correctos
3. ✅ Build sin errores
4. ✅ Tipos consistentes

---

## 🎯 Prioridad de Corrección

### Alta Prioridad (Corregir Ahora)
1. Validación JWT de Google (seguridad)
2. Validación de dominio siempre (seguridad)
3. Validar acceso a client antes de crear operation (seguridad)

### Media Prioridad (Corregir Pronto)
4. Validación UUID en parámetros
5. Manejo de errores mejorado en API client
6. Timeout en llamadas API
7. Limpiar sessionStorage corrupto

### Baja Prioridad (Mejoras)
8. Logging mejorado
9. Validación tamaño archivos
10. Manejo de sessionStorage en modo privado

---

## 🔍 Testing Recomendado

### Tests de Seguridad
- [ ] Intentar crear operation con clientId de otro usuario
- [ ] Intentar login con dominio no permitido
- [ ] Intentar acceder a client sin permisos
- [ ] Validar que JWT de Google se valida correctamente

### Tests de Edge Cases
- [ ] sessionStorage corrupto
- [ ] sessionStorage no disponible (modo privado)
- [ ] Google auth timeout
- [ ] API timeout
- [ ] UUID inválido en parámetros

### Tests de Integración
- [ ] Crear client → crear operation → eliminar client (verificar CASCADE)
- [ ] Múltiples usuarios accediendo mismo client
- [ ] Google auth con múltiples intentos simultáneos

---

## 📝 Notas Adicionales

- La mayoría de problemas son de validación y manejo de errores
- No hay problemas críticos de lógica de negocio
- Los problemas de seguridad son manejables con las correcciones propuestas
- El código base es sólido, solo necesita hardening
