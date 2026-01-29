/**
 * AI Gen Service for Reporting
 * 
 * Provides AI-powered content generation and modification capabilities:
 * - Generate report sections based on data
 * - Modify existing content with AI assistance
 * - Provide justifications based on evidence
 * - Suggest improvements linked to evidence
 */

import { ReportSection, ReportSectionType } from './reportingService';
import { EvidenceDocument, DnshObjective, Asset, Operation, Client } from '../types';
import { getAllMeasures } from '../constants/extendedMeasures';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { generateText, generateWithContext, isGeminiConfigured } from './geminiService';
import { logger } from '../utils/logger';

export interface AIGenerationRequest {
  sectionType: ReportSectionType;
  context: {
    level: 'company' | 'portfolio' | 'asset';
    client?: Client;
    operation?: Operation;
    asset?: Asset;
    existingContent?: string;
    evidenceDocuments?: EvidenceDocument[];
    metrics?: Record<string, any>;
  };
  instruction?: string; // User instruction for modification
}

export interface AIGenerationResponse {
  content: string;
  suggestions?: string[];
  evidenceReferences?: string[];
  confidence?: number;
  reasoning?: string;
}

export interface AISuggestion {
  type: 'improvement' | 'justification' | 'evidence_link' | 'content_enhancement';
  title: string;
  description: string;
  suggestedContent?: string;
  evidenceIds?: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * Generate report section content using AI
 * Uses Gemini AI when available, falls back to template-based generation
 */
export const generateReportSection = async (
  request: AIGenerationRequest
): Promise<AIGenerationResponse> => {
  const { sectionType, context } = request;
  
  // Build context string for AI
  const contextString = buildContextString(context);
  
  // Try to use Gemini AI if available
  if (await isGeminiConfigured()) {
    try {
      const sectionPrompt = buildSectionPrompt(sectionType, context, contextString);
      const systemInstruction = 'Eres un experto en DNSH y Taxonomía Europea. Genera contenido profesional y técnico para reportes de evaluación DNSH. Responde siempre en español.';
      
      const aiContent = await generateText(sectionPrompt, systemInstruction, {
        temperature: 0.7,
        maxTokens: 2048
      });
      
      // Extract evidence references
      const evidenceReferences = context.evidenceDocuments?.map(ev => ev.id) || [];
      
      // Generate suggestions if needed
      let suggestions: string[] = [];
      if (sectionType === ReportSectionType.RECOMMENDATIONS) {
        suggestions = generateRecommendationsSuggestions(context);
      }
      
      return {
        content: aiContent,
        suggestions,
        evidenceReferences,
        confidence: 0.90,
        reasoning: 'Content generated using Google Gemini AI'
      };
    } catch (error) {
      logger.warn('Error using Gemini AI, falling back to template generation:', error);
      // Fall through to template-based generation
    }
  }
  
  // Fallback to template-based generation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let content = '';
  let suggestions: string[] = [];
  let evidenceReferences: string[] = [];
  
  switch (sectionType) {
    case ReportSectionType.EXECUTIVE_SUMMARY:
      content = generateExecutiveSummaryContent(context, contextString);
      break;
    case ReportSectionType.DNSH_COMPLIANCE:
      content = generateDNSHComplianceContent(context, contextString);
      evidenceReferences = context.evidenceDocuments?.map(ev => ev.id) || [];
      break;
    case ReportSectionType.RISK_ASSESSMENT:
      content = generateRiskAssessmentContent(context, contextString);
      break;
    case ReportSectionType.EVIDENCE_REVIEW:
      content = generateEvidenceReviewContent(context, contextString);
      evidenceReferences = context.evidenceDocuments?.map(ev => ev.id) || [];
      break;
    case ReportSectionType.FINANCIAL_METRICS:
      content = generateFinancialMetricsContent(context, contextString);
      break;
    case ReportSectionType.RECOMMENDATIONS:
      content = generateRecommendationsContent(context, contextString);
      suggestions = generateRecommendationsSuggestions(context);
      break;
    default:
      content = generateGenericContent(context, contextString);
  }
  
  // Apply user instruction if provided (for modifications)
  if (request.instruction) {
    content = applyModification(content, request.instruction, context);
  }
  
  return {
    content,
    suggestions,
    evidenceReferences,
    confidence: 0.85,
    reasoning: 'Content generated based on available data and DNSH evaluation framework'
  };
};

/**
 * Build prompt for section generation
 */
function buildSectionPrompt(
  sectionType: ReportSectionType,
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  const sectionTitles: Record<ReportSectionType, string> = {
    [ReportSectionType.EXECUTIVE_SUMMARY]: 'Resumen Ejecutivo',
    [ReportSectionType.DNSH_COMPLIANCE]: 'Cumplimiento DNSH',
    [ReportSectionType.RISK_ASSESSMENT]: 'Evaluación de Riesgos Climáticos',
    [ReportSectionType.EVIDENCE_REVIEW]: 'Revisión de Evidencias',
    [ReportSectionType.FINANCIAL_METRICS]: 'Métricas Financieras',
    [ReportSectionType.RECOMMENDATIONS]: 'Recomendaciones',
  };
  
  let prompt = `Genera un ${sectionTitles[sectionType]} profesional para un reporte de evaluación DNSH.\n\n`;
  prompt += `CONTEXTO:\n${contextString}\n\n`;
  
  if (context.client) {
    prompt += `Cliente: ${context.client.name}\n`;
    if (context.client.country) prompt += `País: ${context.client.country}\n`;
  }
  
  if (context.operation) {
    prompt += `Operación: ${context.operation.name}\n`;
    prompt += `Sector NACE: ${context.operation.sectorNACE}\n`;
    prompt += `CAPEX: €${(context.operation.capex / 1000000).toFixed(1)}M\n`;
  }
  
  if (context.asset) {
    prompt += `Activo: ${context.asset.name}\n`;
    prompt += `Tipo: ${context.asset.assetType}\n`;
    prompt += `Valor: €${(context.asset.exposedValue / 1000000).toFixed(1)}M\n`;
    if (context.asset.dnshEvaluation) {
      prompt += `Estado DNSH: ${context.asset.dnshEvaluation.overallStatus}\n`;
    }
  }
  
  if (context.evidenceDocuments && context.evidenceDocuments.length > 0) {
    prompt += `\nEvidencias disponibles (${context.evidenceDocuments.length} documentos):\n`;
    context.evidenceDocuments.forEach((ev, idx) => {
      prompt += `${idx + 1}. ${ev.name} (${ev.type})`;
      if (ev.description) prompt += `: ${ev.description}`;
      prompt += '\n';
    });
  }
  
  prompt += `\nGenera el contenido del ${sectionTitles[sectionType]} en formato Markdown, siendo profesional, técnico y basado en los datos proporcionados.`;
  
  return prompt;
}

/**
 * Modify existing content with AI assistance
 */
export const modifyReportContent = async (
  currentContent: string,
  instruction: string,
  context: AIGenerationRequest['context']
): Promise<AIGenerationResponse> => {
  // Try to use Gemini AI if available
  if (await isGeminiConfigured()) {
    try {
      const contextString = buildContextString(context);
      const prompt = `Modifica el siguiente contenido según la instrucción del usuario.\n\nCONTENIDO ACTUAL:\n${currentContent}\n\nINSTRUCCIÓN: ${instruction}\n\nCONTEXTO:\n${contextString}\n\nGenera el contenido modificado manteniendo el formato Markdown y el estilo profesional.`;
      
      const modifiedContent = await generateText(prompt, 'Eres un experto en edición de contenido técnico. Modifica el contenido según las instrucciones manteniendo calidad y formato.', {
        temperature: 0.7,
        maxTokens: 2048
      });
      
      return {
        content: modifiedContent,
        confidence: 0.85,
        reasoning: `Content modified using Google Gemini AI based on instruction: "${instruction}"`
      };
    } catch (error) {
      logger.warn('Error using Gemini AI for modification, falling back to simple logic:', error);
      // Fall through to simple modification
    }
  }
  
  // Fallback to simple modification logic
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const modifiedContent = applyModification(currentContent, instruction, context);
  
  return {
    content: modifiedContent,
    confidence: 0.80,
    reasoning: `Content modified based on instruction: "${instruction}"`
  };
};

/**
 * Generate comprehensive justifications based on evidence
 * Enhanced version with detailed analysis and context
 * Uses Gemini AI when available
 */
export const generateJustification = async (
  objective: DnshObjective,
  status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed',
  evidenceDocuments: EvidenceDocument[],
  context: { asset?: Asset; operation?: Operation; client?: Client }
): Promise<string> => {
  // Try to use Gemini AI if available
  if (await isGeminiConfigured()) {
    try {
      const objectiveLabel = getObjectiveLabel(objective);
      const objectiveNumber = getObjectiveNumber(objective);
      
      let prompt = `Genera una justificación completa y profesional del cumplimiento DNSH para el Objetivo ${objectiveNumber}: ${objectiveLabel}.\n\n`;
      prompt += `ESTADO EVALUADO: ${status}\n\n`;
      
      if (context.asset) {
        prompt += `ACTIVO:\n`;
        prompt += `- Nombre: ${context.asset.name}\n`;
        prompt += `- Tipo: ${context.asset.assetType}\n`;
        prompt += `- Valor: €${(context.asset.exposedValue / 1000000).toFixed(1)}M\n`;
        if (context.asset.dnshEvaluation) {
          prompt += `- Estado DNSH General: ${context.asset.dnshEvaluation.overallStatus}\n`;
        }
      }
      
      if (context.operation) {
        prompt += `\nOPERACIÓN:\n`;
        prompt += `- Nombre: ${context.operation.name}\n`;
        prompt += `- País: ${context.operation.country}\n`;
        prompt += `- Sector NACE: ${context.operation.sectorNACE}\n`;
      }
      
      if (evidenceDocuments.length > 0) {
        prompt += `\nEVIDENCIAS DISPONIBLES (${evidenceDocuments.length} documentos):\n`;
        evidenceDocuments.forEach((ev, idx) => {
          prompt += `${idx + 1}. ${ev.name} (${ev.type})`;
          if (ev.documentDate) prompt += ` - Fecha: ${ev.documentDate}`;
          if (ev.description) prompt += `\n   Descripción: ${ev.description}`;
          prompt += '\n';
        });
      }
      
      prompt += `\nGenera una justificación completa en formato Markdown que incluya:\n`;
      prompt += `1. Análisis del estado de cumplimiento\n`;
      prompt += `2. Base documental y evidencias\n`;
      prompt += `3. Justificación técnica detallada\n`;
      prompt += `4. Conclusión y referencias regulatorias\n\n`;
      prompt += `Sé profesional, técnico y preciso. Incluye referencias a la Taxonomía Europea (Reglamento UE 2020/852).`;
      
      const justification = await generateText(prompt, 'Eres un experto en DNSH y Taxonomía Europea. Genera justificaciones técnicas profesionales y detalladas.', {
        temperature: 0.6,
        maxTokens: 3000
      });
      
      return justification;
    } catch (error) {
      logger.warn('Error using Gemini AI for justification, falling back to template:', error);
      // Fall through to template-based generation
    }
  }
  
  // Fallback to template-based generation
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const relevantEvidence = evidenceDocuments.filter(
    ev => !ev.relatedObjective || ev.relatedObjective === objective
  );
  
  const objectiveLabel = getObjectiveLabel(objective);
  const objectiveNumber = getObjectiveNumber(objective);
  
  // Build comprehensive context
  const assetInfo = context.asset ? 
    `${context.asset.name} (${context.asset.assetType})` : 
    'el activo';
  const operationInfo = context.operation ? 
    `la operación ${context.operation.name} (${context.operation.sectorNACE})` : 
    'la operación';
  const locationInfo = context.asset ? 
    `ubicado en ${context.asset.lat.toFixed(4)}, ${context.asset.lng.toFixed(4)}` : 
    context.operation ? `ubicada en ${context.operation.country}` : '';
  
  let justification = `# Justificación del Cumplimiento DNSH\n\n`;
  justification += `## Objetivo ${objectiveNumber}: ${objectiveLabel}\n\n`;
  justification += `**Estado Evaluado**: ${status}\n\n`;
  
  // Context section
  justification += `### Contexto de la Evaluación\n\n`;
  justification += `La presente evaluación corresponde a ${assetInfo} de ${operationInfo}`;
  if (locationInfo) {
    justification += ` ${locationInfo}`;
  }
  justification += `.\n\n`;
  
  // Detailed status analysis
  if (status === 'Compliant') {
    justification += `### Análisis de Cumplimiento\n\n`;
    justification += `Tras la revisión exhaustiva de la documentación disponible y el análisis técnico realizado, `;
    justification += `se concluye que ${assetInfo} **cumple plenamente** con los requisitos establecidos en el `;
    justification += `Objetivo ${objectiveNumber} de la Taxonomía Europea de Actividades Sostenibles.\n\n`;
    
    if (relevantEvidence.length > 0) {
      justification += `### Base Documental\n\n`;
      justification += `Esta conclusión se fundamenta en la siguiente documentación técnica y legal:\n\n`;
      
      relevantEvidence.forEach((ev, idx) => {
        justification += `${idx + 1}. **${ev.name}**\n`;
        justification += `   - Tipo de documento: ${ev.type}\n`;
        if (ev.documentDate) {
          justification += `   - Fecha: ${ev.documentDate}\n`;
        }
        if (ev.description) {
          justification += `   - Descripción: ${ev.description}\n`;
        }
        if (ev.url) {
          justification += `   - Referencia: ${ev.url}\n`;
        }
        justification += '\n';
      });
      
      justification += `### Justificación Técnica\n\n`;
      justification += `Los documentos mencionados proporcionan evidencia suficiente para demostrar que:\n\n`;
      
      // Objective-specific justification points
      const justificationPoints = getObjectiveJustificationPoints(objective, context);
      justificationPoints.forEach((point, idx) => {
        justification += `${idx + 1}. ${point}\n`;
      });
      
      justification += `\n### Conclusión\n\n`;
      justification += `En base a la documentación revisada y el análisis técnico realizado, `;
      justification += `se confirma el cumplimiento del Objetivo ${objectiveNumber} según los criterios `;
      justification += `establecidos en la Taxonomía Europea.\n\n`;
    } else {
      justification += `### Observaciones\n\n`;
      justification += `Aunque no se han identificado documentos de evidencia específicos vinculados a este objetivo, `;
      justification += `la evaluación técnica realizada indica cumplimiento basado en las características del activo `;
      justification += `y su alineamiento con los criterios de la Taxonomía Europea.\n\n`;
    }
    
  } else if (status === 'Non-Compliant') {
    justification += `### Análisis de No Cumplimiento\n\n`;
    justification += `La evaluación realizada indica que ${assetInfo} **no cumple** con los requisitos `;
    justification += `establecidos en el Objetivo ${objectiveNumber} de la Taxonomía Europea.\n\n`;
    
    if (relevantEvidence.length > 0) {
      justification += `### Documentación Revisada\n\n`;
      justification += `La evaluación se ha basado en la siguiente documentación:\n\n`;
      relevantEvidence.forEach((ev, idx) => {
        justification += `${idx + 1}. ${ev.name} (${ev.type})`;
        if (ev.documentDate) justification += ` - ${ev.documentDate}`;
        justification += '\n';
      });
      justification += '\n';
    }
    
    justification += `### Aspectos Identificados\n\n`;
    const nonCompliancePoints = getNonCompliancePoints(objective, context);
    nonCompliancePoints.forEach((point, idx) => {
      justification += `${idx + 1}. ${point}\n`;
    });
    
    justification += `\n### Medidas Requeridas\n\n`;
    justification += `Para alcanzar el cumplimiento del Objetivo ${objectiveNumber}, se requieren las siguientes acciones:\n\n`;
    const requiredActions = getRequiredActions(objective, context);
    requiredActions.forEach((action, idx) => {
      justification += `${idx + 1}. ${action}\n`;
    });
    
    justification += `\n### Recomendaciones\n\n`;
    justification += `Se recomienda implementar un plan de acción específico con plazos definidos para `;
    justification += `abordar los aspectos identificados y alcanzar el cumplimiento requerido.\n\n`;
    
  } else if (status === 'Conditional') {
    justification += `### Análisis de Cumplimiento Condicional\n\n`;
    justification += `La evaluación indica que ${assetInfo} cumple **parcialmente** con los requisitos `;
    justification += `del Objetivo ${objectiveNumber}, sujeto al cumplimiento de condiciones específicas.\n\n`;
    
    if (relevantEvidence.length > 0) {
      justification += `### Evidencias Consideradas\n\n`;
      relevantEvidence.forEach((ev, idx) => {
        justification += `${idx + 1}. ${ev.name} (${ev.type})`;
        if (ev.description) justification += `: ${ev.description}`;
        justification += '\n';
      });
      justification += '\n';
    }
    
    justification += `### Condiciones Aplicables\n\n`;
    const conditions = getConditionalRequirements(objective, context);
    conditions.forEach((condition, idx) => {
      justification += `${idx + 1}. ${condition}\n`;
    });
    
    justification += `\n### Requisitos para Cumplimiento Pleno\n\n`;
    justification += `Para alcanzar el cumplimiento completo, se deben cumplir las siguientes condiciones:\n\n`;
    const fullComplianceRequirements = getFullComplianceRequirements(objective, context);
    fullComplianceRequirements.forEach((req, idx) => {
      justification += `${idx + 1}. ${req}\n`;
    });
    
  } else {
    justification += `### Estado de Evaluación\n\n`;
    justification += `El Objetivo ${objectiveNumber} no ha sido evaluado aún para ${assetInfo}.\n\n`;
    justification += `### Próximos Pasos\n\n`;
    justification += `Se requiere realizar la evaluación DNSH correspondiente, que incluye:\n\n`;
    justification += `1. Revisión de la documentación técnica disponible\n`;
    justification += `2. Análisis de cumplimiento según los criterios de la Taxonomía Europea\n`;
    justification += `3. Identificación de evidencias y documentación de soporte\n`;
    justification += `4. Determinación del estado de cumplimiento\n\n`;
  }
  
  // Add regulatory reference
  justification += `---\n\n`;
  justification += `*Esta evaluación se realiza conforme a los criterios establecidos en la `;
  justification += `Taxonomía Europea de Actividades Sostenibles (Reglamento (UE) 2020/852) y `;
  justification += `sus actos delegados complementarios.*\n\n`;
  
  return justification;
};

// Helper functions for detailed justifications
function getObjectiveNumber(objective: DnshObjective): string {
  const numbers: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1',
    [DnshObjective.ADAPTATION]: '2',
    [DnshObjective.WATER]: '3',
    [DnshObjective.CIRCULAR]: '4',
    [DnshObjective.POLLUTION]: '5',
    [DnshObjective.BIODIVERSITY]: '6',
  };
  return numbers[objective];
}

