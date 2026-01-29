# Plan de Evolución: POC → Plataforma Colaborativa

## 🎯 Objetivo
Evolucionar la POC hacia plataforma colaborativa interna **sin refactorizar**, solo extendiendo lo existente.

---

## 📊 Estado Actual Analizado

### ✅ Ya Existe (Base Sólida)
- **Backend**: PostgreSQL, JWT, Socket.IO, estructura de usuarios/clients/operations
- **Frontend**: AuthContext, dataManagement, Google OAuth básico
- **Esquema BD**: `users`, `clients`, `operations`, `assets`, `user_operation_permissions`
- **Trazabilidad parcial**: `created_by` en clients/operations

### 🔍 Gaps Identificados (Mínimos)
1. Google Workspace OAuth no implementado en backend
2. CRUD de clients/operations no completo en API
3. Aislamiento de datos por cliente no forzado
4. Trazabilidad `updated_by` falta en algunas tablas
5. Contexto de IA no usa cliente/proyecto activo
6. Permisos por operación no aplicados en queries

---

## 🚀 Extensiones Mínimas Necesarias

### 1. AUTENTICACIÓN CORPORATIVA

#### 1.1 Backend: Google Workspace OAuth
**Archivo**: `backend/src/routes/auth.routes.ts`

**Añadir** (después de línea ~216):
```typescript
/**
 * POST /auth/google
 * Authenticate with Google Workspace OAuth
 */
router.post(
  '/google',
  [
    body('credential').notEmpty(), // JWT token from Google
    body('domain').optional() // Optional: restrict to specific domain
  ],
  async (req: Request, res: Response) => {
    try {
      const { credential, domain } = req.body;
      
      // Decode Google JWT
      const decoded = jwt.decode(credential) as any;
      if (!decoded || !decoded.email) {
        return res.status(400).json({ error: 'Invalid Google credential' });
      }

      // Optional: Verify domain restriction
      if (domain && !decoded.email.endsWith(`@${domain}`)) {
        return res.status(403).json({ error: 'Domain not allowed' });
      }

      // Find or create user
      let users = await query(
        'SELECT id, email, name, role FROM users WHERE email = $1',
        [decoded.email]
      );

      let user;
      if (users.length === 0) {
        // Create new user from Google
        const newUsers = await query<{ id: string }>(
          `INSERT INTO users (email, name, auth_provider, provider_id, role)
           VALUES ($1, $2, 'google', $3, 'Evaluator')
           RETURNING id, email, name, role`,
          [decoded.email, decoded.name || decoded.email.split('@')[0], decoded.sub]
        );
        user = newUsers[0];
      } else {
        user = users[0];
        // Update last login
        await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      }

      // Generate tokens (same as login)
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token,
        refreshToken
      });
    } catch (error: any) {
      logger.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);
```

**Variables de entorno** (añadir a `backend/.env.example`):
```env
GOOGLE_CLIENT_ID=your-google-workspace-client-id
GOOGLE_CLIENT_SECRET=your-google-workspace-client-secret
ALLOWED_DOMAINS=tuempresa.com,otrodominio.com  # Opcional: restricción de dominio
```

#### 1.2 Frontend: Integrar Google Workspace
**Archivo**: `context/AuthContext.tsx`

**Modificar** función `loginWithGoogle` (línea ~196):
```typescript
const loginWithGoogle = async (
  rememberMe: boolean = false,
  keepSignedIn: boolean = false
): Promise<void> => {
  setError(null);
  try {
    if (USE_API) {
      // Use Google Identity Services
      await initGoogleAuth();
      
      return new Promise((resolve, reject) => {
        const handleCredential = async (response: { credential: string }) => {
          try {
            // Send credential to backend
            const result = await apiClient.request('/auth/google', {
              method: 'POST',
              body: JSON.stringify({ credential: response.credential })
            });

            const userData: User = {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role as any,
              permissions: getPermissionsForRole(result.user.role as any)
            };

            // Store session
            if (keepSignedIn) {
              localStorage.setItem('ecoinvest_keep_signed_in', 'true');
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + 30);
              localStorage.setItem('ecoinvest_session_expiry', expiryDate.toISOString());
            } else if (rememberMe) {
              sessionStorage.setItem('ecoinvest_temp_session', 'true');
            }

            localStorage.setItem('ecoinvest_user', JSON.stringify(userData));
            localStorage.setItem('ecoinvest_auth_provider', 'google');
            localStorage.setItem('refresh_token', result.refreshToken);
            apiClient.setToken(result.token);

            // Connect Socket.IO
            socketService.connect(result.token);

            setUser(userData);
            resolve();
          } catch (error: any) {
            reject(error);
          }
        };

        // Initialize Google Sign In with callback
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredential,
        });

        // Trigger sign in
        window.google.accounts.id.prompt();
      });
    } else {
      // Fallback to local auth
      await localAuthService.loginWithGoogle(rememberMe, keepSignedIn);
      const storedUser = localStorage.getItem('ecoinvest_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
    }
  } catch (error: any) {
    setError(error.message || 'Google login failed');
    throw error;
  }
};
```

