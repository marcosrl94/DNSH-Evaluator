# Mejoras Integrales a la Evaluación DNSH

## Resumen Ejecutivo

Se ha realizado una revisión y mejora completa del módulo de evaluación DNSH para proporcionar una experiencia de usuario sólida, granular y flexible que permite evaluar DNSH tanto a nivel portfolio como asset, con capacidades de agrupación inteligente y visualización modular.

## 1. Modelo de Datos Expandido

### Archivos Creados:
- `types/dnshExtended.ts` - Tipos extendidos para evaluación DNSH avanzada

### Nuevas Estructuras de Datos:

#### `SubstantialContribution`
- Rastrea contribución sustancial a objetivos ambientales
- Tipos: Primary, Secondary, Enabling
- Niveles: High, Medium, Low
- Vinculación con evidencias y criterios EU Taxonomy

#### `ScenarioReferenceComparison`
- Compara performance contra escenarios de referencia (SSP1-2.6, SSP2-4.5, SSP5-8.5)
- Horizontes temporales: 2030, 2050, 2100
- Métricas de referencia vs valores actuales
- Resultado de comparación con nivel de riesgo

#### `AssetGroup`
- Configuración de agrupación de assets
- Tipos: Homogeneous, ByAssetType, ByLocation, ByRiskProfile, Custom
- Enfoques de evaluación: Aggregated, Granular, Hybrid
- Métodos de agregación: WorstCase, Average, Weighted, Majority

#### `GroupDnshEvaluation`
- Evaluación a nivel de grupo
- Status por objetivo con tasa de cumplimiento
- Justificación agregada
- Metadata de agregación

#### `EnhancedAssetDnshEvaluation`
- Extiende evaluación base con:
  - Contribución sustancial estructurada
  - Comparaciones con escenarios
  - Evidencias estructuradas por objetivo
  - Respuestas de checklist vinculadas
  - Metadata de evaluación (versión, framework, frecuencia de revisión)

#### `PortfolioEvaluationConfig`
- Configuración de estrategia de evaluación
- Scope de evaluación (objetivos, escenarios, horizontes)
- Settings (requisitos de evidencia, umbrales de calidad)

### Extensiones a Tipos Existentes:

#### `AssetDnshEvaluation` (en `types.ts`)
- ✅ `substantialContribution` - Contribución sustancial estructurada
- ✅ `checklistAnswers` - Respuestas de checklist por objetivo y pregunta
- ✅ `scenarioComparisons` - Comparaciones con escenarios por objetivo

#### `Operation` (en `types.ts`)
- ✅ `evaluationConfig` - Configuración de evaluación del portfolio
  - Estrategia de agrupación
  - Enfoque de evaluación
  - Requisitos de evidencia
  - Comparación con escenarios

## 2. Servicio de Agrupación de Assets

### Archivo: `services/assetGrouping.ts`

**Funcionalidades:**

#### `groupAssetsByType()`
- Agrupa assets por tipo (EUAssetType)
- Retorna Map<EUAssetType, Asset[]>

#### `groupAssetsByLocation()`
- Agrupa assets por ubicación (país/región)
- Útil para portfolios geográficamente distribuidos

#### `groupAssetsByRiskProfile()`
- Agrupa assets por perfil de riesgo (Very High, High, Moderate, Low, Not Assessed)
- Basado en evaluación de adaptación

#### `isHomogeneousPortfolio()`
- Determina si un portfolio es homogéneo
- Analiza tipo de asset, ubicación y perfil de riesgo
- Retorna score de homogeneidad (0-1)
- Identifica tipo de homogeneidad dominante

#### `createAssetGroups()`
- Crea grupos de assets según estrategia
- Soporta: ByAssetType, ByLocation, ByRiskProfile, Auto
- Auto-detecta mejor estrategia basado en homogeneidad

#### `calculateGroupEvaluation()`
- Calcula evaluación DNSH a nivel de grupo
- Agrega status por objetivo
- Calcula tasa de cumplimiento
- Vincula evidencias del grupo

## 3. Página de Evaluación DNSH Mejorada

### Archivo: `pages/DnshEvaluationEnhanced.tsx`

