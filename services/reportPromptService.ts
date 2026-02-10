/**
 * Report Prompt Service
 * 
 * Manages localized AI prompts for report sections, allowing fine-tuning
 * of AI-generated content throughout the document generation process.
 */

import { ReportSection, ReportSectionType, SectionPrompt } from './reportingService';
import { Operation, Asset, Client, DnshObjective, AssetDnshEvaluation } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';

export interface PromptContext {
  client?: Client;
  operation?: Operation;
  asset?: Asset;
  operations?: Operation[];
  metrics?: any;
  objectiveCompliance?: any;
  riskDistribution?: any;
  detailedDnshData?: DetailedDNSHData;
}

export interface DetailedDNSHData {
  checklistAnswers?: Record<DnshObjective, Record<string, { response: boolean | null; notes?: string }>>;
  adaptationMeasures?: Array<{
    id: string;
    name: string;
    description: string;
    hazard?: string;
    effectiveness?: string;
  }>;
  evidenceDocuments?: Array<{
    id: string;
    name: string;
    type: string;
    relatedObjective?: DnshObjective;
  }>;
  hazardScope?: Record<string, {
    inScope: boolean;
    justification: string;
    mapData?: any;
  }>;
  substantialContribution?: DnshObjective;
}

/**
 * Build comprehensive DNSH evaluation context from operation/asset data
 */
export function buildDetailedDNSHContext(
  operation?: Operation,
  asset?: Asset
): DetailedDNSHData {
  const data: DetailedDNSHData = {};

  // Get checklist answers if available
  if (asset?.dnshEvaluation) {
    const evaluation = asset.dnshEvaluation;
    
    // Extract checklist answers
    if (evaluation.checklistAnswers) {
      data.checklistAnswers = evaluation.checklistAnswers as any;
    }

    // Extract adaptation measures
    if (evaluation.adaptationMeasures && Array.isArray(evaluation.adaptationMeasures)) {
      data.adaptationMeasures = evaluation.adaptationMeasures.map((m: any) => ({
        id: typeof m === 'string' ? m : m.id || m.name,
        name: typeof m === 'string' ? m : m.name || m.id,
        description: typeof m === 'string' ? m : m.description || '',
        hazard: typeof m === 'object' ? m.hazard : undefined,
        effectiveness: typeof m === 'object' ? m.effectiveness : undefined
      }));
    }

    // Extract substantial contribution
    if (asset.attributes?.substantialContribution) {
      data.substantialContribution = asset.attributes.substantialContribution;
    }
  }

  // Get evidence documents
  if (operation?.evidenceDocuments) {
    data.evidenceDocuments = operation.evidenceDocuments
      .filter(ev => !asset || !ev.assetId || ev.assetId === asset.id)
      .map(ev => ({
        id: ev.id,
        name: ev.name,
        type: ev.type,
        relatedObjective: ev.relatedObjective
      }));
  }

  // Get hazard scope data if available
  if (asset?.attributes) {
    const hazardScope: Record<string, { inScope: boolean; justification: string }> = {};
    
    // This would be populated from hazardScopeDetermination service
    // For now, we'll structure it for future integration
    data.hazardScope = hazardScope;
  }

  return data;
}

/**
 * Get default prompt for a section type
 */
