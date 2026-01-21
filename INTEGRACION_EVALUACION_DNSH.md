# Integración Unificada de Evaluación DNSH

## Resumen Ejecutivo

Se ha realizado una integración completa de todas las funcionalidades de evaluación DNSH en una **única pantalla unificada** (`DnshEvaluationEnhanced.tsx`), eliminando rutas duplicadas y asegurando que todas las evaluaciones se realicen a nivel **ASSET** como fuente de verdad única.

## Problema Identificado

Existían múltiples rutas para realizar evaluaciones DNSH:
1. `DnshEvaluation.tsx` - Evaluación a nivel operación (original)
2. `DnshEvaluationEnhanced.tsx` - Evaluación mejorada (nueva)
3. `AssetEvaluation.tsx` - Evaluación a nivel asset individual
4. `DnshChecklist.tsx` - Cuestionarios a nivel operación
5. `DnshAdaptation.tsx` - Evaluación específica de adaptación
6. `ClientDnshEvaluation.tsx` - Evaluación a nivel cliente

Esto generaba:
- **Inconsistencias**: Diferentes resultados para la misma evaluación
- **Confusión**: Múltiples lugares para hacer lo mismo
- **Duplicación**: Lógica de evaluación repetida en varios lugares
- **Mantenimiento**: Cambios requerían actualizar múltiples archivos

## Solución Implementada

### 1. Servicio Centralizado (`services/dnshEvaluationService.ts`)

**Fuente de Verdad Única:**
- Todas las evaluaciones se realizan a nivel **ASSET**
- Las vistas agregadas (Portfolio, Group, Operation) **derivan** de evaluaciones de assets
- Funciones centralizadas:
  - `getAssetObjectiveStatus()` - Status por objetivo (única fuente de verdad)
  - `buildEvaluationFromAnswers()` - Construye evaluación desde respuestas de checklist
  - `calculateStatusFromAnswers()` - Calcula status desde respuestas
  - `getOperationDnshStats()` - Stats agregados desde assets
  - `isAssetObjectiveComplete()` - Valida completitud de evaluación

### 2. Página Unificada (`pages/DnshEvaluationEnhanced.tsx`)

**Características Integradas:**

#### Vista Portfolio
- Vista agregada de todos los assets
- Estadísticas derivadas de evaluaciones de assets
- Navegación directa a vista asset para evaluación

#### Vista Group
- Agrupación flexible de assets
- Evaluación agregada derivada de assets individuales
- Expansión para ver assets y evaluar individualmente

#### Vista Asset (EVALUACIÓN GRANULAR)
- **Única pantalla donde se realizan evaluaciones**
- **Cuestionarios interactivos integrados**:
  - Respuestas Yes/No/N/A por pregunta
  - Campo de evidencia por pregunta
  - Vinculación con documentos de evidencia
  - Cálculo automático de status desde respuestas
- **Evaluación de adaptación embebida**:
  - Módulo completo de adaptación integrado
  - Selección de hazards y medidas
  - Cálculo de riesgo pre/post medidas
- **Guardado de evaluación**:
  - Construye `AssetDnshEvaluation` completo
  - Guarda respuestas de checklist
  - Actualiza operación con evaluación del asset

### 3. Eliminación de Rutas Duplicadas

**Rutas Eliminadas de `App.tsx`:**
- ❌ `asset-evaluation` → Redirige a `dnsh-evaluation` con asset seleccionado
- ❌ `dnsh-adaptation` → Integrado en vista Asset de `dnsh-evaluation`
- ❌ `dnsh-checklist` → Integrado en vista Asset de `dnsh-evaluation`

**Rutas Mantenidas:**
- ✅ `dnsh-evaluation` → **ÚNICA RUTA** para todas las evaluaciones DNSH
- ✅ `client-dnsh-evaluation` → Vista de solo lectura agregada a nivel cliente

### 4. Flujo de Evaluación Unificado

```
1. Usuario navega a evaluación DNSH
   ↓
2. Selecciona vista: Portfolio / Group / Asset
   ↓
3. Si Portfolio/Group: Ve resumen agregado
   ↓
4. Click en asset → Vista Asset (EVALUACIÓN GRANULAR)
   ↓
5. Selecciona objetivo DNSH
   ↓
6. Responde cuestionario (Yes/No/N/A + Evidencia)
   ↓
7. Si Adaptación: Selecciona hazards y medidas
   ↓
8. Guarda evaluación → Se actualiza asset.dnshEvaluation
   ↓
9. Vistas agregadas se actualizan automáticamente
```

## Arquitectura de Datos

### Fuente de Verdad: Asset Level

```typescript
Asset {
  dnshEvaluation?: AssetDnshEvaluation {
    // Status por objetivo
    mitigationStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    adaptationStatus: ...
    waterStatus: ...
    // ... otros objetivos
    
    // Respuestas de checklist estructuradas
    checklistAnswers?: {
      [objective]: {
        [questionId]: {
          response: 'Yes' | 'No' | 'N/A';
          evidence: string;
          evidenceIds: string[];
          assessedDate: string;
        }
      }
    }
    
    // Evidencias por objetivo
    mitigationEvidence: string[];
    waterEvidence: string[];
    // ... otros objetivos
  }
}
```

### Vistas Agregadas (Derivadas)