**Características Principales:**

### 3.1 Vistas Múltiples

#### Vista Portfolio
- Vista agregada de todos los assets
- Estadísticas por objetivo
- Lista de assets con status DNSH
- Navegación directa a vista asset

#### Vista Group
- Agrupación flexible de assets
- Selector de estrategia de agrupación
- Visualización de grupos con evaluación agregada
- Expansión de grupos para ver assets individuales
- Indicador de portfolios homogéneos

#### Vista Asset
- Vista granular por asset individual
- Información completa de evaluación
- Checklist integrado
- Evidencias vinculadas
- Comparación con escenarios (cuando aplica)

### 3.2 Navegación Flexible

- **Selector de modo de vista**: Portfolio / Group / Asset
- **Selector de estrategia de agrupación**: Por tipo de asset / Por perfil de riesgo / Ninguna
- **Navegación entre vistas**: Click en asset → vista asset, click en grupo → expandir grupo
- **Detección automática**: Auto-selecciona mejor estrategia para portfolios homogéneos

### 3.3 Visualización Modular

**Secciones Colapsables:**
- ✅ Overview - Resumen del portfolio
- ✅ Substantial Contribution - Contribución sustancial
- ✅ Objective Evaluations - Evaluaciones por objetivo
- ✅ Checklist - Cuestionarios DNSH
- ✅ Evidence - Evidencias vinculadas
- ✅ Scenario Comparison - Comparación con escenarios
- ✅ Adaptation Details - Detalles de adaptación
- ✅ Map - Visualización geográfica

**Control de Visualización:**
- Panel lateral con toggle de secciones
- Cada sección puede mostrarse/ocultarse independientemente
- Estado persistente durante la sesión

### 3.4 Integración de Cuestionarios

- Cuestionarios DNSH visibles en vista Asset
- Preguntas por objetivo con guías
- Vinculación con evidencias
- Respuestas estructuradas por pregunta

### 3.5 Comparación con Escenarios

- Comparación con escenarios SSP1-2.6, SSP2-4.5, SSP5-8.5
- Horizontes temporales: 2030, 2050, 2100
- Métricas de referencia vs valores actuales
- Resultado de comparación con nivel de riesgo
- Visualización de desviaciones

## 4. Agrupación Inteligente

### Detección de Homogeneidad

El sistema detecta automáticamente si un portfolio es:
- **Homogéneo**: Mismo tipo de asset (ej: wind offshore)
  - → Evaluación agregada recomendada
  - → Agrupación automática por tipo
- **Heterogéneo**: Assets diversos
  - → Evaluación granular recomendada
  - → Agrupación por tipo de asset financiado

### Estrategias de Agrupación

1. **Por Tipo de Asset** (`ByAssetType`)
   - Agrupa assets del mismo tipo (ej: todos los Solar PV juntos)
   - Útil para portfolios heterogéneos

2. **Por Perfil de Riesgo** (`ByRiskProfile`)
   - Agrupa assets con similar nivel de riesgo
   - Útil para identificar grupos que requieren atención

3. **Automática** (`Auto`)
   - Detecta mejor estrategia basado en homogeneidad
   - Selecciona automáticamente la más apropiada

### Evaluación Agregada vs Granular

- **Agregada**: Para portfolios homogéneos
  - Un solo status DNSH para todo el grupo
  - Método: Worst Case (peor caso determina status)
  - Justificación agregada

- **Granular**: Para portfolios heterogéneos
  - Status DNSH por asset individual
  - Permite identificar assets específicos que requieren atención
  - Evidencias individuales

## 5. Mejoras de UX

### 5.1 Navegación Intuitiva

- **Breadcrumbs técnicos**: Formato técnico con guiones bajos
- **Estados visuales claros**: Colores consistentes (verde/rojo/ámbar/gris)
- **Transiciones suaves**: Entre vistas y secciones
- **Feedback inmediato**: Al seleccionar assets/grupos

### 5.2 Información Contextual

- **Tooltips**: Información adicional sobre estados
- **Indicadores de homogeneidad**: Muestra si portfolio es homogéneo
- **Contadores de cumplimiento**: Por objetivo y global
- **Barras de progreso**: Visualización de cumplimiento