**Añadir** método en `src/services/api.ts`:
```typescript
async loginWithGoogle(credential: string) {
  const response = await this.request<{ user: any; token: string; refreshToken: string }>(
    '/auth/google',
    {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }
  );
  this.setToken(response.token);
  return response;
}
```

---

### 2. PERSISTENCIA DE MEMORIA

#### 2.1 Backend: CRUD Completo de Clients
**Archivo**: `backend/src/routes/clients.routes.ts` (NUEVO)

```typescript
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../config/database';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// GET /clients - List all clients (user's clients only)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // Get clients where user has access (created by or via operation permissions)
    const clients = await query(
      `SELECT DISTINCT c.*, u.name as created_by_name
       FROM clients c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN operations o ON o.client_id = c.id
       LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
       WHERE c.created_by = $1 OR uop.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({ clients });
  } catch (error: any) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /clients - Create client
router.post(
  '/',
  authenticate,
  [
    body('name').trim().isLength({ min: 1 }),
    body('country').optional(),
    body('sector').optional(),
    body('description').optional()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.userId;
      const { name, country, sector, description } = req.body;

      const clients = await query(
        `INSERT INTO clients (name, country, sector, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, country, sector, description, userId]
      );

      res.status(201).json({ client: clients[0] });
    } catch (error: any) {
      logger.error('Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  }
);

// PUT /clients/:id - Update client
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 1 }),
    body('country').optional(),
    body('sector').optional(),
    body('description').optional()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.userId;
      const { id } = req.params;
      const { name, country, sector, description } = req.body;

      // Check permission (creator or admin)
      const clients = await query(
        'SELECT created_by FROM clients WHERE id = $1',
        [id]
      );

      if (clients.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const userRole = (req as any).user.role;
      if (clients[0].created_by !== userId && userRole !== 'Admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Update
      const updated = await query(
        `UPDATE clients 
         SET name = COALESCE($1, name),
             country = COALESCE($2, country),
             sector = COALESCE($3, sector),
             description = COALESCE($4, description),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [name, country, sector, description, id]
      );

      res.json({ client: updated[0] });
    } catch (error: any) {
      logger.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  }
);

