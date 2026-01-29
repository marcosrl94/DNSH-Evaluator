# Roadmap: Transformación a Herramienta Colaborativa de Evaluación DNSH

## Estado Actual ✅

### Lo que ya funciona:
- ✅ Evaluación DNSH completa (6 objetivos)
- ✅ Checklists interactivos por asset
- ✅ Sistema de evidencias con modal
- ✅ Evaluación de adaptación con medidas
- ✅ Materiality assessment y hazard scope
- ✅ Autenticación básica (local + Google OAuth)
- ✅ Tema dark/light
- ✅ Visualización de mapas y assets

### Limitaciones actuales:
- ❌ Datos solo en memoria/localStorage (se pierden al recargar)
- ❌ Sin backend real para persistencia
- ❌ Sin gestión de usuarios/roles
- ❌ Sin colaboración en tiempo real
- ❌ Sin historial de cambios/auditoría
- ❌ Evidencias solo con URLs locales (no subida real)
- ❌ Sin workflow de aprobación
- ❌ Sin notificaciones
- ❌ Sin comentarios/discusiones

---

## Fase 1: Infraestructura Base (Crítica) 🔴

### 1.1 Backend API REST
**Prioridad: CRÍTICA**

```typescript
// Estructura sugerida:
/api
  /auth          - Autenticación y gestión de usuarios
  /operations    - CRUD de operaciones/deals
  /assets        - CRUD de assets
  /evaluations   - Evaluaciones DNSH
  /evidence      - Gestión de evidencias (upload/download)
  /checklists    - Respuestas de checklists
  /measures      - Medidas de adaptación aplicadas
  /comments      - Comentarios y discusiones
  /notifications - Notificaciones
  /audit         - Historial de cambios
```

**Tecnologías sugeridas:**
- **Backend**: Node.js + Express / Python + FastAPI
- **Base de datos**: PostgreSQL (datos estructurados) + MongoDB (evidencias/metadata)
- **Storage**: AWS S3 / Google Cloud Storage (archivos)
- **Autenticación**: JWT + OAuth 2.0

### 1.2 Persistencia Real de Datos
**Prioridad: CRÍTICA**

- Migrar de `localStorage` a API REST
- Implementar sincronización automática
- Manejo de conflictos (último en escribir gana o merge manual)
- Cache local para trabajo offline

### 1.3 Gestión de Usuarios y Roles
**Prioridad: ALTA**

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Evaluator' | 'Reviewer' | 'Viewer';
  team: string;
  permissions: Permission[];
}

interface Permission {
  operationId: string;
  canEdit: boolean;
  canReview: boolean;
  canApprove: boolean;
}
```

**Funcionalidades:**
- Invitar usuarios por email
- Asignar roles por operación/deal
- Control de acceso granular
- Gestión de equipos

---

## Fase 2: Colaboración en Tiempo Real (Alta) 🟠

### 2.1 WebSockets / Server-Sent Events
**Prioridad: ALTA**

- Actualizaciones en tiempo real cuando otro usuario modifica
- Indicadores de "usuario X está editando"
- Prevención de conflictos (bloqueo de edición)

**Tecnologías:**
- Socket.io (Node.js) o WebSockets nativos
- Redis para pub/sub de eventos

### 2.2 Historial y Auditoría
**Prioridad: ALTA**

```typescript
interface AuditLog {
  id: string;
  operationId: string;
  assetId?: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT';
  entityType: 'EVALUATION' | 'CHECKLIST' | 'EVIDENCE' | 'MEASURE';
  entityId: string;
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
  comment?: string;
}
```

**Funcionalidades:**
- Ver quién hizo qué cambio y cuándo
- Rollback a versiones anteriores
- Comparar versiones
- Exportar historial para compliance

### 2.3 Comentarios y Discusiones
**Prioridad: MEDIA**

```typescript
interface Comment {
  id: string;
  operationId: string;
  assetId?: string;
  questionId?: string; // Para comentarios en preguntas específicas
  userId: string;
  content: string;
  mentions: string[]; // @usuario
  attachments?: string[]; // IDs de evidencias
  resolved: boolean;
  createdAt: string;
  replies: Comment[];
}
```

**Funcionalidades:**
- Comentarios en assets, preguntas, evidencias
- Menciones (@usuario) con notificaciones
- Threads de discusión
- Marcar como resuelto

---

## Fase 3: Workflow y Aprobaciones (Media) 🟡

### 3.1 Estados de Evaluación
**Prioridad: MEDIA**

```typescript
type EvaluationStatus = 
  | 'DRAFT'           // En progreso
  | 'IN_REVIEW'       // Enviado para revisión
  | 'REVIEWED'        // Revisado, pendiente aprobación
  | 'APPROVED'        // Aprobado
  | 'REJECTED'        // Rechazado, requiere cambios
  | 'ARCHIVED';       // Archivado

