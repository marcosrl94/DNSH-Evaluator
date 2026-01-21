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
 * In production, this would call an actual AI API (OpenAI, Anthropic, etc.)
 */
export const generateReportSection = async (
  request: AIGenerationRequest
): Promise<AIGenerationResponse> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { sectionType, context } = request;
  
  // Build context string for AI
  const contextString = buildContextString(context);
  
  // Generate content based on section type
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
 * Modify existing content with AI assistance
 */
export const modifyReportContent = async (
  currentContent: string,
  instruction: string,
  context: AIGenerationRequest['context']
): Promise<AIGenerationResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const modifiedContent = applyModification(currentContent, instruction, context);
  
  return {
    content: modifiedContent,
    confidence: 0.80,
    reasoning: `Content modified based on instruction: "${instruction}"`
  };
};

/**
 * Generate justifications based on evidence
 */
export const generateJustification = async (
  objective: DnshObjective,
  status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed',
  evidenceDocuments: EvidenceDocument[],
  context: { asset?: Asset; operation?: Operation }
): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const relevantEvidence = evidenceDocuments.filter(
    ev => !ev.relatedObjective || ev.relatedObjective === objective
  );
  
  const objectiveLabel = getObjectiveLabel(objective);
  
  let justification = `## Justificación para ${objectiveLabel}\n\n`;
  justification += `**Estado**: ${status}\n\n`;
  
  if (status === 'Compliant') {
    justification += `El activo cumple con los requisitos del objetivo ${objectiveLabel} según la Taxonomía Europea. `;
    if (relevantEvidence.length > 0) {
      justification += `Esta conclusión se basa en la siguiente documentación:\n\n`;
      relevantEvidence.forEach(ev => {
        justification += `- **${ev.name}** (${ev.type})`;
        if (ev.documentDate) justification += ` - Fecha: ${ev.documentDate}`;
        if (ev.description) justification += `\n  ${ev.description}`;
        justification += '\n';
      });
    }
  } else if (status === 'Non-Compliant') {
    justification += `El activo no cumple con los requisitos del objetivo ${objectiveLabel}. `;
    if (relevantEvidence.length > 0) {
      justification += `La evaluación se basa en:\n\n`;
      relevantEvidence.forEach(ev => {
        justification += `- ${ev.name} (${ev.type})\n`;
      });
      justification += `\nSe requieren medidas correctivas para alcanzar el cumplimiento.`;
    }
  } else if (status === 'Conditional') {
    justification += `El activo cumple parcialmente con los requisitos del objetivo ${objectiveLabel} bajo condiciones específicas. `;
    if (relevantEvidence.length > 0) {
      justification += `Evidencias consideradas:\n\n`;
      relevantEvidence.forEach(ev => {
        justification += `- ${ev.name} (${ev.type})\n`;
      });
    }
  } else {
    justification += `El objetivo ${objectiveLabel} no ha sido evaluado aún. Se requiere realizar la evaluación DNSH correspondiente.`;
  }
  
  return justification;
};

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