// DELETE /clients/:id - Delete client
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Check permission
    const clients = await query(
      'SELECT created_by FROM clients WHERE id = $1',
      [id]
    );

    if (clients.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const userRole = (req as any).user.role;
    if (clients[0].created_by !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete (CASCADE will handle operations)
    await query('DELETE FROM clients WHERE id = $1', [id]);

    res.json({ message: 'Client deleted' });
  } catch (error: any) {
    logger.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
```

**Registrar** en `backend/src/index.ts`:
```typescript
import clientsRoutes from './routes/clients.routes';
app.use('/api/v1/clients', clientsRoutes);
```

#### 2.2 Backend: CRUD Completo de Operations
**Archivo**: `backend/src/routes/operations.routes.ts`

**Añadir** métodos faltantes (después de los existentes):
```typescript
// POST /operations - Create operation
router.post(
  '/',
  authenticate,
  [
    body('clientId').isUUID(),
    body('name').trim().isLength({ min: 1 }),
    body('country').trim().isLength({ min: 1 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.userId;
      const { clientId, name, sectorNACE, country, capex, ...rest } = req.body;

      // Verify client exists and user has access
      const clients = await query(
        'SELECT id FROM clients WHERE id = $1',
        [clientId]
      );
      if (clients.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const operations = await query(
        `INSERT INTO operations (
          client_id, name, sector_nace, country, capex,
          deal_price, expected_return, risk_weighted_capital,
          total_aal, max_risk_band, sustainability_discount,
          risk_adjustment, status, substantial_contribution_id,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          clientId, name, sectorNACE, country, capex || 0,
          rest.dealPrice, rest.expectedReturn, rest.riskWeightedCapital,
          rest.totalAAL, rest.maxRiskBand, rest.sustainabilityDiscount,
          rest.riskAdjustment, rest.status || 'Draft',
          rest.substantialContributionId, userId
        ]
      );

      // Grant creator full access
      await query(
        `INSERT INTO user_operation_permissions (user_id, operation_id, permission_level)
         VALUES ($1, $2, 'Editor')`,
        [userId, operations[0].id]
      );

      res.status(201).json({ operation: operations[0] });
    } catch (error: any) {
      logger.error('Error creating operation:', error);
      res.status(500).json({ error: 'Failed to create operation' });
    }
  }
);

// DELETE /operations/:id - Delete operation
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Check permission
    const operations = await query(
      'SELECT created_by FROM operations WHERE id = $1',
      [id]
    );

    if (operations.length === 0) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const userRole = (req as any).user.role;
    if (operations[0].created_by !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await query('DELETE FROM operations WHERE id = $1', [id]);
    res.json({ message: 'Operation deleted' });
  } catch (error: any) {
    logger.error('Error deleting operation:', error);
    res.status(500).json({ error: 'Failed to delete operation' });
  }
});
```

#### 2.3 Frontend: CRUD de Clients
**Archivo**: `src/services/api.ts`

**Añadir** métodos:
```typescript
// Clients
async getClients() {
  return this.request<{ clients: any[] }>('/clients');
}

async createClient(data: { name: string; country?: string; sector?: string; description?: string }) {
  return this.request<{ client: any }>('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async updateClient(id: string, data: Partial<{ name: string; country: string; sector: string; description: string }>) {
  return this.request<{ client: any }>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async deleteClient(id: string) {
  return this.request<{ message: string }>(`/clients/${id}`, {
    method: 'DELETE',
  });
}
```

**Archivo**: `services/dataManagement.ts`

**Añadir** funciones:
```typescript
export async function createClient(clientData: { name: string; country?: string; sector?: string; description?: string }): Promise<Client> {
  if (USE_API) {
    try {
      const response = await apiClient.createClient(clientData);
      return {
        id: response.client.id,
        name: response.client.name,
        country: response.client.country,
        sector: response.client.sector,
        description: response.client.description
      };
    } catch (error) {
      console.warn('API unavailable:', error);
      throw error;
    }
  }
  throw new Error('API required for creating clients');
}

export async function updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
  if (USE_API) {
    try {
      await apiClient.updateClient(clientId, updates);
    } catch (error) {
      console.warn('API unavailable:', error);
      throw error;
    }
  } else {
    throw new Error('API required for updating clients');
  }
}

export async function deleteClient(clientId: string): Promise<void> {
  if (USE_API) {
    try {
      await apiClient.deleteClient(clientId);
    } catch (error) {
      console.warn('API unavailable:', error);
      throw error;
    }
  } else {
    throw new Error('API required for deleting clients');
  }
}
```

---

### 3. AISLAMIENTO DE DATOS

#### 3.1 Backend: Middleware de Aislamiento
**Archivo**: `backend/src/middleware/dataIsolation.ts` (NUEVO)

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure users only access their own clients/operations
 * Applied to all routes that access clients or operations
 */
export const enforceDataIsolation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.userId;
  const userRole = (req as any).user?.role;

  // Admins bypass isolation
  if (userRole === 'Admin') {
    return next();
  }

  // For client/operation routes, verify access
  if (req.params.clientId) {
    const { query } = await import('../config/database');
    const clients = await query(
      `SELECT c.id FROM clients c
       LEFT JOIN operations o ON o.client_id = c.id
       LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
       WHERE c.id = $1 AND (c.created_by = $2 OR uop.user_id = $2)`,
      [req.params.clientId, userId]
    );

    if (clients.length === 0) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }
  }

  if (req.params.operationId || req.params.id) {
    const operationId = req.params.operationId || req.params.id;
    const { query } = await import('../config/database');
    const operations = await query(
      `SELECT o.id FROM operations o
       LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
       WHERE o.id = $1 AND (o.created_by = $2 OR uop.user_id = $2)`,
      [operationId, userId]
    );

    if (operations.length === 0) {
      return res.status(403).json({ error: 'Access denied to this operation' });
    }
  }

  next();
};
```

**Aplicar** en rutas relevantes:
```typescript
// En operations.routes.ts
router.use('/:id', authenticate, enforceDataIsolation);
router.use('/:id/*', authenticate, enforceDataIsolation);

// En clients.routes.ts
router.use('/:id', authenticate, enforceDataIsolation);
```

#### 3.2 Backend: Queries con Filtrado Automático
**Modificar** todas las queries de `operations.routes.ts` y `clients.routes.ts` para incluir filtrado por usuario:

```typescript
// Ejemplo: GET /operations
const userId = (req as any).user.userId;
const userRole = (req as any).user.role;

let operations;
if (userRole === 'Admin') {
  operations = await query('SELECT * FROM operations ORDER BY created_at DESC');
} else {
  operations = await query(
    `SELECT DISTINCT o.* FROM operations o
     LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
     WHERE o.created_by = $1 OR uop.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
}
```

---

### 4. TRAZABILIDAD

#### 4.1 Backend: Añadir `updated_by` a Tablas
**Archivo**: `backend/database/migrations/add_updated_by.sql` (NUEVO)

```sql
-- Add updated_by to operations
ALTER TABLE operations ADD COLUMN updated_by UUID REFERENCES users(id);

-- Add updated_by to clients
ALTER TABLE clients ADD COLUMN updated_by UUID REFERENCES users(id);

-- Add updated_by to assets
ALTER TABLE assets ADD COLUMN updated_by UUID REFERENCES users(id);

-- Add updated_by to dnsh_evaluations
ALTER TABLE dnsh_evaluations ADD COLUMN updated_by UUID REFERENCES users(id);

-- Create trigger to auto-update updated_by
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = current_setting('app.user_id', true)::UUID;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to operations
CREATE TRIGGER set_operations_updated_by
BEFORE UPDATE ON operations
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

-- Apply to clients
CREATE TRIGGER set_clients_updated_by
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

-- Apply to assets
CREATE TRIGGER set_assets_updated_by
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

-- Apply to dnsh_evaluations
CREATE TRIGGER set_evaluations_updated_by
BEFORE UPDATE ON dnsh_evaluations
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();
```

**Modificar** middleware `auth.ts` para establecer `app.user_id`:
```typescript
// En authenticate middleware, después de verificar token:
await query(`SET app.user_id = $1`, [userId]);
```

#### 4.2 Frontend: Mostrar Trazabilidad
**Archivo**: `pages/OperationsList.tsx` (o donde se muestren operaciones)

**Añadir** columna de creado/modificado por:
```typescript
// En la tabla de operaciones
<td className="text-xs text-gray-500">
  {operation.createdBy && (
    <div>Creado por: {operation.createdBy}</div>
  )}
  {operation.updatedBy && operation.updatedBy !== operation.createdBy && (
    <div>Modificado por: {operation.updatedBy}</div>
  )}
</td>
```

---

### 5. CONTEXTO DE IA

#### 5.1 Frontend: Context Provider
**Archivo**: `context/ActiveContext.tsx` (NUEVO)

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Client, Operation } from '../types';

interface ActiveContextType {
  activeClient: Client | null;
  activeOperation: Operation | null;
  setActiveClient: (client: Client | null) => void;
  setActiveOperation: (operation: Operation | null) => void;
}

const ActiveContext = createContext<ActiveContextType | undefined>(undefined);

export const ActiveContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [activeOperation, setActiveOperation] = useState<Operation | null>(null);

  return (
    <ActiveContext.Provider
      value={{
        activeClient,
        activeOperation,
        setActiveClient,
        setActiveOperation
      }}
    >
      {children}
    </ActiveContext.Provider>
  );
};

export const useActiveContext = () => {
  const context = useContext(ActiveContext);
  if (!context) {
    throw new Error('useActiveContext must be used within ActiveContextProvider');
  }
  return context;
};
```

**Registrar** en `App.tsx`:
```typescript
import { ActiveContextProvider } from './context/ActiveContext';

// Envolver AuthenticatedApp con ActiveContextProvider
<ActiveContextProvider>
  <AuthenticatedApp />
</ActiveContextProvider>
```

#### 5.2 Frontend: Usar Contexto en IA
**Archivo**: `components/AIAssistant.tsx`

**Modificar** para incluir contexto:
```typescript
import { useActiveContext } from '../context/ActiveContext';

// En el componente
const { activeClient, activeOperation } = useActiveContext();

// Al construir el prompt del sistema:
const systemPrompt = `
Eres un asistente de evaluación DNSH.
Contexto actual:
- Cliente: ${activeClient?.name || 'No seleccionado'}
- Proyecto: ${activeOperation?.name || 'No seleccionado'}
- Sector: ${activeOperation?.sectorNACE || 'N/A'}
- País: ${activeOperation?.country || 'N/A'}

Usa este contexto para dar respuestas más precisas y relevantes.
...
`;
```

---

### 6. CONTROL DE ROLES SIMPLE

#### 6.1 Backend: Aplicar Permisos en Queries
**Ya existe** `user_operation_permissions`, solo falta aplicarlo consistentemente.

**Modificar** `operations.routes.ts` para verificar permisos:
```typescript
// Helper function
const checkOperationPermission = async (
  userId: string,
  operationId: string,
  requiredLevel: 'Viewer' | 'Editor' | 'Admin' = 'Viewer'
): Promise<boolean> => {
  const userRole = await query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );

  if (userRole[0]?.role === 'Admin') return true;

  const operation = await query(
    'SELECT created_by FROM operations WHERE id = $1',
    [operationId]
  );

  if (operation[0]?.created_by === userId) return true;

  const permissions = await query(
    `SELECT permission_level FROM user_operation_permissions
     WHERE user_id = $1 AND operation_id = $2`,
    [userId, operationId]
  );

  if (permissions.length === 0) return false;

  const levels = { Viewer: 1, Editor: 2, Admin: 3 };
  return levels[permissions[0].permission_level] >= levels[requiredLevel];
};

// Usar en rutas:
router.put('/operations/:id', authenticate, async (req, res) => {
  const hasPermission = await checkOperationPermission(
    (req as any).user.userId,
    req.params.id,
    'Editor'
  );

  if (!hasPermission) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  // ... resto del código
});
```

---

## 📝 Resumen de Archivos a Crear/Modificar

### Nuevos Archivos
1. `backend/src/routes/clients.routes.ts`
2. `backend/src/middleware/dataIsolation.ts`
3. `backend/database/migrations/add_updated_by.sql`
4. `context/ActiveContext.tsx`

### Archivos a Modificar
1. `backend/src/routes/auth.routes.ts` - Añadir Google OAuth
2. `backend/src/routes/operations.routes.ts` - Añadir CREATE/DELETE
3. `backend/src/middleware/auth.ts` - Establecer app.user_id
4. `context/AuthContext.tsx` - Integrar Google Workspace
5. `src/services/api.ts` - Añadir métodos clients
6. `services/dataManagement.ts` - Añadir CRUD clients
7. `components/AIAssistant.tsx` - Usar ActiveContext
8. `App.tsx` - Registrar ActiveContextProvider

---

## ✅ Checklist de Implementación

- [ ] Backend: Google Workspace OAuth
- [ ] Backend: CRUD completo clients
- [ ] Backend: CRUD completo operations (CREATE/DELETE)
- [ ] Backend: Middleware de aislamiento
- [ ] Backend: Trazabilidad updated_by
- [ ] Frontend: Integración Google Workspace
- [ ] Frontend: CRUD clients en UI
- [ ] Frontend: Contexto activo cliente/proyecto
- [ ] Frontend: IA con contexto
- [ ] Testing: Verificar aislamiento de datos
- [ ] Testing: Verificar permisos por operación

---

## 🎯 Principios Cumplidos

✅ **No refactorizar** - Solo extensiones
✅ **Mínimos puntos de extensión** - 4 archivos nuevos, 8 modificados
✅ **Enfoque aditivo** - No se toca código existente innecesariamente
✅ **Seguridad por defecto** - Aislamiento y permisos integrados
✅ **Preparado para escalar** - Estructura permite crecimiento futuro

---

## 🚀 Orden de Implementación Recomendado

1. **Fase 1: Autenticación** (1-2 días)
   - Google Workspace OAuth backend + frontend

2. **Fase 2: Persistencia** (2-3 días)
   - CRUD clients/operations backend
   - CRUD clients/operations frontend

3. **Fase 3: Aislamiento** (1 día)
   - Middleware de aislamiento
   - Aplicar a todas las rutas

4. **Fase 4: Trazabilidad** (1 día)
   - Migración updated_by
   - Mostrar en UI

5. **Fase 5: Contexto IA** (1 día)
   - ActiveContext provider
   - Integrar en AIAssistant

**Total estimado: 6-8 días de desarrollo**