function getObjectiveJustificationPoints(
  objective: DnshObjective,
  context: { asset?: Asset; operation?: Operation }
): string[] {
  const points: string[] = [];
  
  switch (objective) {
    case DnshObjective.MITIGATION:
      points.push('El activo contribuye significativamente a la mitigación del cambio climático');
      if (context.operation?.sectorNACE) {
        points.push(`La actividad está alineada con el sector NACE ${context.operation.sectorNACE}`);
      }
      points.push('Se cumplen los criterios técnicos de selección establecidos');
      break;
    case DnshObjective.ADAPTATION:
      points.push('El activo implementa medidas de adaptación adecuadas');
      if (context.asset?.dnshEvaluation?.adaptationMeasures) {
        points.push(`Se han identificado ${context.asset.dnshEvaluation.adaptationMeasures.length} medidas de adaptación`);
      }
      points.push('Los riesgos climáticos han sido evaluados y mitigados');
      break;
    case DnshObjective.WATER:
      points.push('El uso del agua se gestiona de manera sostenible');
      points.push('Se cumplen los estándares de calidad del agua');
      break;
    case DnshObjective.CIRCULAR:
      points.push('El activo promueve la economía circular');
      points.push('Se minimiza la generación de residuos');
      break;
    case DnshObjective.POLLUTION:
      points.push('Se previene y controla la contaminación');
      points.push('Se cumplen los límites de emisiones establecidos');
      break;
    case DnshObjective.BIODIVERSITY:
      points.push('Se protege y restaura la biodiversidad');
      points.push('Se evitan impactos negativos significativos en ecosistemas');
      break;
  }
  
  return points;
}