export function getDefaultPromptForSection(
  sectionType: ReportSectionType,
  context: PromptContext
): string {
  const { detailedDnshData, operation, asset, metrics, objectiveCompliance } = context;

  switch (sectionType) {
    case ReportSectionType.EXECUTIVE_SUMMARY:
      return `Genera un Resumen Ejecutivo profesional y completo para un reporte DNSH.

Contexto:
- ${operation ? `Operación: ${operation.name}` : asset ? `Activo: ${asset.name}` : 'Nivel de compañía'}
- ${metrics?.overallComplianceRate ? `Cumplimiento general: ${metrics.overallComplianceRate.toFixed(1)}%` : ''}
${detailedDnshData?.checklistAnswers ? `- Evaluación DNSH detallada disponible con respuestas de checklist` : ''}
${detailedDnshData?.adaptationMeasures?.length ? `- ${detailedDnshData.adaptationMeasures.length} medidas de adaptación identificadas` : ''}

El resumen debe:
1. Proporcionar contexto y alcance del análisis DNSH
2. Presentar hallazgos principales con métricas específicas
3. Analizar cada objetivo DNSH identificando fortalezas y áreas de mejora
4. Evaluar riesgos climáticos con datos específicos
5. Incluir conclusiones ejecutivas basadas en datos reales
6. Proponer próximos pasos con acciones específicas y medibles

${detailedDnshData?.checklistAnswers ? 'IMPORTANTE: Incluye referencias específicas a las respuestas del checklist DNSH cuando sean relevantes.' : ''}
${detailedDnshData?.substantialContribution ? `NOTA: Este proyecto contribuye sustancialmente al objetivo ${detailedDnshData.substantialContribution}, lo cual debe reflejarse en el análisis.` : ''}`;

    case ReportSectionType.DNSH_COMPLIANCE:
      return `Genera una sección detallada de Cumplimiento DNSH con análisis profundo por objetivo.

Contexto:
${operation ? `- Operación: ${operation.name} (${operation.country})` : ''}
${asset ? `- Activo: ${asset.name} (${asset.assetType})` : ''}
${objectiveCompliance ? `- Datos de cumplimiento por objetivo disponibles` : ''}

${detailedDnshData?.checklistAnswers ? `
DATOS DETALLADOS DISPONIBLES:
- Respuestas completas del checklist DNSH por objetivo
- Justificaciones y notas adicionales donde estén disponibles
- Evidencias vinculadas por objetivo

IMPORTANTE: Usa estos datos detallados para:
1. Referenciar respuestas específicas del checklist
2. Explicar el razonamiento detrás de cada evaluación
3. Vincular evidencias con objetivos específicos
4. Identificar gaps y áreas de mejora con precisión
` : ''}

La sección debe incluir:
1. Análisis detallado por cada uno de los 6 objetivos DNSH
2. Identificación de activos/operaciones problemáticas con detalles específicos
3. Análisis de causas raíz basado en datos del checklist
4. Recomendaciones específicas por objetivo con acciones concretas
5. Estrategia de mejora continua con métricas de seguimiento

${detailedDnshData?.substantialContribution ? `NOTA ESPECIAL: El objetivo ${detailedDnshData.substantialContribution} tiene contribución sustancial - esto debe destacarse claramente.` : ''}`;

    case ReportSectionType.RISK_ASSESSMENT:
      return `Genera una Evaluación Detallada de Riesgos Climáticos con análisis técnico profundo.

Contexto:
${operation ? `- Operación: ${operation.name}` : ''}
${asset ? `- Activo: ${asset.name}` : ''}
${metrics?.riskBand ? `- Banda de riesgo: ${metrics.riskBand}` : ''}
${metrics?.totalAAL ? `- Pérdida anual promedio (AAL): €${(metrics.totalAAL / 1000000).toFixed(2)}M` : ''}

${detailedDnshData?.adaptationMeasures?.length ? `
MEDIDAS DE ADAPTACIÓN IDENTIFICADAS:
${detailedDnshData.adaptationMeasures.map((m, i) => `${i + 1}. ${m.name}${m.hazard ? ` (Hazard: ${m.hazard})` : ''}${m.description ? `: ${m.description}` : ''}`).join('\n')}

IMPORTANTE: Analiza cómo estas medidas mitigan los riesgos identificados y evalúa su efectividad.
` : ''}

La evaluación debe incluir:
1. Análisis de exposición financiera (AAL si está disponible)
2. Identificación de operaciones/activos críticos con detalles específicos
3. Análisis de tipos de riesgos identificados con justificación
4. Evaluación de medidas de adaptación existentes y su efectividad
5. Recomendaciones específicas por nivel de riesgo con cronogramas
6. Métricas de seguimiento propuestas para monitoreo continuo`;

    case ReportSectionType.RECOMMENDATIONS:
      return `Genera Recomendaciones Estratégicas y Acciones Prioritarias basadas en datos reales.

Contexto:
${objectiveCompliance ? `- Cumplimiento por objetivo disponible` : ''}
${detailedDnshData?.checklistAnswers ? `- Análisis detallado de checklist disponible` : ''}
${detailedDnshData?.adaptationMeasures?.length ? `- ${detailedDnshData.adaptationMeasures.length} medidas de adaptación identificadas` : ''}

${detailedDnshData?.checklistAnswers ? `
DATOS DEL CHECKLIST DISPONIBLES:
Usa las respuestas del checklist para identificar:
- Objetivos con respuestas incompletas o negativas
- Áreas donde se requieren medidas correctivas específicas
- Priorización basada en el estado real de cumplimiento
` : ''}

Las recomendaciones deben:
1. Estar priorizadas por plazo (corto: 0-3 meses, mediano: 3-6 meses, largo: 6-12 meses)
2. Ser específicas y accionables con responsables y recursos
3. Incluir métricas de éxito medibles
4. Basarse en datos reales del análisis DNSH
5. Referenciar objetivos específicos y medidas concretas
6. Incluir cronogramas y hitos claros`;

    default:
      return `Genera contenido profesional para la sección "${sectionType}" de un reporte DNSH basado en los datos proporcionados.`;
  }
}