interface EvaluationWorkflow {
  status: EvaluationStatus;
  assignedTo: string[]; // Usuarios asignados
  reviewers: string[];  // Revisores
  approvers: string[];  // Aprobadores
  currentStep: number;
  steps: WorkflowStep[];
}
```

### 3.2 Flujos de Aprobación
**Prioridad: MEDIA**

- Configurar flujos personalizados por tipo de deal
- Asignar revisores/aprobadores
- Notificaciones automáticas en cambios de estado
- Requisitos antes de aprobar (ej: todas las evidencias subidas)

### 3.3 Asignación de Tareas
**Prioridad: MEDIA**

```typescript
interface Task {
  id: string;
  operationId: string;
  assetId?: string;
  assignedTo: string;
  assignedBy: string;
  type: 'EVALUATE' | 'REVIEW' | 'UPLOAD_EVIDENCE' | 'COMPLETE_CHECKLIST';
  description: string;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

---

## Fase 4: Gestión Avanzada de Evidencias (Media) 🟡

### 4.1 Subida Real de Archivos
**Prioridad: ALTA**

- Integración con S3/Cloud Storage
- Progreso de subida
- Validación de tipos y tamaños
- Compresión automática de imágenes
- Virus scanning (opcional)

### 4.2 Versionado de Documentos
**Prioridad: MEDIA**

- Mantener historial de versiones
- Comparar versiones
- Restaurar versiones anteriores
- Etiquetas/metadata por versión

### 4.3 OCR y Extracción de Datos
**Prioridad: BAJA**

- OCR para PDFs escaneados
- Extracción automática de datos clave
- Búsqueda full-text en documentos

---

## Fase 5: Notificaciones y Comunicación (Media) 🟡

### 5.1 Sistema de Notificaciones
**Prioridad: MEDIA**

```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'ASSIGNMENT' | 'COMMENT' | 'APPROVAL' | 'CHANGE' | 'DEADLINE';
  title: string;
  message: string;
  link: string; // URL a la entidad relacionada
  read: boolean;
  createdAt: string;
}
```

**Canales:**
- Notificaciones in-app (badge, lista)
- Email
- Slack/Teams integration (opcional)

### 5.2 Dashboard de Actividad
**Prioridad: MEDIA**

- Feed de actividad reciente
- Mis tareas pendientes
- Deals que requieren atención
- Métricas de progreso

---

## Fase 6: Reporting y Exportación (Baja) 🟢

### 6.1 Generación de Reportes PDF
**Prioridad: MEDIA**

- Reportes ejecutivos por operación
- Reportes de compliance DNSH
- Templates personalizables
- Exportar con branding corporativo

### 6.2 Exportación de Datos
**Prioridad: BAJA**

- Excel/CSV para análisis
- JSON para integraciones
- API para sistemas externos

### 6.3 Dashboards Ejecutivos
**Prioridad: BAJA**

- Vista agregada de todos los deals
- Métricas de cumplimiento DNSH
- Tendencias y análisis
- Filtros avanzados

---

## Fase 7: Integraciones (Baja) 🟢

### 7.1 Integraciones con Sistemas Existentes
**Prioridad: BAJA**

- CRM (Salesforce, HubSpot)
- Sistemas de gestión de documentos
- Herramientas de análisis financiero
- APIs públicas (clima, riesgos)

### 7.2 Importación Masiva
**Prioridad: BAJA**

- Importar deals desde Excel/CSV
- Bulk upload de assets
- Sincronización automática

---

## Priorización Recomendada

### MVP (Mínimo Viable Product) - 2-3 meses:
1. ✅ Backend API REST básico
2. ✅ Persistencia en base de datos
3. ✅ Gestión de usuarios y roles básica
4. ✅ Subida real de archivos
5. ✅ Estados de evaluación básicos
6. ✅ Notificaciones in-app básicas

### Versión 1.0 (Colaborativa) - 4-6 meses:
1. ✅ WebSockets para tiempo real
2. ✅ Historial y auditoría completo
3. ✅ Comentarios y discusiones
4. ✅ Workflow de aprobación
5. ✅ Asignación de tareas
6. ✅ Notificaciones por email

### Versión 2.0 (Avanzada) - 6-12 meses:
1. ✅ Reportes PDF
2. ✅ Dashboards ejecutivos
3. ✅ Integraciones externas
4. ✅ OCR y extracción de datos
5. ✅ Analytics avanzados

---

## Arquitectura Técnica Sugerida

### Stack Recomendado:

**Frontend (Actual):**
- React + TypeScript ✅
- Vite ✅
- TailwindCSS ✅

**Backend (Nuevo):**
- Node.js + Express + TypeScript
- PostgreSQL (datos estructurados)
- MongoDB (evidencias/metadata opcional)
- Redis (cache y pub/sub)
- AWS S3 / Google Cloud Storage (archivos)

**Infraestructura:**
- Docker + Docker Compose (desarrollo)
- Kubernetes (producción)
- CI/CD con GitHub Actions
- Monitoreo con Sentry

### Estructura de Base de Datos (PostgreSQL):

```sql
-- Usuarios y autenticación
users
teams
user_permissions

-- Operaciones y assets
operations
assets
asset_attributes

-- Evaluaciones
dnsh_evaluations
checklist_answers
adaptation_measures
hazard_scopes

-- Evidencias
evidence_documents
evidence_versions
evidence_metadata

-- Colaboración
comments
tasks
notifications
audit_logs

-- Workflow
workflows
workflow_steps
approvals
```

---

## Consideraciones de Seguridad

1. **Autenticación robusta:**
   - JWT con refresh tokens
   - Rate limiting
   - 2FA opcional

2. **Autorización:**
   - RBAC (Role-Based Access Control)
   - Permisos granulares por operación
   - Audit de accesos

3. **Datos sensibles:**
   - Encriptación en tránsito (HTTPS)
   - Encriptación en reposo (archivos)
   - PII masking en logs

4. **Compliance:**
   - GDPR compliance
   - Retención de datos configurable
   - Exportación de datos personales

---

## Métricas de Éxito

- **Adopción:** % de deals evaluados en la plataforma
- **Eficiencia:** Tiempo promedio de evaluación vs. proceso manual
- **Colaboración:** Número de comentarios/interacciones por deal
- **Calidad:** % de evaluaciones completas con todas las evidencias
- **Satisfacción:** NPS del equipo

---

## Próximos Pasos Inmediatos

1. **Decidir stack tecnológico** para backend
2. **Diseñar esquema de base de datos** detallado
3. **Crear API REST básica** con endpoints críticos
4. **Migrar datos actuales** a base de datos
5. **Implementar autenticación real** con JWT
6. **Integrar subida de archivos** real (S3)
7. **Añadir gestión de usuarios** básica

¿Quieres que empiece con alguna de estas fases específicas?
