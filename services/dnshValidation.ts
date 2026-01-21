/**
 * DNSH Validation Service
 * 
 * Ensures all DNSH diagnoses and labels are linked to actual assessments
 * (either automated or user-provided)
 */

import { Asset, Operation, DnshObjective, AssetDnshEvaluation } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';

/**
 * Validation result for DNSH status
 */
export interface DnshValidationResult {
  isValid: boolean;
  status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  hasAssessment: boolean;
  assessmentType: 'automated' | 'manual' | 'checklist' | 'none';
  missingRequirements: string[];
  warnings: string[];
}

/**
 * Check if an asset has a valid DNSH evaluation for an objective
 */
export const hasValidDnshEvaluation = (
  asset: Asset,
  objective: DnshObjective
): boolean => {
  const evaluation = asset.dnshEvaluation;
  if (!evaluation) return false;

  // Check if objective has been evaluated
  switch (objective) {
    case DnshObjective.MITIGATION:
      return evaluation.mitigationStatus !== undefined && evaluation.mitigationStatus !== 'Not Assessed';
    case DnshObjective.ADAPTATION:
      return evaluation.adaptationStatus !== undefined && evaluation.adaptationStatus !== 'Not Assessed';
    case DnshObjective.WATER:
      return evaluation.waterStatus !== undefined && evaluation.waterStatus !== 'Not Assessed';
    case DnshObjective.CIRCULAR:
      return evaluation.circularStatus !== undefined && evaluation.circularStatus !== 'Not Assessed';
    case DnshObjective.POLLUTION:
      return evaluation.pollutionStatus !== undefined && evaluation.pollutionStatus !== 'Not Assessed';
    case DnshObjective.BIODIVERSITY:
      return evaluation.biodiversityStatus !== undefined && evaluation.biodiversityStatus !== 'Not Assessed';
    default:
      return false;
  }
};

/**
 * Check if an operation has checklist answers for an objective
 */
export const hasChecklistAnswers = (
  operation: Operation,
  objective: DnshObjective
): boolean => {
  // Check if operation has checklist data
  // This would be stored in operation.checklistAnswers or similar
  // For now, we check if there's evidence linked to the objective
  const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
  if (!template) return false;

  // Check if there's evidence for this objective
  const evidence = operation.evidenceDocuments?.filter(
    ev => ev.relatedObjective === objective
  );
  
  return (evidence?.length || 0) > 0;
};

/**
 * Validate DNSH status for an asset and objective
 */
export const validateDnshStatus = (
  asset: Asset,
  objective: DnshObjective,
  operation?: Operation
): DnshValidationResult => {
  const evaluation = asset.dnshEvaluation;
  const missingRequirements: string[] = [];
  const warnings: string[] = [];

  // Check if there's any evaluation
  if (!evaluation) {
    return {
      isValid: false,
      status: 'Not Assessed',
      hasAssessment: false,
      assessmentType: 'none',
      missingRequirements: ['No DNSH evaluation found for this asset'],
      warnings: ['Asset has not been evaluated for DNSH compliance']
    };
  }

  // Check objective-specific status
  let status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' = 'Not Assessed';
  let hasAssessment = false;
  let assessmentType: 'automated' | 'manual' | 'checklist' | 'none' = 'none';

  switch (objective) {
    case DnshObjective.MITIGATION:
      status = evaluation.mitigationStatus || 'Not Assessed';
      hasAssessment = status !== 'Not Assessed';
      if (hasAssessment) {
        // Check if it's from automated risk assessment or manual
        assessmentType = evaluation.mitigationJustification ? 'manual' : 'automated';
      }
      break;
    case DnshObjective.ADAPTATION:
      status = evaluation.adaptationStatus || 'Not Assessed';
      hasAssessment = status !== 'Not Assessed';
      if (hasAssessment) {
        // Adaptation can be from CRVA (automated) or checklist (manual)
        assessmentType = evaluation.adaptationMeasures?.length ? 'automated' : 'manual';
      }
      break;
    case DnshObjective.WATER:
      status = evaluation.waterStatus || 'Not Assessed';
      hasAssessment = status !== 'Not Assessed';
      if (hasAssessment) {
        assessmentType = evaluation.waterJustification ? 'manual' : 'automated';
      }
      break;
    case DnshObjective.CIRCULAR:
      status = evaluation.circularStatus || 'Not Assessed';
      hasAssessment = status !== 'Not Assessed';
      if (hasAssessment) {
        assessmentType = evaluation.circularJustification ? 'manual' : 'automated';
      }
      break;
    case DnshObjective.POLLUTION:
      status = evaluation.pollutionStatus || 'Not Assessed';
      hasAssessment = status !== 'Not Assessed';
      if (hasAssessment) {
        assessmentType = evaluation.pollutionJustification ? 'manual' : 'automated';
      }
      break;
    case DnshObjective.BIODIVERSITY:
      status = evaluation.biodiversityStatus || 'Not Assessed';
      hasAssessment = status !== 'Not Assessed';
      if (hasAssessment) {
        assessmentType = evaluation.biodiversityJustification ? 'manual' : 'automated';
      }
      break;
  }

  // Check for checklist answers if operation is provided
  if (operation && !hasAssessment) {
    const hasChecklist = hasChecklistAnswers(operation, objective);
    if (hasChecklist) {
      hasAssessment = true;
      assessmentType = 'checklist';
    }
  }

  // Build missing requirements
  if (!hasAssessment) {
    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
    if (template) {
      missingRequirements.push(
        `Complete the ${template.title} checklist or provide automated assessment`
      );
    } else {
      missingRequirements.push(`Provide assessment for ${objective}`);
    }
  }

  // Check for evidence
  if (hasAssessment && operation) {
    const evidence = operation.evidenceDocuments?.filter(
      ev => ev.relatedObjective === objective && ev.assetId === asset.id
    );
    if (!evidence || evidence.length === 0) {
      warnings.push('No supporting evidence documents found for this assessment');
    }
  }

  return {
    isValid: hasAssessment,
    status,
    hasAssessment,
    assessmentType,
    missingRequirements,
    warnings
  };
};

/**
 * Get safe DNSH status (returns Not Assessed if no valid assessment)
 */
export const getSafeDnshStatus = (
  asset: Asset,
  objective: DnshObjective,
  operation?: Operation
): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
  const validation = validateDnshStatus(asset, objective, operation);
  return validation.status;
};

/**
 * Check if status can be displayed (has valid assessment)
 */
export const canDisplayDnshStatus = (
  asset: Asset,
  objective: DnshObjective,
  operation?: Operation
): boolean => {
  const validation = validateDnshStatus(asset, objective, operation);
  return validation.hasAssessment;
};