function getNonCompliancePoints(
  objective: DnshObjective,
  context: { asset?: Asset; operation?: Operation }
): string[] {
  const points: string[] = [];
  
  switch (objective) {
    case DnshObjective.MITIGATION:
      points.push('No se cumplen los criterios técnicos de selección para mitigación');
      points.push('Las emisiones de GEI no están dentro de los límites establecidos');
      break;
    case DnshObjective.ADAPTATION:
      points.push('No se han implementado medidas de adaptación adecuadas');
      points.push('Los riesgos climáticos identificados no han sido mitigados');
      break;
    case DnshObjective.WATER:
      points.push('El uso del agua no cumple con los criterios de sostenibilidad');
      points.push('No se cumplen los estándares de calidad del agua');
      break;
    case DnshObjective.CIRCULAR:
      points.push('No se minimiza adecuadamente la generación de residuos');
      points.push('No se promueve la economía circular');
      break;
    case DnshObjective.POLLUTION:
      points.push('Se superan los límites de emisiones permitidos');
      points.push('No se implementan medidas adecuadas de prevención de contaminación');
      break;
    case DnshObjective.BIODIVERSITY:
      points.push('Se identifican impactos negativos significativos en biodiversidad');
      points.push('No se implementan medidas de protección o restauración');
      break;
  }
  
  return points;
}

