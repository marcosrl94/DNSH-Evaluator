/**
 * Journey Service
 * Manages user journey progress and stage tracking
 */

import { JourneyStage, JourneyProgress, JOURNEY_STAGES } from '../types/journey';
import { Operation } from '../types';
import { apiClient } from '../src/services/api';

const USE_API = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_API_URL;

/**
 * Calculate journey progress for an operation
 */
export function calculateJourneyProgress(operation: Operation): JourneyProgress {
  const stages = JOURNEY_STAGES;
  let currentStage = JourneyStage.INPUT_LOADING;
  let progress = 0;
  let completed = false;

  // Stage 1: Input Loading
  const hasInputs = operation.assets && operation.assets.length > 0;
  const hasDocuments = operation.evidenceDocuments && operation.evidenceDocuments.length > 0;
  const stage1Complete = hasInputs && hasDocuments;

  if (!stage1Complete) {
    progress = hasInputs ? 50 : 0;
    return {
      operationId: operation.id,
      stage: JourneyStage.INPUT_LOADING,
      completed: false,
      progress,
      lastUpdated: operation.updatedAt || operation.createdAt,
      updatedBy: operation.updatedBy || 'system'
    };
  }

  // Stage 2: Automated Evaluation
  const hasEvaluations = operation.assets?.some(asset => 
    asset.dnshEvaluation && Object.keys(asset.dnshEvaluation).length > 0
  );
  const hasClimateData = operation.assets?.some(asset => 
    asset.climateData && Object.keys(asset.climateData).length > 0
  );
  const stage2Complete = hasEvaluations && hasClimateData;

  if (!stage2Complete) {
    currentStage = JourneyStage.AUTOMATED_EVALUATION;
    progress = hasEvaluations ? 50 : 20;
    return {
      operationId: operation.id,
      stage: currentStage,
      completed: false,
      progress,
      lastUpdated: operation.updatedAt || operation.createdAt,
      updatedBy: operation.updatedBy || 'system'
    };
  }

  // Stage 3: Manual Data Entry
  const allAssetsEvaluated = operation.assets?.every(asset => {
    const eval = asset.dnshEvaluation;
    if (!eval) return false;
    
    // Check if all objectives have been evaluated
    const objectives = ['mitigation', 'adaptation', 'water', 'circularEconomy', 'pollution', 'biodiversity'];
    return objectives.every(obj => {
      const objEval = eval[obj as keyof typeof eval];
      return objEval && objEval.compliant !== undefined;
    });
  });
  
  const hasJustifications = operation.assets?.some(asset =>
    asset.dnshEvaluation && Object.values(asset.dnshEvaluation).some(eval =>
      eval && eval.justification && eval.justification.length > 0
    )
  );
  
  const stage3Complete = allAssetsEvaluated && hasJustifications;

  if (!stage3Complete) {
    currentStage = JourneyStage.MANUAL_DATA_ENTRY;
    progress = allAssetsEvaluated ? 80 : 60;
    return {
      operationId: operation.id,
      stage: currentStage,
      completed: false,
      progress,
      lastUpdated: operation.updatedAt || operation.createdAt,
      updatedBy: operation.updatedBy || 'system'
    };
  }

  // Stage 4: Report Generation
  const hasReports = operation.reports && operation.reports.length > 0;
  const stage4Complete = hasReports;

  if (!stage4Complete) {
    currentStage = JourneyStage.REPORT_GENERATION;
    progress = 85;
    return {
      operationId: operation.id,
      stage: currentStage,
      completed: false,
      progress,
      lastUpdated: operation.updatedAt || operation.createdAt,
      updatedBy: operation.updatedBy || 'system'
    };
  }

  // Stage 5: Review & Management
  currentStage = JourneyStage.REVIEW_MANAGEMENT;
  progress = 100;
  completed = true;

  return {
    operationId: operation.id,
    stage: currentStage,
    completed,
    progress,
    lastUpdated: operation.updatedAt || operation.createdAt,
    updatedBy: operation.updatedBy || 'system'
  };
}

/**
 * Get journey stage metadata
 */
export function getJourneyStageMetadata(stage: JourneyStage) {
  return JOURNEY_STAGES.find(s => s.stage === stage);
}

/**
 * Get next stage in journey
 */
export function getNextStage(currentStage: JourneyStage): JourneyStage | null {
  const currentIndex = JOURNEY_STAGES.findIndex(s => s.stage === currentStage);
  if (currentIndex === -1 || currentIndex === JOURNEY_STAGES.length - 1) {
    return null;
  }
  return JOURNEY_STAGES[currentIndex + 1].stage;
}

/**
 * Get previous stage in journey
 */
export function getPreviousStage(currentStage: JourneyStage): JourneyStage | null {
  const currentIndex = JOURNEY_STAGES.findIndex(s => s.stage === currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return JOURNEY_STAGES[currentIndex - 1].stage;
}

/**
 * Check if stage is accessible (all previous stages completed)
 */
export function isStageAccessible(operation: Operation, targetStage: JourneyStage): boolean {
  const progress = calculateJourneyProgress(operation);
  const targetIndex = JOURNEY_STAGES.findIndex(s => s.stage === targetStage);
  const currentIndex = JOURNEY_STAGES.findIndex(s => s.stage === progress.stage);
  
  // Can access current or previous stages, or next stage if current is completed
  return targetIndex <= currentIndex + 1;
}
