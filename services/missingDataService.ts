/**
 * Servicio para identificar datos faltantes después de la evaluación automatizada
 * Compara lo que se procesó automáticamente con lo que se necesita para evaluación completa
 */

import { Asset, Operation, DnshObjective, EvidenceDocument, AssetDnshEvaluation } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { getAssetObjectiveStatus, getAssetsNeedingEvaluation } from './dnshEvaluationService';
import { validateDnshStatus } from './dnshValidation';

export interface MissingDataItem {
  id: string;
  type: 'evidence' | 'checklist' | 'asset_attribute' | 'evaluation_status';
  category: 'critical' | 'important' | 'optional';
  assetId?: string;
  assetName?: string;
  objective?: DnshObjective;
  field?: string;
  description: string;
  suggestedAction: string;
  relatedEvidenceId?: string;
  questionId?: string;
}

export interface MissingDataSummary {
  totalMissing: number;
  critical: number;
  important: number;
  optional: number;
  byObjective: Record<DnshObjective, MissingDataItem[]>;
  byAsset: Record<string, MissingDataItem[]>;
  items: MissingDataItem[];
}

/**
 * Identifica todos los datos faltantes para una operación
 */
export const identifyMissingData = (
  operation: Operation,
  objective?: DnshObjective
): MissingDataSummary => {
  const items: MissingDataItem[] = [];
  const objectivesToCheck = objective 
    ? [objective] 
    : Object.values(DnshObjective);

  // Para cada objetivo DNSH
  objectivesToCheck.forEach(obj => {
    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === obj);
    if (!template) return;

    // Para cada asset en la operación
    operation.assets.forEach(asset => {
      const evaluation = asset.dnshEvaluation;
      const status = getAssetObjectiveStatus(asset, obj);
      
      // Si no está evaluado, necesita evaluación completa
      if (status === 'Not Assessed') {
        items.push({
          id: `eval-${asset.id}-${obj}`,
          type: 'evaluation_status',
          category: 'critical',
          assetId: asset.id,
          assetName: asset.name,
          objective: obj,
          description: `El asset "${asset.name}" no tiene evaluación DNSH para el objetivo ${obj}`,
          suggestedAction: `Completar evaluación DNSH para ${obj} mediante checklist o evidencia`
        });

        // Verificar qué preguntas del checklist faltan
        if (template) {
          template.questions.forEach(question => {
            const hasAnswer = evaluation?.checklistAnswers?.[obj]?.[question.id];
            if (!hasAnswer) {
              items.push({
                id: `checklist-${asset.id}-${obj}-${question.id}`,
                type: 'checklist',
                category: 'critical',
                assetId: asset.id,
                assetName: asset.name,
                objective: obj,
                questionId: question.id,
                field: question.id,
                description: `Falta respuesta para: "${question.text.substring(0, 60)}..."`,
                suggestedAction: `Responder la pregunta del checklist para ${obj}`
              });
            }
          });
        }
      } else {
        // Si está evaluado pero falta evidencia, identificar qué falta
        const validation = validateDnshStatus(asset, obj, operation);
        if (!validation.hasAssessment) {
          validation.missingRequirements.forEach(req => {
            items.push({
              id: `req-${asset.id}-${obj}-${req}`,
              type: 'evidence',
              category: 'important',
              assetId: asset.id,
              assetName: asset.name,
              objective: obj,
              field: req,
              description: `Falta ${req} para validar el cumplimiento de ${obj}`,
              suggestedAction: `Añadir evidencia o documentación para ${req}`
            });
          });
        }

        // Verificar si hay respuestas del checklist sin evidencia
        const checklistAnswers = evaluation?.checklistAnswers?.[obj];
        if (checklistAnswers) {
          Object.entries(checklistAnswers).forEach(([questionId, answer]) => {
            if (answer.response === 'Yes' && !answer.evidence && !answer.evidenceIds?.length) {
              const question = template.questions.find(q => q.id === questionId);
              items.push({
                id: `evidence-${asset.id}-${obj}-${questionId}`,
                type: 'evidence',
                category: 'important',
                assetId: asset.id,
                assetName: asset.name,
                objective: obj,
                questionId: questionId,
                description: `Respuesta "Yes" sin evidencia para: "${question?.text.substring(0, 60) || questionId}..."`,
                suggestedAction: `Añadir documento de evidencia para esta respuesta`
              });
            }
          });
        }
      }

      // Verificar atributos del asset que podrían ser útiles pero faltan
      if (obj === DnshObjective.ADAPTATION) {
        if (!asset.attributes.adaptationHazardScope) {
          items.push({
            id: `attr-${asset.id}-hazard-scope`,
            type: 'asset_attribute',
            category: 'important',
            assetId: asset.id,
            assetName: asset.name,
            objective: obj,
            field: 'adaptationHazardScope',
            description: `Falta determinar el scope de hazards climáticos para "${asset.name}"`,
            suggestedAction: `Determinar qué hazards climáticos son relevantes para este asset`
          });
        }
      }

      if (obj === DnshObjective.WATER) {
        if (!asset.attributes.waterDependency) {
          items.push({
            id: `attr-${asset.id}-water-dependency`,
            type: 'asset_attribute',
            category: 'optional',
            assetId: asset.id,
            assetName: asset.name,
            objective: obj,
            field: 'waterDependency',
            description: `Falta información sobre dependencia hídrica para "${asset.name}"`,
            suggestedAction: `Añadir información sobre dependencia hídrica (Low/Medium/High)`
          });
        }
      }
    });
  });

  // Verificar evidencias procesadas automáticamente que no están vinculadas
  const evidenceDocuments = operation.evidenceDocuments || [];
  evidenceDocuments.forEach(evidence => {
    if (evidence.uploadedBy?.includes('Auto-processed') || evidence.uploadedBy?.includes('System')) {
      // Verificar si la evidencia está vinculada a alguna evaluación
      const isLinked = operation.assets.some(asset => {
        const evaluation = asset.dnshEvaluation;
        if (!evaluation) return false;
        
        return Object.values(DnshObjective).some(obj => {
          const answers = evaluation.checklistAnswers?.[obj];
          if (!answers) return false;
          return Object.values(answers).some(answer => 
            answer.evidenceIds?.includes(evidence.id)
          );
        });
      });

      if (!isLinked && evidence.relatedObjective) {
        items.push({
          id: `link-${evidence.id}`,
          type: 'evidence',
          category: 'optional',
          relatedEvidenceId: evidence.id,
          objective: evidence.relatedObjective,
          description: `Evidencia procesada automáticamente "${evidence.name}" no está vinculada a ninguna evaluación`,
          suggestedAction: `Vincular esta evidencia a las respuestas del checklist correspondientes`
        });
      }
    }
  });

  // Agrupar por objetivo y asset
  const byObjective: Record<DnshObjective, MissingDataItem[]> = {} as any;
  const byAsset: Record<string, MissingDataItem[]> = {};

  Object.values(DnshObjective).forEach(obj => {
    byObjective[obj] = items.filter(item => item.objective === obj);
  });

  operation.assets.forEach(asset => {
    byAsset[asset.id] = items.filter(item => item.assetId === asset.id);
  });

  return {
    totalMissing: items.length,
    critical: items.filter(i => i.category === 'critical').length,
    important: items.filter(i => i.category === 'important').length,
    optional: items.filter(i => i.category === 'optional').length,
    byObjective,
    byAsset,
    items
  };
};