function getRequiredActions(
  objective: DnshObjective,
  context: { asset?: Asset; operation?: Operation }
): string[] {
  const actions: string[] = [];
  
  switch (objective) {
    case DnshObjective.MITIGATION:
      actions.push('Implementar medidas de reducción de emisiones de GEI');
      actions.push('Alinear la actividad con los criterios técnicos de selección');
      break;
    case DnshObjective.ADAPTATION:
      actions.push('Desarrollar e implementar un plan de adaptación climática');
      actions.push('Identificar e implementar medidas de adaptación específicas');
      break;
    case DnshObjective.WATER:
      actions.push('Implementar sistemas de gestión sostenible del agua');
      actions.push('Cumplir con los estándares de calidad del agua');
      break;
    case DnshObjective.CIRCULAR:
      actions.push('Implementar estrategias de economía circular');
      actions.push('Reducir la generación de residuos');
      break;
    case DnshObjective.POLLUTION:
      actions.push('Implementar sistemas de control de emisiones');
      actions.push('Cumplir con los límites de emisiones establecidos');
      break;
    case DnshObjective.BIODIVERSITY:
      actions.push('Desarrollar un plan de protección de biodiversidad');
      actions.push('Implementar medidas de restauración ecológica');
      break;
  }
  
  return actions;
}

