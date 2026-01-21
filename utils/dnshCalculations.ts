/**
 * Centralized DNSH calculation utilities
 * Ensures consistency across all components
 */

import { Asset, AssetDnshEvaluation, DnshObjective, Operation } from '../types';

/**
 * Get the status for a specific objective from an asset evaluation
 * PRIMARY SOURCE OF TRUTH: Checklist answers. Only returns status if checklist is completed.
 */
export const getObjectiveStatusFromAsset = (
  evaluation: AssetDnshEvaluation | undefined,
  objective: DnshObjective
): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
  if (!evaluation) return 'Not Assessed';

  // Check if checklist has been completed for this objective
  const checklistAnswers = evaluation.checklistAnswers?.[objective];
  const hasChecklist = checklistAnswers && Object.keys(checklistAnswers).length > 0;

  switch (objective) {
    case DnshObjective.MITIGATION:
      // Only return status if checklist is completed
      if (!hasChecklist) return 'Not Assessed';
      return evaluation.mitigationStatus;
    case DnshObjective.ADAPTATION:
      // Only return status if checklist is completed
      if (!hasChecklist) return 'Not Assessed';
      // Use adaptationStatus (which comes from checklist)
      return evaluation.adaptationStatus || 'Not Assessed';
    case DnshObjective.WATER:
      if (!hasChecklist) return 'Not Assessed';
      return evaluation.waterStatus;
    case DnshObjective.CIRCULAR:
      if (!hasChecklist) return 'Not Assessed';
      return evaluation.circularStatus;
    case DnshObjective.POLLUTION:
      if (!hasChecklist) return 'Not Assessed';
      return evaluation.pollutionStatus;
    case DnshObjective.BIODIVERSITY:
      if (!hasChecklist) return 'Not Assessed';
      return evaluation.biodiversityStatus;
    default:
      return 'Not Assessed';
  }
};

/**
 * Calculate objective-level statistics for an operation
 * Returns consistent counts and percentages
 */
export const calculateObjectiveStats = (
  operation: Operation,
  objective: DnshObjective
): {
  compliant: number;
  nonCompliant: number;
  conditional: number;
  notAssessed: number;
  total: number;
  totalAssessed: number;
  progress: number; // Percentage of compliant assets among assessed assets
} => {
  let compliant = 0;
  let nonCompliant = 0;
  let conditional = 0;
  let notAssessed = 0;
  let totalAssessed = 0;

  operation.assets.forEach(asset => {
    const evaluation = asset.dnshEvaluation;
    const status = getObjectiveStatusFromAsset(evaluation, objective);

    switch (status) {
      case 'Compliant':
        compliant++;
        totalAssessed++;
        break;
      case 'Non-Compliant':
        nonCompliant++;
        totalAssessed++;
        break;
      case 'Conditional':
        conditional++;
        totalAssessed++;
        break;
      case 'Not Assessed':
        notAssessed++;
        break;
    }
  });

  const total = operation.assets.length;
  const progress = totalAssessed > 0 
    ? Math.round((compliant / totalAssessed) * 100) 
    : 0;

  return {
    compliant,
    nonCompliant,
    conditional,
    notAssessed,
    total,
    totalAssessed,
    progress
  };
};

/**
 * Check if an asset is exempt from DNSH evaluation for a specific objective
 * (i.e., if the objective is the substantial contribution)
 */
export const isAssetExemptForObjective = (
  asset: Asset,
  objective: DnshObjective,
  operationSubstantialContribution?: DnshObjective
): boolean => {
  // Check asset-level substantial contribution first
  if (asset.attributes.substantialContribution === objective) {
    return true;
  }
  // Fall back to operation-level substantial contribution
  if (operationSubstantialContribution === objective) {
    return true;
  }
  return false;
};

/**
 * Get overall DNSH summary for an operation
 * Aggregates all objectives
 */
export const getOperationDnshSummary = (operation: Operation): {
  compliant: number;
  nonCompliant: number;
  conditional: number;
  notAssessed: number;
  totalAssets: number;
} => {
  let compliant = 0;
  let nonCompliant = 0;
  let conditional = 0;
  let notAssessed = 0;

  operation.assets.forEach(asset => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) {
      notAssessed++;
      return;
    }

    const overallStatus = evaluation.overallStatus;
    switch (overallStatus) {
      case 'Compliant':
        compliant++;
        break;
      case 'Non-Compliant':
        nonCompliant++;
        break;
      case 'Conditional':
        conditional++;
        break;
      default:
        notAssessed++;
    }
  });

  return {
    compliant,
    nonCompliant,
    conditional,
    notAssessed,
    totalAssets: operation.assets.length
  };
};