/**
 * Obtiene datos faltantes filtrados por criterios
 */
export const getMissingDataFiltered = (
  summary: MissingDataSummary,
  filters: {
    objective?: DnshObjective;
    assetId?: string;
    category?: 'critical' | 'important' | 'optional';
    type?: MissingDataItem['type'];
  }
): MissingDataItem[] => {
  let filtered = summary.items;

  if (filters.objective) {
    filtered = filtered.filter(item => item.objective === filters.objective);
  }

  if (filters.assetId) {
    filtered = filtered.filter(item => item.assetId === filters.assetId);
  }

  if (filters.category) {
    filtered = filtered.filter(item => item.category === filters.category);
  }

  if (filters.type) {
    filtered = filtered.filter(item => item.type === filters.type);
  }

  return filtered;
};

/**
 * Obtiene un resumen de completitud por objetivo
 */
export const getCompletenessByObjective = (
  operation: Operation
): Record<DnshObjective, { complete: number; total: number; percentage: number }> => {
  const result: Record<DnshObjective, { complete: number; total: number; percentage: number }> = {} as any;

  Object.values(DnshObjective).forEach(obj => {
    const missing = identifyMissingData(operation, obj);
    const totalAssets = operation.assets.length;
    const incomplete = missing.items.filter(i => i.category === 'critical' || i.category === 'important').length;
    const complete = totalAssets - incomplete;

    result[obj] = {
      complete: Math.max(0, complete),
      total: totalAssets,
      percentage: totalAssets > 0 ? Math.round((complete / totalAssets) * 100) : 0
    };
  });

  return result;
};
