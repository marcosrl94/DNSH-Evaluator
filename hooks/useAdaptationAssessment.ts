/**
 * Custom Hook for Adaptation Assessment
 * 
 * Optimized hook that manages adaptation assessment state and calculations
 * with memoization and performance optimizations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Asset, Operation, AdaptationAssessment, RiskResult, ClimateScenario } from '../types';
import { computeOperationRisk } from '../services/riskEngine';
import { filterRelevantHazards } from '../utils/hazardFiltering';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { getIntegratedClimateData, IntegratedClimateData } from '../services/climateDataIntegration';

interface UseAdaptationAssessmentOptions {
  operation: Operation;
  selectedAssetId?: string | null;
  selectedScenario: ClimateScenario;
  selectedHorizon: '2030' | '2050' | '2100';
}

interface UseAdaptationAssessmentReturn {
  assessments: AdaptationAssessment[];
  risks: RiskResult[];
  loading: boolean;
  integratedClimateData: IntegratedClimateData | null;
  relevantHazards: typeof EU_TAXONOMY_HAZARDS;
  recalculate: () => void;
}

/**
 * Optimized hook for adaptation assessment
 * Uses memoization to prevent unnecessary recalculations
 */
export const useAdaptationAssessment = ({
  operation,
  selectedAssetId,
  selectedScenario,
  selectedHorizon
}: UseAdaptationAssessmentOptions): UseAdaptationAssessmentReturn => {
  const [assessments, setAssessments] = useState<AdaptationAssessment[]>([]);
  const [risks, setRisks] = useState<RiskResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [integratedClimateData, setIntegratedClimateData] = useState<IntegratedClimateData | null>(null);

  // Memoize assets to evaluate
  const assetsToEvaluate = useMemo(() => {
    if (selectedAssetId) {
      const asset = operation.assets.find(a => a.id === selectedAssetId);
      return asset ? [asset] : operation.assets;
    }
    return operation.assets;
  }, [operation.assets, selectedAssetId]);

  // Memoize selected asset
  const selectedAsset = useMemo(() => {
    return selectedAssetId 
      ? operation.assets.find(a => a.id === selectedAssetId)
      : null;
  }, [operation.assets, selectedAssetId]);

  // Memoize relevant hazards
  const relevantHazards = useMemo(() => {
    return filterRelevantHazards(
      EU_TAXONOMY_HAZARDS,
      selectedScenario,
      selectedHorizon,
      selectedAsset || undefined
    );
  }, [selectedScenario, selectedHorizon, selectedAsset]);

  // Load integrated climate data (async, non-blocking)
  useEffect(() => {
    if (assetsToEvaluate.length === 0) return;

    // Load climate data for the first asset (or selected asset)
    const assetToLoad = assetsToEvaluate[0];
    getIntegratedClimateData(
      assetToLoad,
      relevantHazards,
      [selectedScenario],
      [selectedHorizon]
    ).then(data => {
      setIntegratedClimateData(data);
    }).catch(() => {
      // Silently fail - fallback to scenario-based calculations
    });
  }, [assetsToEvaluate, relevantHazards, selectedScenario, selectedHorizon]);

  // Recalculate risk assessments
  const recalculate = useCallback(() => {
    setLoading(true);
    
    // Use setTimeout to debounce rapid changes
    const timer = setTimeout(() => {
      try {
        const result = computeOperationRisk(assetsToEvaluate, selectedScenario, selectedHorizon);
        
        // Filter assessments to only show relevant hazards
        const filteredAssessments = result.assessments.filter(a => 
          relevantHazards.some(h => h.id === a.hazardTypeId)
        );
        
        setAssessments(filteredAssessments);
        setRisks(result.risks);
      } catch (error) {
        console.error('Error calculating risk assessments:', error);
        setAssessments([]);
        setRisks([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [assetsToEvaluate, selectedScenario, selectedHorizon, relevantHazards]);

  // Recalculate when dependencies change
  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return {
    assessments,
    risks,
    loading,
    integratedClimateData,
    relevantHazards,
    recalculate
  };
};