function getConditionalRequirements(
  objective: DnshObjective,
  context: { asset?: Asset; operation?: Operation }
): string[] {
  const conditions: string[] = [];
  
  switch (objective) {
    case DnshObjective.ADAPTATION:
      conditions.push('Implementación de medidas de adaptación en curso');
      conditions.push('Monitoreo continuo de riesgos climáticos');
      break;
    case DnshObjective.WATER:
      conditions.push('Cumplimiento de planes de gestión del agua');
      conditions.push('Monitoreo periódico de calidad del agua');
      break;
    default:
      conditions.push('Cumplimiento de condiciones específicas establecidas');
      conditions.push('Monitoreo y verificación periódica');
  }
  
  return conditions;
}

function getFullComplianceRequirements(
  objective: DnshObjective,
  context: { asset?: Asset; operation?: Operation }
): string[] {
  const requirements: string[] = [];
  
  switch (objective) {
    case DnshObjective.ADAPTATION:
      requirements.push('Completar la implementación de todas las medidas de adaptación planificadas');
      requirements.push('Verificar la efectividad de las medidas implementadas');
      break;
    case DnshObjective.WATER:
      requirements.push('Mantener el cumplimiento continuo de los estándares de calidad');
      requirements.push('Implementar mejoras adicionales si es necesario');
      break;
    default:
      requirements.push('Cumplir con todos los criterios técnicos de selección');
      requirements.push('Mantener documentación actualizada');
  }
  
  return requirements;
}