/**
 * Apply custom prompts to section generation
 */
export function applyCustomPrompts(
  defaultPrompt: string,
  customPrompts?: SectionPrompt[]
): string {
  if (!customPrompts || customPrompts.length === 0) {
    return defaultPrompt;
  }

  const enabledPrompts = customPrompts.filter(p => p.enabled);
  if (enabledPrompts.length === 0) {
    return defaultPrompt;
  }

  // Combine prompts based on position
  let finalPrompt = defaultPrompt;
  
  const beforePrompts = enabledPrompts.filter(p => p.position === 'before');
  const afterPrompts = enabledPrompts.filter(p => p.position === 'after');
  const replacePrompts = enabledPrompts.filter(p => p.position === 'replace');

  if (replacePrompts.length > 0) {
    // If there are replace prompts, use the last one
    finalPrompt = replacePrompts[replacePrompts.length - 1].prompt;
  } else {
    // Otherwise, combine before and after
    if (beforePrompts.length > 0) {
      finalPrompt = beforePrompts.map(p => p.prompt).join('\n\n') + '\n\n' + finalPrompt;
    }
    if (afterPrompts.length > 0) {
      finalPrompt = finalPrompt + '\n\n' + afterPrompts.map(p => p.prompt).join('\n\n');
    }
  }

  return finalPrompt;
}

/**
 * Create a new section prompt
 */
export function createSectionPrompt(
  prompt: string,
  position: 'before' | 'after' | 'replace' = 'after',
  enabled: boolean = true
): SectionPrompt {
  return {
    id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    prompt,
    position,
    enabled,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Update section prompt
 */
export function updateSectionPrompt(
  section: ReportSection,
  promptId: string,
  updates: Partial<SectionPrompt>
): ReportSection {
  const prompts = section.customPrompts || [];
  const updatedPrompts = prompts.map(p => 
    p.id === promptId 
      ? { ...p, ...updates, updatedAt: new Date().toISOString() }
      : p
  );

  return {
    ...section,
    customPrompts: updatedPrompts
  };
}

/**
 * Add prompt to section
 */
export function addPromptToSection(
  section: ReportSection,
  prompt: SectionPrompt
): ReportSection {
  return {
    ...section,
    customPrompts: [...(section.customPrompts || []), prompt]
  };
}

/**
 * Remove prompt from section
 */
export function removePromptFromSection(
  section: ReportSection,
  promptId: string
): ReportSection {
  return {
    ...section,
    customPrompts: (section.customPrompts || []).filter(p => p.id !== promptId)
  };
}