```typescript
// Operation-level stats DERIVED from assets
getOperationDnshStats(operation, objective) {
  // Suma de status de todos los assets
  // Calcula: compliant, nonCompliant, conditional, notAssessed
  // Progress = compliant / totalAssessed
}
```

## Consistencia Garantizada

### 1. Status por Objetivo
- **Única función**: `getAssetObjectiveStatus(asset, objective)`
- Todas las pantallas usan esta función
- Resultado consistente en toda la aplicación

### 2. Cálculo de Stats Agregados
- **Única función**: `getOperationDnshStats(operation, objective)`
- Todas las vistas agregadas usan esta función
- Consistencia garantizada entre Portfolio, Group, Operation views

### 3. Construcción de Evaluación
- **Única función**: `buildEvaluationFromAnswers(asset, answers, existing)`
- Construye evaluación completa desde respuestas de checklist
- Incluye status, evidencias, respuestas estructuradas

## Integración de Funcionalidades

### Cuestionarios Integrados
- ✅ Preguntas visibles en vista Asset
- ✅ Respuestas interactivas (Yes/No/N/A)
- ✅ Campo de evidencia por pregunta
- ✅ Cálculo automático de status
- ✅ Guardado estructurado en `checklistAnswers`

### Evaluación de Adaptación Integrada
- ✅ Módulo completo embebido en vista Asset
- ✅ Solo visible cuando objetivo = ADAPTATION
- ✅ Selección de hazards y medidas
- ✅ Cálculo de riesgo pre/post medidas
- ✅ Guardado en `adaptationStatus`, `adaptationMeasures`, etc.

### Evidencias Estructuradas
- ✅ Vinculación por pregunta y objetivo
- ✅ Lista de evidencias por objetivo
- ✅ Soporte para documentos de evidencia

## Navegación Unificada

### Desde OperationDetail
```typescript
onNavigateToDnshEvaluation() 
  → setCurrentView('dnsh-evaluation')
  → DnshEvaluationEnhancedPage (vista Portfolio)

onNavigateToAssetEvaluation(assetId)
  → setCurrentView('dnsh-evaluation')
  → setSelectedAssetId(assetId)
  → DnshEvaluationEnhancedPage (vista Asset con asset seleccionado)
```

### Desde GlobalMapViewer
```typescript
onAssetDnshClick(assetId)
  → setCurrentView('dnsh-evaluation')
  → setSelectedAssetId(assetId)
  → DnshEvaluationEnhancedPage (vista Asset)
```

### Desde Dashboard
```typescript
onNavigateToDnshEvaluation(operationId)
  → setCurrentView('dnsh-evaluation')
  → DnshEvaluationEnhancedPage (vista Portfolio)
```

## Beneficios de la Integración

### 1. Consistencia
- ✅ Una única fuente de verdad (asset-level)
- ✅ Mismos resultados en todas las pantallas
- ✅ Sin discrepancias entre vistas

### 2. UX Mejorada
- ✅ Una sola pantalla para evaluar
- ✅ Navegación fluida entre vistas
- ✅ Contexto completo siempre visible

### 3. Mantenibilidad
- ✅ Lógica centralizada en servicio
- ✅ Un solo lugar para cambios
- ✅ Fácil de extender y mejorar

### 4. Escalabilidad
- ✅ Fácil agregar nuevos objetivos
- ✅ Fácil agregar nuevas vistas agregadas
- ✅ Arquitectura preparada para crecimiento

## Archivos Modificados

### Nuevos:
- ✅ `services/dnshEvaluationService.ts` - Servicio centralizado
- ✅ `INTEGRACION_EVALUACION_DNSH.md` - Este documento

### Modificados:
- ✅ `pages/DnshEvaluationEnhanced.tsx` - Página unificada mejorada
- ✅ `App.tsx` - Eliminación de rutas duplicadas
- ✅ `types.ts` - Extensiones para `checklistAnswers` en `AssetDnshEvaluation`

### Deprecados (pero mantenidos para compatibilidad):
- ⚠️ `pages/DnshEvaluation.tsx` - Reemplazado por Enhanced
- ⚠️ `pages/AssetEvaluation.tsx` - Integrado en Enhanced
- ⚠️ `pages/DnshChecklist.tsx` - Integrado en Enhanced
- ⚠️ `pages/DnshAdaptation.tsx` - Usado embebido en Enhanced

## Próximos Pasos Recomendados

1. **Migración Completa**: Eliminar archivos deprecados una vez confirmado que todo funciona
2. **Testing**: Validar que todas las evaluaciones se guardan correctamente
3. **Documentación**: Actualizar guías de usuario con nuevo flujo
4. **Performance**: Optimizar carga de evaluaciones grandes
5. **Exportación**: Agregar exportación de evaluaciones completas

## Garantías de Calidad

✅ **Una única fuente de verdad**: Asset-level evaluations
✅ **Consistencia garantizada**: Mismo servicio en todas las vistas
✅ **Evaluación granular**: Solo en vista Asset
✅ **Vistas agregadas**: Derivadas de assets
✅ **Cuestionarios integrados**: En vista Asset
✅ **Adaptación integrada**: Embebida en vista Asset
✅ **Navegación unificada**: Una sola ruta principal
✅ **Sin duplicación**: Lógica centralizada