/**
 * Generate suggestions based on evidence and current state
 */
export const generateSuggestions = async (
  context: AIGenerationRequest['context']
): Promise<AISuggestion[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const suggestions: AISuggestion[] = [];
  
  // Analyze evidence coverage
  const evidenceDocs = context.evidenceDocuments || [];
  const objectives = Object.values(DnshObjective);
  
  objectives.forEach(objective => {
    const objectiveEvidence = evidenceDocs.filter(
      ev => !ev.relatedObjective || ev.relatedObjective === objective
    );
    
    if (objectiveEvidence.length === 0) {
      suggestions.push({
        type: 'evidence_link',
        title: `Falta evidencia para ${getObjectiveLabel(objective)}`,
        description: `No se han cargado documentos de evidencia específicos para el objetivo ${getObjectiveLabel(objective)}. Se recomienda cargar documentación relevante.`,
        priority: 'high'
      });
    }
  });
  
  // Check for missing adaptation measures
  if (context.asset?.dnshEvaluation) {
    const evaluation = context.asset.dnshEvaluation;
    if (evaluation.adaptationStatus === 'Non-Compliant' || evaluation.adaptationStatus === 'Conditional') {
      const measures = getAllMeasures();
      suggestions.push({
        type: 'improvement',
        title: 'Implementar medidas de adaptación',
        description: `El activo requiere medidas de adaptación para cumplir con el objetivo de Adaptación al Cambio Climático. Se sugieren las siguientes medidas:`,
        suggestedContent: measures.slice(0, 3).map(m => `- ${m.name}: ${m.description}`).join('\n'),
        priority: 'high'
      });
    }
  }
  
  // Content enhancement suggestions
  if (context.existingContent) {
    const contentLength = context.existingContent.length;
    if (contentLength < 500) {
      suggestions.push({
        type: 'content_enhancement',
        title: 'Ampliar contenido del reporte',
        description: 'El contenido actual es breve. Se sugiere añadir más detalles y análisis.',
        priority: 'medium'
      });
    }
  }
  
  return suggestions;
};

// Content generators
function generateExecutiveSummaryContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  let content = '# Resumen Ejecutivo\n\n';
  
  if (context.level === 'company' && context.client) {
    content += `## ${context.client.name}\n\n`;
    if (context.client.country) {
      content += `**Ubicación**: ${context.client.country}\n\n`;
    }
    if (context.metrics) {
      content += `### Métricas Clave\n\n`;
      if (context.metrics.totalAssets) {
        content += `- Total de Activos: ${context.metrics.totalAssets}\n`;
      }
      if (context.metrics.totalCapex) {
        content += `- CAPEX Total: €${(context.metrics.totalCapex / 1000000).toFixed(1)}M\n`;
      }
      if (context.metrics.overallComplianceRate !== undefined) {
        content += `- Tasa de Cumplimiento: ${context.metrics.overallComplianceRate.toFixed(1)}%\n`;
      }
    }
  } else if (context.level === 'portfolio' && context.operation) {
    content += `## ${context.operation.name}\n\n`;
    content += `**País**: ${context.operation.country}\n`;
    content += `**Sector NACE**: ${context.operation.sectorNACE}\n`;
    content += `**CAPEX**: €${(context.operation.capex / 1000000).toFixed(1)}M\n\n`;
  } else if (context.level === 'asset' && context.asset) {
    content += `## ${context.asset.name}\n\n`;
    content += `**Tipo**: ${context.asset.assetType}\n`;
    content += `**Valor**: €${(context.asset.exposedValue / 1000000).toFixed(1)}M\n`;
    if (context.asset.dnshEvaluation) {
      content += `**Estado DNSH**: ${context.asset.dnshEvaluation.overallStatus}\n`;
    }
  }
  
  return content;
}

function generateDNSHComplianceContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  let content = '# Cumplimiento DNSH\n\n';
  
  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1. Mitigación Cambio Climático',
    [DnshObjective.ADAPTATION]: '2. Adaptación Cambio Climático',
    [DnshObjective.WATER]: '3. Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: '4. Economía Circular',
    [DnshObjective.POLLUTION]: '5. Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: '6. Biodiversidad y Ecosistemas'
  };
  
  if (context.asset?.dnshEvaluation) {
    const evaluation = context.asset.dnshEvaluation;
    Object.values(DnshObjective).forEach(objective => {
      const status = getObjectiveStatus(evaluation, objective);
      content += `## ${objectiveLabels[objective]}\n\n`;
      content += `**Estado**: ${status}\n\n`;
      
      const evidence = getEvidenceForObjective(evaluation, objective);
      if (evidence.length > 0) {
        content += `**Evidencias**: ${evidence.length} documentos\n\n`;
      }
    });
  } else if (context.metrics?.objectiveCompliance) {
    const compliance = context.metrics.objectiveCompliance as Record<DnshObjective, any>;
    Object.entries(compliance).forEach(([objective, stats]) => {
      content += `## ${objectiveLabels[objective as DnshObjective]}\n\n`;
      content += `- Activos Compliant: ${stats.compliant || 0} / ${stats.total || 0}\n`;
      if (stats.percentage !== undefined) {
        content += `- Tasa de Cumplimiento: ${stats.percentage.toFixed(1)}%\n`;
      }
      content += '\n';
    });
  }
  
  return content;
}

function generateRiskAssessmentContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  let content = '# Evaluación de Riesgos Climáticos\n\n';
  
  if (context.asset?.dnshEvaluation) {
    const evaluation = context.asset.dnshEvaluation;
    if (evaluation.adaptationRiskBand) {
      content += `## Nivel de Riesgo\n\n`;
      content += `**Riesgo Identificado**: ${evaluation.adaptationRiskBand}\n\n`;
    }
    if (evaluation.adaptationAAL) {
      content += `**Pérdida Anual Promedio (AAL)**: €${(evaluation.adaptationAAL / 1000000).toFixed(2)}M\n\n`;
    }
    if (evaluation.adaptationMeasures && evaluation.adaptationMeasures.length > 0) {
      content += `## Medidas de Adaptación\n\n`;
      content += `Se han implementado ${evaluation.adaptationMeasures.length} medidas de adaptación.\n`;
    }
  } else if (context.operation) {
    if (context.operation.maxRiskBand) {
      content += `**Riesgo de la Operación**: ${context.operation.maxRiskBand}\n\n`;
    }
    if (context.operation.totalAAL) {
      content += `**AAL Total**: €${(context.operation.totalAAL / 1000000).toFixed(2)}M\n\n`;
    }
  }
  
  return content;
}

function generateEvidenceReviewContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  let content = '# Revisión de Evidencias\n\n';
  
  const evidence = context.evidenceDocuments || [];
  
  content += `## Resumen\n\n`;
  content += `**Total de Documentos**: ${evidence.length}\n\n`;
  
  if (evidence.length > 0) {
    const evidenceByType = evidence.reduce((acc, ev) => {
      acc[ev.type] = (acc[ev.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    content += `## Documentos por Tipo\n\n`;
    Object.entries(evidenceByType).forEach(([type, count]) => {
      content += `- ${type}: ${count}\n`;
    });
    
    content += `\n## Lista de Documentos\n\n`;
    evidence.forEach(ev => {
      content += `### ${ev.name}\n\n`;
      content += `- **Tipo**: ${ev.type}\n`;
      if (ev.relatedObjective) {
        content += `- **Objetivo DNSH**: ${getObjectiveLabel(ev.relatedObjective)}\n`;
      }
      if (ev.documentDate) {
        content += `- **Fecha**: ${ev.documentDate}\n`;
      }
      if (ev.description) {
        content += `- **Descripción**: ${ev.description}\n`;
      }
      content += '\n';
    });
  } else {
    content += `No se han cargado documentos de evidencia.\n`;
  }
  
  return content;
}

function generateFinancialMetricsContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  let content = '# Métricas Financieras\n\n';
  
  if (context.metrics) {
    if (context.metrics.totalCapex) {
      content += `**CAPEX Total**: €${(context.metrics.totalCapex / 1000000).toFixed(1)}M\n\n`;
    }
    if (context.metrics.totalDealValue) {
      content += `**Valor Total del Deal**: €${(context.metrics.totalDealValue / 1000000).toFixed(1)}M\n\n`;
    }
  } else if (context.operation) {
    content += `**CAPEX**: €${(context.operation.capex / 1000000).toFixed(1)}M\n\n`;
    if (context.operation.dealPrice) {
      content += `**Valor del Deal**: €${(context.operation.dealPrice / 1000000).toFixed(1)}M\n\n`;
    }
  } else if (context.asset) {
    content += `**Valor Expuesto**: €${(context.asset.exposedValue / 1000000).toFixed(1)}M\n\n`;
  }
  
  return content;
}

function generateRecommendationsContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  let content = '# Recomendaciones\n\n';
  
  content += `## Acciones Prioritarias\n\n`;
  
  if (context.level === 'company') {
    content += `1. Continuar el monitoreo de cumplimiento DNSH en todas las operaciones\n`;
    content += `2. Implementar medidas correctivas en operaciones con bajo cumplimiento\n`;
    content += `3. Fortalecer la documentación de evidencias donde sea necesario\n`;
  } else if (context.level === 'portfolio') {
    content += `1. Revisar el cumplimiento DNSH de todos los activos\n`;
    content += `2. Implementar medidas de adaptación donde sea necesario\n`;
    content += `3. Asegurar que toda la documentación requerida esté disponible\n`;
  } else if (context.level === 'asset') {
    if (context.asset?.dnshEvaluation?.overallStatus !== 'Compliant') {
      content += `1. Revisar los objetivos con estado "Non-Compliant" o "Conditional"\n`;
      content += `2. Implementar medidas correctivas específicas\n`;
      content += `3. Asegurar que toda la documentación requerida esté disponible\n`;
    } else {
      content += `1. Mantener el cumplimiento mediante revisiones periódicas\n`;
      content += `2. Actualizar la documentación según sea necesario\n`;
      content += `3. Monitorear cambios en los riesgos climáticos\n`;
    }
  }
  
  return content;
}

function generateRecommendationsSuggestions(
  context: AIGenerationRequest['context']
): string[] {
  const suggestions: string[] = [];
  
  if (context.asset?.dnshEvaluation) {
    const evaluation = context.asset.dnshEvaluation;
    if (evaluation.overallStatus !== 'Compliant') {
      suggestions.push('Implementar medidas correctivas para alcanzar el cumplimiento DNSH');
      suggestions.push('Revisar y actualizar la documentación de evidencias');
    }
  }
  
  const evidence = context.evidenceDocuments || [];
  if (evidence.length === 0) {
    suggestions.push('Cargar documentación de evidencia para soportar las evaluaciones DNSH');
  }
  
  return suggestions;
}

function generateGenericContent(
  context: AIGenerationRequest['context'],
  contextString: string
): string {
  return `# Contenido Generado\n\nEste contenido ha sido generado automáticamente basado en los datos disponibles.\n\n${contextString}`;
}

function applyModification(
  currentContent: string,
  instruction: string,
  context: AIGenerationRequest['context']
): string {
  // Simple modification logic - in production, this would use AI
  const lowerInstruction = instruction.toLowerCase();
  
  if (lowerInstruction.includes('ampliar') || lowerInstruction.includes('expandir')) {
    return `${currentContent}\n\n## Información Adicional\n\nSe ha ampliado el contenido según la solicitud. Se recomienda revisar los datos específicos del contexto para añadir más detalles.`;
  } else if (lowerInstruction.includes('simplificar') || lowerInstruction.includes('resumir')) {
    // Extract key points
    const lines = currentContent.split('\n').filter(line => line.trim());
    const keyLines = lines.filter(line => 
      line.startsWith('#') || 
      line.startsWith('**') || 
      line.match(/^\d+\./) ||
      line.includes('€') ||
      line.includes('%')
    );
    return keyLines.join('\n');
  } else if (lowerInstruction.includes('añadir') || lowerInstruction.includes('agregar')) {
    return `${currentContent}\n\n## Información Adicional\n\n${instruction}`;
  }
  
  return currentContent;
}

function buildContextString(context: AIGenerationRequest['context']): string {
  let str = '';
  
  if (context.client) {
    str += `Cliente: ${context.client.name}\n`;
  }
  if (context.operation) {
    str += `Operación: ${context.operation.name}\n`;
  }
  if (context.asset) {
    str += `Activo: ${context.asset.name}\n`;
  }
  if (context.evidenceDocuments) {
    str += `Evidencias: ${context.evidenceDocuments.length} documentos\n`;
  }
  
  return str;
}

function getObjectiveLabel(objective: DnshObjective): string {
  const labels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Mitigación del Cambio Climático',
    [DnshObjective.ADAPTATION]: 'Adaptación al Cambio Climático',
    [DnshObjective.WATER]: 'Uso Sostenible del Agua',
    [DnshObjective.CIRCULAR]: 'Economía Circular',
    [DnshObjective.POLLUTION]: 'Prevención de la Contaminación',
    [DnshObjective.BIODIVERSITY]: 'Biodiversidad y Ecosistemas'
  };
  return labels[objective];
}