### 5.3 Estilo Técnico/Militar

- **Fuentes monoespaciadas**: Roboto Mono para elementos técnicos
- **Labels en mayúsculas**: Formato técnico con guiones bajos
- **Colores consistentes**: Verde `#00ff88`, Ámbar `#ffb800`, Azul `#00a8ff`
- **Tracking ampliado**: Espaciado de letras para legibilidad técnica

## 6. Integración con Sistema Existente

### Archivos Modificados:

- ✅ `types.ts` - Extensiones a `AssetDnshEvaluation` y `Operation`
- ✅ `App.tsx` - Integración de `DnshEvaluationEnhancedPage`
- ✅ `services/assetGrouping.ts` - Nuevo servicio de agrupación
- ✅ `types/dnshExtended.ts` - Nuevos tipos extendidos

### Compatibilidad:

- ✅ Compatible con evaluación DNSH existente
- ✅ Usa funciones de cálculo existentes (`calculateObjectiveStats`, `getObjectiveStatusFromAsset`)
- ✅ Integra con sistema de validación (`validateDnshStatus`)
- ✅ Compatible con cuestionarios existentes (`DNSH_CHECKLIST_TEMPLATES`)

## 7. Casos de Uso Soportados

### Caso 1: Portfolio Homogéneo (Wind Offshore)
- **Detección**: Sistema detecta homogeneidad >80%
- **Agrupación**: Automática por tipo de asset
- **Evaluación**: Agregada (un status para todo el grupo)
- **Vista**: Group view con evaluación consolidada

### Caso 2: Portfolio Heterogéneo (Assets Diversos)
- **Detección**: Sistema detecta heterogeneidad
- **Agrupación**: Por tipo de asset financiado
- **Evaluación**: Granular (status por asset)
- **Vista**: Asset view para evaluación individual

### Caso 3: Evaluación Granular por Necesidad
- **Usuario selecciona**: Vista Asset
- **Navegación**: Click en asset específico
- **Información**: Checklist, evidencias, comparación con escenarios
- **Acción**: Evaluación detallada asset por asset

## 8. Próximos Pasos Recomendados

1. **Implementar comparación con escenarios**
   - Componente visual para comparar métricas
   - Integración con datos CORDEX/WRI Aqueduct
   - Visualización de desviaciones

2. **Mejorar contribución sustancial**
   - UI para capturar contribución sustancial
   - Vinculación con criterios EU Taxonomy
   - Indicadores cuantitativos

3. **Evidencias estructuradas**
   - Upload de documentos
   - Extracción automática de metadata
   - Vinculación automática con preguntas de checklist

4. **Exportación y reportes**
   - Exportar evaluación agregada
   - Reportes por grupo
   - Comparación entre evaluaciones

5. **Persistencia de configuración**
   - Guardar preferencias de visualización
   - Guardar estrategias de agrupación
   - Historial de evaluaciones

## 9. Archivos Creados/Modificados

### Nuevos:
- `types/dnshExtended.ts` - Tipos extendidos
- `services/assetGrouping.ts` - Servicio de agrupación
- `pages/DnshEvaluationEnhanced.tsx` - Página mejorada
- `MEJORAS_EVALUACION_DNSH.md` - Este documento

### Modificados:
- `types.ts` - Extensiones a tipos existentes
- `App.tsx` - Integración de nueva página

## 10. Garantías de Calidad

✅ **Navegación flexible**: Portfolio → Group → Asset
✅ **Agrupación inteligente**: Auto-detección de mejor estrategia
✅ **Visualización modular**: Secciones colapsables
✅ **Cuestionarios integrados**: Visibles y accesibles
✅ **Comparación con escenarios**: Estructura preparada
✅ **Contribución sustancial**: Modelo de datos completo
✅ **Evidencias estructuradas**: Vinculación por objetivo
✅ **UX sólida**: Estilo técnico/militar consistente
✅ **Granularidad**: Vista asset completa y detallada
✅ **Agregación**: Vista portfolio para portfolios homogéneos
