/**
 * Centralized DNSH Evaluation Service
 * Single source of truth for DNSH evaluations
 * All evaluations are performed at ASSET level
 * Portfolio/Group/Operation views derive from asset-level evaluations
 */

import { Asset, Operation, DnshObjective, AssetDnshEvaluation, AssetDnshAnswer } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { getObjectiveStatusFromAsset, calculateObjectiveStats } from '../utils/dnshCalculations';
import { validateDnshStatus } from './dnshValidation';

/**
 * Get objective status for an asset
 * This is the SINGLE SOURCE OF TRUTH for asset-level DNSH status
 */
export const getAssetObjectiveStatus = (
  asset: Asset,
  objective: DnshObjective
): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
  if (!asset.dnshEvaluation) {
    return 'Not Assessed';
  }
  
  return getObjectiveStatusFromAsset(asset.dnshEvaluation, objective);
};

/**
 * Calculate objective status from checklist answers
 * Used when evaluating via questionnaire
 */
export const calculateStatusFromAnswers = (
  answers: Record<string, AssetDnshAnswer>,
  objective: DnshObjective,
  template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective)
): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
  if (!template) {
    return 'Not Assessed';
  }
  
  const objectiveAnswers = Object.values(answers).filter(
    a => a.objective === objective && a.response !== null
  );
  
  if (objectiveAnswers.length === 0) {
    return 'Not Assessed';
  }
  
  // Check if all questions are answered
  const allAnswered = template.questions.every(q => {
    const answer = answers[q.id];
    return answer && answer.response !== null;
  });
  
  if (!allAnswered) {
    return 'Not Assessed';
  }
  
  // Check for any "No" answers (non-compliant)
  const hasNo = objectiveAnswers.some(a => a.response === 'No');
  if (hasNo) {
    return 'Non-Compliant';
  }
  
  // Check for any "N/A" answers (conditional - requires review)
  const hasNA = objectiveAnswers.some(a => a.response === 'N/A');
  if (hasNA) {
    return 'Conditional';
  }
  
  // All "Yes" answers = Compliant
  return 'Compliant';
};

/**
 * Build complete AssetDnshEvaluation from checklist answers
 */
export const buildEvaluationFromAnswers = (
  asset: Asset,
  answers: Record<string, AssetDnshAnswer>,
  existingEvaluation?: AssetDnshEvaluation
): AssetDnshEvaluation => {
  const baseEvaluation = existingEvaluation || {
    assetId: asset.id,
    evaluationDate: new Date().toISOString(),
    evaluator: 'Current User',
    mitigationStatus: 'Not Assessed',
    mitigationEvidence: [],
    adaptationStatus: 'Not Assessed',
    adaptationStatusPreMeasures: 'Not Assessed',
    waterStatus: 'Not Assessed',
    waterEvidence: [],
    circularStatus: 'Not Assessed',
    circularEvidence: [],
    pollutionStatus: 'Not Assessed',
    pollutionEvidence: [],
    biodiversityStatus: 'Not Assessed',
    biodiversityEvidence: [],
    overallStatus: 'Not Assessed',
  };
  
  // Calculate status for each objective from answers
  const evaluation: AssetDnshEvaluation = {
    ...baseEvaluation,
    mitigationStatus: calculateStatusFromAnswers(answers, DnshObjective.MITIGATION),
    adaptationStatus: calculateStatusFromAnswers(answers, DnshObjective.ADAPTATION) || baseEvaluation.adaptationStatus,
    waterStatus: calculateStatusFromAnswers(answers, DnshObjective.WATER),
    circularStatus: calculateStatusFromAnswers(answers, DnshObjective.CIRCULAR),
    pollutionStatus: calculateStatusFromAnswers(answers, DnshObjective.POLLUTION),
    biodiversityStatus: calculateStatusFromAnswers(answers, DnshObjective.BIODIVERSITY),
    
    // Extract evidence from answers
    mitigationEvidence: Object.values(answers)
      .filter(a => a.objective === DnshObjective.MITIGATION && a.evidence)
      .flatMap(a => a.supportingDocuments || []),
    waterEvidence: Object.values(answers)
      .filter(a => a.objective === DnshObjective.WATER && a.evidence)
      .flatMap(a => a.supportingDocuments || []),
    circularEvidence: Object.values(answers)
      .filter(a => a.objective === DnshObjective.CIRCULAR && a.evidence)
      .flatMap(a => a.supportingDocuments || []),
    pollutionEvidence: Object.values(answers)
      .filter(a => a.objective === DnshObjective.POLLUTION && a.evidence)
      .flatMap(a => a.supportingDocuments || []),
    biodiversityEvidence: Object.values(answers)
      .filter(a => a.objective === DnshObjective.BIODIVERSITY && a.evidence)
      .flatMap(a => a.supportingDocuments || []),
    
    // Store checklist answers
    checklistAnswers: Object.values(DnshObjective).reduce((acc, obj) => {
      acc[obj] = Object.entries(answers)
        .filter(([_, answer]) => answer.objective === obj)
        .reduce((objAcc, [questionId, answer]) => {
          objAcc[questionId] = {
            response: answer.response!,
            evidence: answer.evidence,
            evidenceIds: answer.supportingDocuments || [],
            assessedDate: answer.assessedDate || new Date().toISOString(),
          };
          return objAcc;
        }, {} as Record<string, any>);
      return acc;
    }, {} as Record<DnshObjective, Record<string, any>>),
    
    // Calculate overall status
    overallStatus: calculateOverallStatusFromObjectives({
      mitigation: evaluation.mitigationStatus,
      adaptation: evaluation.adaptationStatus,
      water: evaluation.waterStatus,
      circular: evaluation.circularStatus,
      pollution: evaluation.pollutionStatus,
      biodiversity: evaluation.biodiversityStatus,
    }),
  };
  
  return evaluation;
};