function getObjectiveStatus(
  evaluation: any,
  objective: DnshObjective
): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' {
  switch (objective) {
    case DnshObjective.MITIGATION:
      return evaluation.mitigationStatus || 'Not Assessed';
    case DnshObjective.ADAPTATION:
      return evaluation.adaptationStatus || 'Not Assessed';
    case DnshObjective.WATER:
      return evaluation.waterStatus || 'Not Assessed';
    case DnshObjective.CIRCULAR:
      return evaluation.circularStatus || 'Not Assessed';
    case DnshObjective.POLLUTION:
      return evaluation.pollutionStatus || 'Not Assessed';
    case DnshObjective.BIODIVERSITY:
      return evaluation.biodiversityStatus || 'Not Assessed';
    default:
      return 'Not Assessed';
  }
}

function getEvidenceForObjective(evaluation: any, objective: DnshObjective): string[] {
  switch (objective) {
    case DnshObjective.MITIGATION:
      return evaluation.mitigationEvidence || [];
    case DnshObjective.ADAPTATION:
      return evaluation.adaptationMeasures || [];
    case DnshObjective.WATER:
      return evaluation.waterEvidence || [];
    case DnshObjective.CIRCULAR:
      return evaluation.circularEvidence || [];
    case DnshObjective.POLLUTION:
      return evaluation.pollutionEvidence || [];
    case DnshObjective.BIODIVERSITY:
      return evaluation.biodiversityEvidence || [];
    default:
      return [];
  }
}
