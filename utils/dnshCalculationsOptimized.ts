/**
 * Optimized DNSH Calculation Utilities
 * Memoized and optimized for performance
 */

import { Asset, AssetDnshEvaluation, DnshObjective, Operation } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';

// Cache for objective status calculations
const statusCache = new Map<string, 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed'>();
const CACHE_TTL = 5000; // 5 seconds

interface CacheEntry {
  status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  timestamp: number;
}

/**
 * Get cache key for an asset-objective combination
 */
const getCacheKey = (assetId: string, objective: DnshObjective, operationSubstantialContribution?: DnshObjective): string => {
  return `${assetId}-${objective}-${operationSubstantialContribution || 'none'}`;
};

/**
 * Get the status for a specific objective from an asset evaluation (OPTIMIZED)
 * Uses caching to avoid redundant calculations
 */
export const getObjectiveStatusFromAssetOptimized = (
  evaluation: AssetDnshEvaluation | undefined,
  objective: DnshObjective,
  asset?: Asset,
  operationSubstantialContribution?: DnshObjective
): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
  if (!asset) {
    return 'Not Assessed';
  }

  const cacheKey = getCacheKey(asset.id, objective, operationSubstantialContribution);
  const cached = statusCache.get(cacheKey) as CacheEntry | undefined;
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status;
  }

  // Check if this objective is the substantial contribution FIRST (exempt from DNSH evaluation)
  const isSubstantialContribution = 
    (asset?.attributes.substantialContribution === objective) ||
    (operationSubstantialContribution === objective);
  
  if (isSubstantialContribution) {
    statusCache.set(cacheKey, { status: 'Compliant', timestamp: Date.now() });
    return 'Compliant';
  }

  // If not substantial contribution, require evaluation to exist
  if (!evaluation) {
    statusCache.set(cacheKey, { status: 'Not Assessed', timestamp: Date.now() });
    return 'Not Assessed';
  }

  // Check if checklist has been completed for this objective
  const checklistAnswers = evaluation.checklistAnswers?.[objective];
  const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
  
  if (!template) {
    statusCache.set(cacheKey, { status: 'Not Assessed', timestamp: Date.now() });
    return 'Not Assessed';
  }
  
  // Verify that ALL questions have been answered (optimized check)
  const hasChecklist = checklistAnswers && 
    template.questions.every(q => {
      const answer = checklistAnswers[q.id];
      return answer && answer.response !== null && answer.response !== undefined;
    });

  let status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';

  switch (objective) {
    case DnshObjective.MITIGATION:
      if (!hasChecklist) status = 'Not Assessed';
      else status = evaluation.mitigationStatus;
      break;
    case DnshObjective.ADAPTATION:
      if (!hasChecklist) status = 'Not Assessed';
      else status = evaluation.adaptationStatus || 'Not Assessed';
      break;
    case DnshObjective.WATER:
      if (!hasChecklist) status = 'Not Assessed';
      else status = evaluation.waterStatus;
      break;
    case DnshObjective.CIRCULAR:
      if (!hasChecklist) status = 'Not Assessed';
      else status = evaluation.circularStatus;
      break;
    case DnshObjective.POLLUTION:
      if (!hasChecklist) status = 'Not Assessed';
      else status = evaluation.pollutionStatus;
      break;
    case DnshObjective.BIODIVERSITY:
      if (!hasChecklist) status = 'Not Assessed';
      else status = evaluation.biodiversityStatus;
      break;
    default:
      status = 'Not Assessed';
  }

  statusCache.set(cacheKey, { status, timestamp: Date.now() });
  return status;
};

/**
 * Calculate objective-level statistics for an operation (OPTIMIZED)
 * Uses batch processing and memoization
 */
export const calculateObjectiveStatsOptimized = (
  operation: Operation,
  objective: DnshObjective
): {
  compliant: number;
  nonCompliant: number;
  conditional: number;
  notAssessed: number;
  total: number;
  totalAssessed: number;
  progress: number;
} => {
  let compliant = 0;
  let nonCompliant = 0;
  let conditional = 0;
  let notAssessed = 0;
  let totalAssessed = 0;

  // Batch process assets for better performance
  const assets = Array.isArray(operation.assets) ? operation.assets : [];
  const operationSubstantialContribution = operation.substantialContributionId as DnshObjective | undefined;

  for (const asset of assets) {
    const evaluation = asset.dnshEvaluation;
    const status = getObjectiveStatusFromAssetOptimized(
      evaluation,
      objective,
      asset,
      operationSubstantialContribution
    );

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
  }

  const total = assets.length;
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
 * Clear cache for a specific asset (call when asset is updated)
 */
export const clearAssetCache = (assetId: string): void => {
  const keysToDelete: string[] = [];
  statusCache.forEach((_, key) => {
    if (key.startsWith(`${assetId}-`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => statusCache.delete(key));
};

/**
 * Clear all cache (call when needed)
 */
export const clearAllCache = (): void => {
  statusCache.clear();
};

/**
 * Batch calculate stats for multiple objectives (optimized)
 */
export const calculateMultipleObjectiveStats = (
  operation: Operation,
  objectives: DnshObjective[]
): Record<DnshObjective, ReturnType<typeof calculateObjectiveStatsOptimized>> => {
  const results = {} as Record<DnshObjective, ReturnType<typeof calculateObjectiveStatsOptimized>>;
  
  for (const objective of objectives) {
    results[objective] = calculateObjectiveStatsOptimized(operation, objective);
  }
  
  return results;
};