/**
 * Calculate overall DNSH status from individual objective statuses
 */
const calculateOverallStatusFromObjectives = (statuses: {
  mitigation: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  adaptation: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  water: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  circular: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  pollution: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  biodiversity: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
}): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
  const allStatuses = Object.values(statuses);
  
  // If any objective is Non-Compliant, overall is Non-Compliant
  if (allStatuses.some(s => s === 'Non-Compliant')) {
    return 'Non-Compliant';
  }
  
  // If all are Compliant, overall is Compliant
  if (allStatuses.every(s => s === 'Compliant')) {
    return 'Compliant';
  }
  
  // If any is Conditional, overall is Conditional
  if (allStatuses.some(s => s === 'Conditional')) {
    return 'Conditional';
  }
  
  // If all are Not Assessed, overall is Not Assessed
  if (allStatuses.every(s => s === 'Not Assessed')) {
    return 'Not Assessed';
  }
  
  // Mixed: some Compliant, some Not Assessed = Conditional (needs completion)
  return 'Conditional';
};

/**
 * Get operation-level DNSH stats
 * DERIVED from asset-level evaluations
 */
export const getOperationDnshStats = (
  operation: Operation,
  objective: DnshObjective
): {
  compliant: number;
  nonCompliant: number;
  conditional: number;
  notAssessed: number;
  total: number;
  progress: number;
} => {
  return calculateObjectiveStats(operation, objective);
};

/**
 * Validate that an asset has complete evaluation for an objective
 */
export const isAssetObjectiveComplete = (
  asset: Asset,
  objective: DnshObjective
): boolean => {
  const validation = validateDnshStatus(asset, objective, {
    id: '',
    clientId: '',
    name: '',
    sectorNACE: '',
    country: '',
    capex: 0,
    status: 'Draft',
    substantialContributionId: objective,
    assets: [],
  } as Operation);
  
  return validation.hasAssessment;
};

/**
 * Get all assets that need evaluation for an objective
 */
export const getAssetsNeedingEvaluation = (
  operation: Operation,
  objective: DnshObjective
): Asset[] => {
  return operation.assets.filter(asset => {
    const status = getAssetObjectiveStatus(asset, objective);
    return status === 'Not Assessed';
  });
};

/**
 * Get completion rate for an objective across an operation
 */
export const getObjectiveCompletionRate = (
  operation: Operation,
  objective: DnshObjective
): number => {
  const stats = getOperationDnshStats(operation, objective);
  if (stats.total === 0) return 0;
  
  const evaluated = stats.total - stats.notAssessed;
  return Math.round((evaluated / stats.total) * 100);
};
