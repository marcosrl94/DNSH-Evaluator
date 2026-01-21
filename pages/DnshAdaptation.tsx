
import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Operation, AdaptationAssessment, RiskResult, RiskBand, ClimateScenario, AssetDnshEvaluation } from '../types';
import { ArrowLeft, Check, Search, Activity, Sliders, RefreshCw, Eye, EyeOff, ArrowRight, X, CheckCircle, AlertTriangle, Info, Save } from 'lucide-react';
import { computeOperationRisk } from '../services/riskEngine';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { getAllMeasures } from '../constants/extendedMeasures';
import { getMeasuresByHazardSorted, getRecommendedMeasuresForCompliance, findMeasuresForCompliance } from '../services/catalogService';
import { CLIMATE_SCENARIOS, getScenarioById } from '../constants/climateScenarios';
import MapViewer, { ActiveLayer, hazardColorForId } from '../components/MapViewer';
import { filterRelevantHazards, getHazardMetricsComparison, checkHazardThreshold } from '../utils/hazardFiltering';
import { useAdaptationAssessment } from '../hooks/useAdaptationAssessment';
import ClimateDataPanel from '../components/ClimateDataPanel';
import AdaptationDecisionTreeComponent from '../components/AdaptationDecisionTree';
import { buildAdaptationDecisionTree, recommendAdaptationPathway } from '../services/adaptationDecisionTree';
import { EPAdaptationPathwayType } from '../constants/equatorPrinciples';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface Props {
  operation: Operation;
  onBack: () => void;
  embedded?: boolean; // If true, adapts layout for embedded use in DnshEvaluation
  selectedAssetId?: string | null; // Optional: filter by selected asset
  onUpdateOperation?: (operation: Operation) => void; // Callback to update operation with new adaptation data
}

const DnshAdaptationPage: React.FC<Props> = ({ operation, onBack, embedded = false, selectedAssetId = null, onUpdateOperation }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  // Selection State
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  
  // Visibility State (Multi-layer map control)
  // Maps hazardId -> Opacity (0.0 to 1.0)
  const [visibleHazards, setVisibleHazards] = useState<Record<string, number>>({});
  
  // Climate Scenario Selection (SSP-based)
  const [selectedScenario, setSelectedScenario] = useState<ClimateScenario>(ClimateScenario.SSP2_45);
  const [selectedHorizon, setSelectedHorizon] = useState<'2030' | '2050' | '2100'>('2050');
  
  const selectedScenarioConfig = getScenarioById(selectedScenario);
  
  // Selected measures per hazard (hazardId -> measureIds[])
  const [selectedMeasures, setSelectedMeasures] = useState<Record<string, string[]>>({});
  
  // Decision tree state
  const [selectedPathway, setSelectedPathway] = useState<EPAdaptationPathwayType | null>(null);
  const [showDecisionTree, setShowDecisionTree] = useState(false);

  // Get assets to evaluate (filter by selectedAssetId if provided)
  const assetsToEvaluate = useMemo(() => {
    if (selectedAssetId) {
      const asset = operation.assets.find(a => a.id === selectedAssetId);
      return asset ? [asset] : operation.assets;
    }
    return operation.assets;
  }, [operation.assets, selectedAssetId]);
  
  const selectedAsset = selectedAssetId 
    ? operation.assets.find(a => a.id === selectedAssetId)
    : null;

  // Use optimized hook for assessments
  const {
    assessments,
    risks,
    loading,
    integratedClimateData,
    relevantHazards
  } = useAdaptationAssessment({
    operation,
    selectedAssetId,
    selectedScenario,
    selectedHorizon
  });

  // Load saved measures from asset evaluations when assessments are ready
  useEffect(() => {
    if (assetsToEvaluate.length > 0 && assessments.length > 0 && risks.length > 0) {
      const savedMeasures: Record<string, string[]> = {};
      
      // For each asset, get its saved adaptation measures
      assetsToEvaluate.forEach(asset => {
        const evaluation = asset.dnshEvaluation;
        if (evaluation?.adaptationMeasures && evaluation.adaptationMeasures.length > 0) {
          // Find which hazards affect this asset
          const assetRisks = risks.filter(r => r.assetId === asset.id);
          const hazardIdsForAsset = [...new Set(assetRisks.map(r => r.hazardTypeId))];
          
          // For each hazard affecting this asset, check if any of its measures are in the saved list
          hazardIdsForAsset.forEach((hazardId: string) => {
            if (!savedMeasures[hazardId]) {
              savedMeasures[hazardId] = [];
            }
            // Add saved measures that might apply to this hazard
            evaluation.adaptationMeasures.forEach((measureId: string) => {
              if (!savedMeasures[hazardId].includes(measureId)) {
                savedMeasures[hazardId].push(measureId);
              }
            });
          });
        }
      });
      
      if (Object.keys(savedMeasures).length > 0) {
        setSelectedMeasures(savedMeasures);
      }
    }
  }, [assetsToEvaluate, assessments, risks]);

  // Derived state for MapViewer
  const activeMapLayers: ActiveLayer[] = Object.entries(visibleHazards).map(([id, opacity]) => {
      const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === id);
      return hazard ? { hazard, opacity } : null;
  }).filter(Boolean) as ActiveLayer[];

  const toggleVisibility = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Prevent selecting the row for details
      setVisibleHazards(prev => {
          const next = { ...prev };
          if (next[id] !== undefined) {
              delete next[id];
          } else {
              next[id] = 0.5; // Default opacity
          }
          return next;
      });
  };

  const updateOpacity = (id: string, val: number) => {
      setVisibleHazards(prev => ({
          ...prev,
          [id]: val
      }));
  };

  const selectedHazard = selectedHazardId 
    ? EU_TAXONOMY_HAZARDS.find(h => h.id === selectedHazardId) 
    : null;
  
  const selectedAssessment = assessments.find(a => a.hazardTypeId === selectedHazardId);
  
  // Calculate DNSH status pre and post measures
  const calculateDnshStatus = (riskBand: RiskBand): 'Compliant' | 'Non-Compliant' | 'Conditional' => {
    if (riskBand === 'Very High' || riskBand === 'High') return 'Non-Compliant';
    if (riskBand === 'Moderate') return 'Conditional';
    return 'Compliant';
  };
  
  const calculatePostMeasuresStatus = (assessment: AdaptationAssessment, measureIds: string[]): {
    riskBand: RiskBand;
    totalScore: number;
    dnshStatus: 'Compliant' | 'Non-Compliant' | 'Conditional';
  } => {
    if (measureIds.length === 0) {
      return {
        riskBand: assessment.riskBand,
        totalScore: assessment.totalScore,
        dnshStatus: calculateDnshStatus(assessment.riskBand)
      };
    }
    
    // Calculate reduction based on measures - use specific effectiveness for this hazard
    const totalReduction = measureIds.reduce((acc, mid) => {
      const measure = getAllMeasures().find(m => m.id === mid);
      if (!measure) return acc;
      
      // Try to get specific effectiveness for this hazard
      const hazardMitigation = measure.hazardMitigation?.find(hm => hm.hazardId === assessment.hazardTypeId);
      if (hazardMitigation) {
        // Use specific vulnerability reduction for this hazard
        return acc + (hazardMitigation.effectiveness.vulnerabilityReduction / 100);
      }
      
      // Fallback to general risk reduction percentage
      return acc + (measure.riskReductionPercentage / 100);
    }, 0);
    
    // Apply reduction to vulnerability score (most affected by measures)
    // Cap total reduction at 100%
    const effectiveReduction = Math.min(1, totalReduction);
    const newVulnerabilityScore = Math.max(0, assessment.scoreVulnerability - Math.ceil(effectiveReduction * assessment.scoreVulnerability));
    const newTotalScore = assessment.scoreHazard + assessment.scoreExposure + newVulnerabilityScore;
    
    // Determine new risk band
    let newRiskBand: RiskBand;
    if (newTotalScore >= 13) newRiskBand = 'Very High';
    else if (newTotalScore >= 10) newRiskBand = 'High';
    else if (newTotalScore >= 5) newRiskBand = 'Moderate';
    else newRiskBand = 'Low';
    
    return {
      riskBand: newRiskBand,
      totalScore: newTotalScore,
      dnshStatus: calculateDnshStatus(newRiskBand)
    };
  };
  
  const postMeasuresData = useMemo(() => {
    if (!selectedAssessment) return null;
    const measures = selectedMeasures[selectedAssessment.hazardTypeId] || [];
    return calculatePostMeasuresStatus(selectedAssessment, measures);
  }, [selectedAssessment, selectedMeasures]);
  
  const toggleMeasure = (hazardId: string, measureId: string) => {
    setSelectedMeasures(prev => {
      const current = prev[hazardId] || [];
      const newMeasures = current.includes(measureId)
        ? current.filter(id => id !== measureId)
        : [...current, measureId];
      const updated = { ...prev, [hazardId]: newMeasures };
      
      // Auto-save when measures change
      saveAdaptationMeasures(updated);
      
      return updated;
    });
  };

  // Save adaptation measures to asset evaluations
  const saveAdaptationMeasures = (measures: Record<string, string[]>) => {
    if (!onUpdateOperation) return;

    const updatedOperation = { ...operation };
    const updatedAssets = updatedOperation.assets.map(asset => {
      // Get all assessments for this asset's hazards
      // Each assessment is per hazard type, but we need to find which hazards affect this asset
      const assetRisks = risks.filter(r => r.assetId === asset.id);
      const hazardIdsForAsset = [...new Set(assetRisks.map(r => r.hazardTypeId))];
      
      const assetAssessments = assessments.filter(a => 
        hazardIdsForAsset.includes(a.hazardTypeId)
      );

      if (assetAssessments.length === 0) return asset;

      // Calculate pre-measures status (worst case across all hazards)
      // DNSH requires ALL hazards to be compliant, so we take the worst
      const preMeasuresStatuses = assetAssessments.map(a => calculateDnshStatus(a.riskBand));
      const worstPreMeasuresStatus = preMeasuresStatuses.includes('Non-Compliant') 
        ? 'Non-Compliant' 
        : preMeasuresStatuses.includes('Conditional') 
        ? 'Conditional' 
        : 'Compliant';
      
      const worstPreMeasuresRiskBand = assetAssessments.reduce((worst, a) => {
        const order = { 'Very High': 4, 'High': 3, 'Moderate': 2, 'Low': 1 };
        return order[a.riskBand] > order[worst] ? a.riskBand : worst;
      }, assetAssessments[0].riskBand);

      // Calculate post-measures status (worst case after applying measures)
      // DNSH requires ALL hazards to be compliant, so we take the worst after measures
      const postMeasuresData = assetAssessments.map(a => {
        const measureIds = measures[a.hazardTypeId] || [];
        return calculatePostMeasuresStatus(a, measureIds);
      });
      
      const postMeasuresStatuses = postMeasuresData.map(d => d.dnshStatus);
      const worstPostMeasuresStatus = postMeasuresStatuses.includes('Non-Compliant')
        ? 'Non-Compliant'
        : postMeasuresStatuses.includes('Conditional')
        ? 'Conditional'
        : 'Compliant';

      const worstPostMeasuresRiskBand = postMeasuresData.reduce((worst, d) => {
        const order = { 'Very High': 4, 'High': 3, 'Moderate': 2, 'Low': 1 };
        return order[d.riskBand] > order[worst] ? d.riskBand : worst;
      }, postMeasuresData[0].riskBand);

      // Collect all measure IDs for this asset (across all hazards)
      const allMeasureIds = [...new Set(Object.values(measures).flat())];

      // Update or create evaluation
      const existingEvaluation = asset.dnshEvaluation || {
        assetId: asset.id,
        evaluationDate: new Date().toISOString(),
        evaluator: 'Current User',
        mitigationStatus: 'Not Assessed',
        mitigationEvidence: [],
        adaptationStatus: worstPreMeasuresStatus,
        adaptationStatusPreMeasures: worstPreMeasuresStatus,
        waterStatus: 'Not Assessed',
        waterEvidence: [],
        circularStatus: 'Not Assessed',
        circularEvidence: [],
        pollutionStatus: 'Not Assessed',
        pollutionEvidence: [],
        biodiversityStatus: 'Not Assessed',
        biodiversityEvidence: [],
        overallStatus: worstPreMeasuresStatus,
      };

      // Use post-measures status if measures are applied, otherwise use pre-measures
      const finalAdaptationStatus = allMeasureIds.length > 0 
        ? worstPostMeasuresStatus 
        : worstPreMeasuresStatus;

      const updatedEvaluation: AssetDnshEvaluation = {
        ...existingEvaluation,
        adaptationStatusPreMeasures: worstPreMeasuresStatus,
        adaptationStatusPostMeasures: allMeasureIds.length > 0 ? worstPostMeasuresStatus : undefined,
        adaptationStatus: finalAdaptationStatus,
        adaptationRiskBandPreMeasures: worstPreMeasuresRiskBand,
        adaptationRiskBandPostMeasures: allMeasureIds.length > 0 ? worstPostMeasuresRiskBand : undefined,
        adaptationRiskBand: allMeasureIds.length > 0 ? worstPostMeasuresRiskBand : worstPreMeasuresRiskBand,
        adaptationMeasures: allMeasureIds.length > 0 ? allMeasureIds : undefined,
        adaptationNotes: allMeasureIds.length > 0 
          ? `Medidas de adaptación aplicadas: ${allMeasureIds.length} medida(s) seleccionada(s). Estado DNSH: ${worstPostMeasuresStatus}`
          : existingEvaluation.adaptationNotes,
      };

      return {
        ...asset,
        dnshEvaluation: updatedEvaluation,
      };
    });

    updatedOperation.assets = updatedAssets;
    
    // Update in data store first (ensures all views are notified)
    const { updateOperation, updateOperationAssets } = require('../services/dataManagement');
    updateOperation(updatedOperation);
    
    // Also update individual asset evaluations in data store
    const assetUpdates = updatedAssets
      .filter(a => a.dnshEvaluation)
      .map(a => ({ assetId: a.id, evaluation: a.dnshEvaluation! }));
    updateOperationAssets(updatedOperation.id, assetUpdates);
    
    // Also update via callback for immediate local state update
    if (onUpdateOperation) {
      onUpdateOperation(updatedOperation);
    }
  };

  const renderStepContent = () => {
      // Check if selected hazard is out of scope
      const isSelectedHazardOutOfScope = selectedAsset && selectedHazard
        ? selectedAsset.attributes.adaptationHazardScope?.[selectedHazard.id] === 'Out of Scope'
        : false;
      
      if (isSelectedHazardOutOfScope) {
        return (
          <div className={`flex flex-col items-center justify-center h-64 rounded-xl border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
            <AlertTriangle size={48} className={`mb-4 opacity-50 transition-colors ${themeClasses.text.tertiary}`} />
            <p className={`text-lg font-semibold mb-2 font-mono uppercase tracking-wider transition-colors ${themeClasses.text.secondary}`}>HAZARD_FUERA_SCOPE</p>
            <p className={`text-sm text-center max-w-md font-mono transition-colors ${themeClasses.text.tertiary}`}>
              EL_HAZARD <strong className={themeClasses.text.primary}>{selectedHazard?.name.replace(/\s/g, '_')}</strong> ESTA_MARCADO_COMO_FUERA_DE_SCOPE_PARA_EL_ASSET <strong className={themeClasses.text.primary}>{selectedAsset?.name.replace(/\s/g, '_')}</strong>.
            </p>
            <p className={`text-xs mt-4 text-center max-w-md font-mono transition-colors ${themeClasses.text.tertiary}`}>
              LOS_HAZARDS_FUERA_DE_SCOPE_NO_REQUIEREN_EVALUACION_DNSH_SEGUN_LAS_CARACTERISTICAS_DEL_ASSET.
            </p>
          </div>
        );
      }
      
      if (!selectedHazard || !selectedAssessment) return (
          <div className={`flex flex-col items-center justify-center h-64 transition-colors ${themeClasses.text.tertiary}`}>
              <Search size={48} className={`mb-4 opacity-50 transition-colors ${themeClasses.text.tertiary}`} />
              <p className={`font-mono uppercase tracking-wider transition-colors ${themeClasses.text.secondary}`}>SELECT_HAZARD_FROM_LIST</p>
              <p className={`text-xs mt-2 font-mono transition-colors ${themeClasses.text.tertiary}`}>USE_EYE_ICON_TO_TOGGLE_MAP_LAYERS <Eye size={12} className="inline"/>.</p>
          </div>
      );

      return (
        <div className="space-y-6 animate-fadeIn">
            {/* Step 3: Materiality Assessment (H+E+V) */}
            <div className="bg-[#0a0a0a] p-6 rounded-xl border border-[#1a1a1a] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center font-mono uppercase tracking-wider">
                        <Sliders size={20} className="mr-2 text-[#00a8ff]" />
                        MATERIALITY_ASSESSMENT: {selectedHazard.name.replace(/\s/g, '_')}
                    </h4>
                    <div className="text-xs text-right text-[#666666] font-mono uppercase tracking-wider">
                     <p>SCENARIO: <span className="font-semibold text-white">{selectedScenarioConfig?.label || selectedScenario}</span></p>
                        <p>HORIZON: <span className="font-semibold text-white">{selectedHorizon}</span></p>
                     {selectedScenarioConfig && selectedHazard.scenarioProjections?.[selectedScenario] && (
                       <p className="text-[10px] mt-1">
                         Intensity {selectedHorizon}: {((selectedHazard.scenarioProjections[selectedScenario]?.[selectedHorizon === '2030' ? 'intensity2050' : selectedHorizon === '2050' ? 'intensity2050' : 'intensity2100'] || 0) * 100).toFixed(0)}%
                       </p>
                     )}
                    </div>
                </div>
                
                {/* Metrics Comparison Across Scenarios */}
                {(() => {
                  const comparison = getHazardMetricsComparison(selectedHazard, selectedHorizon);
                  const currentMetrics = selectedHorizon === '2030' ? selectedScenarioConfig?.metrics2030 :
                                        selectedHorizon === '2050' ? selectedScenarioConfig?.metrics2050 :
                                        selectedScenarioConfig?.metrics2100;
                  
                  return (
                    <div className="mb-6 bg-[#111111] rounded-lg p-4 border border-[#1a1a1a]">
                      <h5 className="text-sm font-bold text-white mb-3 flex items-center font-mono uppercase tracking-wider">
                        <Activity size={14} className="mr-2 text-[#00a8ff]" />
                        COMPARACION_METRICAS_POR_ESCENARIO ({selectedHorizon})
                      </h5>
                      <div className="grid grid-cols-3 gap-3">
                        {comparison.map(({ scenario, metrics, thresholdCheck }) => {
                          const scenarioConfig = getScenarioById(scenario);
                          const isCurrent = scenario === selectedScenario;
                          
                          return (
                            <div 
                              key={scenario}
                              className={`p-3 rounded-lg border-2 ${
                                isCurrent 
                                  ? 'border-[#00a8ff] bg-[#00a8ff]/10' 
                                  : 'border-[#1a1a1a] bg-[#0a0a0a]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold font-mono uppercase tracking-wider" style={{ color: scenarioConfig?.color }}>
                                  {scenarioConfig?.label.split(' ')[0]}
                                </span>
                                {thresholdCheck.exceeds && (
                                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded border border-red-500/30 font-mono">
                                    ⚠
                                  </span>
                                )}
                              </div>
                              
                              {/* Show relevant metrics based on hazard category */}
                              {selectedHazard.category === 'Temperature-related' && (
                                <div className="space-y-1 text-[10px] font-mono uppercase">
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">TEMP_↑:</span>
                                    <span className="font-semibold text-white">{metrics.temperatureIncrease.toFixed(1)}°C</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">HEAT_WAVES:</span>
                                    <span className="font-semibold text-white">{metrics.heatWaveFrequency}/AÑO</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">WILDFIRE:</span>
                                    <span className="font-semibold text-white">{(metrics.wildfireRisk * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              )}
                              
                              {selectedHazard.category === 'Water-related' && (
                                <div className="space-y-1 text-[10px] font-mono uppercase">
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">PRECIP:</span>
                                    <span className="font-semibold text-white">{metrics.precipitationChange > 0 ? '+' : ''}{metrics.precipitationChange.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">SLR:</span>
                                    <span className="font-semibold text-white">{metrics.seaLevelRise.toFixed(0)}CM</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">DROUGHT:</span>
                                    <span className="font-semibold text-white">{(metrics.droughtSeverity * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              )}
                              
                              {selectedHazard.category === 'Wind-related' && (
                                <div className="space-y-1 text-[10px] font-mono uppercase">
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">WIND_↑:</span>
                                    <span className="font-semibold text-white">+{metrics.windSpeedIncrease.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">EXTREME:</span>
                                    <span className="font-semibold text-white">{metrics.extremeWindFrequency}/AÑO</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-[#666666]">CYCLONES:</span>
                                    <span className="font-semibold text-white">{metrics.cycloneFrequency.toFixed(1)}/AÑO</span>
                                  </div>
                                </div>
                              )}
                              
                              {selectedHazard.threshold && (
                                <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                                  <div className="text-[9px] text-[#666666] font-mono uppercase">
                                    THRESHOLD: {selectedHazard.threshold.thresholdValue}{selectedHazard.threshold.unit}
                                  </div>
                                  <div className={`text-[9px] font-bold mt-0.5 font-mono uppercase ${
                                    thresholdCheck.exceeds ? 'text-red-400' : 'text-[#00ff88]'
                                  }`}>
                                    {thresholdCheck.exceeds ? 'EXCEDE' : 'DENTRO'}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <ScoreCard label="Hazard (H)" score={selectedAssessment.scoreHazard} description="Climate projection intensity" color="blue" />
                    <ScoreCard label="Exposure (E)" score={selectedAssessment.scoreExposure} description="Asset location sensitivity" color="indigo" />
                    <ScoreCard label="Vulnerability (V)" score={selectedAssessment.scoreVulnerability} description="Asset susceptibility" color="purple" />
                </div>

                <div className="flex items-center justify-between bg-[#111111] p-4 rounded-lg border border-[#1a1a1a]">
                    <div>
                        <p className="text-sm font-semibold text-[#666666] font-mono uppercase tracking-wider">TOTAL_RISK_SCORE_H+E+V</p>
                        <div className="flex items-baseline space-x-2">
                             <p className="text-3xl font-bold text-white font-mono">{selectedAssessment.totalScore}</p>
                             <span className="text-sm text-[#666666] font-normal font-mono">/ 15</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold text-[#666666] font-mono uppercase tracking-wider">CALCULATED_RISK_BAND</p>
                        <span className={`px-4 py-1 rounded-full text-sm font-bold uppercase inline-block mt-1 transition-colors duration-300 font-mono tracking-wider ${
                            selectedAssessment.riskBand === 'Very High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            selectedAssessment.riskBand === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            selectedAssessment.riskBand === 'Moderate' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                            'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                        }`}>
                            {selectedAssessment.riskBand.replace(/\s/g, '_')}
                        </span>
                    </div>
                </div>

            </div>

            {/* Step 4: DNSH Diagnosis Pre/Post Measures */}
                 <div className="bg-[#0a0a0a] p-6 rounded-xl border border-[#1a1a1a]">
                <h4 className="text-lg font-bold text-white mb-6 flex items-center font-mono uppercase tracking-wider">
                        <Activity size={20} className="mr-2 text-[#00ff88]" />
                    DIAGNOSTICO_DNSH_PRE_POST_MEDIDAS_ADAPTACION
                    </h4>
                
                {/* Pre-Measures Diagnosis */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="text-sm font-bold text-white uppercase font-mono tracking-wider">ESTADO_INICIAL_PRE_MEDIDAS</h5>
                        <span className="text-xs text-[#666666] font-mono uppercase">SIN_MEDIDAS_ADAPTACION_APLICADAS</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 p-4 bg-[#111111] rounded-lg border border-[#1a1a1a]">
                        <div>
                            <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">RISK_BAND</p>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-bold uppercase inline-block font-mono tracking-wider ${
                                selectedAssessment.riskBand === 'Very High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                selectedAssessment.riskBand === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                selectedAssessment.riskBand === 'Moderate' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                                'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                            }`}>
                                {selectedAssessment.riskBand.replace(/\s/g, '_')}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">DNSH_STATUS</p>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-bold inline-block font-mono uppercase tracking-wider ${
                                calculateDnshStatus(selectedAssessment.riskBand) === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                calculateDnshStatus(selectedAssessment.riskBand) === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                            }`} title="ESTADO_DNSH_BASADO_EN_EVALUACION_AUTOMATIZADA_CRVA_H+E+V">
                                {calculateDnshStatus(selectedAssessment.riskBand).replace(/\s/g, '_')}
                            </span>
                            <p className="text-[10px] text-[#666666] mt-1 italic font-mono uppercase">
                                BASADO_EN_EVALUACION_CRVA_AUTOMATIZADA
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">TOTAL_SCORE_H+E+V</p>
                            <p className="text-lg font-bold text-white font-mono">{selectedAssessment.totalScore} / 15</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">MATERIALIDAD</p>
                            <p className={`text-sm font-semibold font-mono uppercase ${selectedAssessment.materiality ? 'text-red-400' : 'text-[#00ff88]'}`}>
                                {selectedAssessment.materiality ? 'MATERIAL' : 'NO_MATERIAL'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Post-Measures Diagnosis */}
                {postMeasuresData && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-bold text-white uppercase font-mono tracking-wider">ESTADO_CON_MEDIDAS_POST_MEDIDAS</h5>
                            <span className="text-xs text-[#00ff88] font-semibold font-mono uppercase">
                                {selectedMeasures[selectedAssessment.hazardTypeId]?.length || 0} MEDIDAS_APLICADAS
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 p-4 bg-[#00ff88]/10 rounded-lg border-2 border-[#00ff88]/30">
                            <div>
                                <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">RISK_BAND</p>
                                <span className={`px-3 py-1.5 rounded-full text-sm font-bold uppercase inline-block font-mono tracking-wider ${
                                    postMeasuresData.riskBand === 'Very High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    postMeasuresData.riskBand === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                    postMeasuresData.riskBand === 'Moderate' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                                    'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                                }`}>
                                    {postMeasuresData.riskBand.replace(/\s/g, '_')}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">DNSH_STATUS</p>
                                <span className={`px-3 py-1.5 rounded-full text-sm font-bold inline-block font-mono uppercase tracking-wider ${
                                    postMeasuresData.dnshStatus === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                    postMeasuresData.dnshStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                                }`}>
                                    {postMeasuresData.dnshStatus.replace(/\s/g, '_')}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">TOTAL_SCORE_H+E+V</p>
                                <p className="text-lg font-bold text-white font-mono">
                                    {postMeasuresData.totalScore} / 15
                                    {postMeasuresData.totalScore < selectedAssessment.totalScore && (
                                        <span className="ml-2 text-sm text-[#00ff88]">↓ {selectedAssessment.totalScore - postMeasuresData.totalScore}</span>
                                    )}
                                </p>
                            </div>
                                <div>
                                <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">MEJORA</p>
                                <p className={`text-sm font-semibold font-mono uppercase ${
                                    postMeasuresData.dnshStatus === 'Compliant' && calculateDnshStatus(selectedAssessment.riskBand) !== 'Compliant' 
                                        ? 'text-[#00ff88]' 
                                        : postMeasuresData.totalScore < selectedAssessment.totalScore 
                                        ? 'text-[#00a8ff]' 
                                        : 'text-[#666666]'
                                }`}>
                                    {postMeasuresData.dnshStatus === 'Compliant' && calculateDnshStatus(selectedAssessment.riskBand) !== 'Compliant' 
                                        ? 'DNSH_CUMPLIDO_✓' 
                                        : postMeasuresData.totalScore < selectedAssessment.totalScore 
                                        ? 'RIESGO_REDUCIDO' 
                                        : 'SIN_CAMBIO'}
                                </p>
                            </div>
                        </div>
                                </div>
                )}

                {/* Comparison Arrow */}
                {postMeasuresData && selectedMeasures[selectedAssessment.hazardTypeId]?.length > 0 && (
                    <div className="flex items-center justify-center my-4">
                        <div className="flex items-center space-x-4 bg-[#0a0a0a] p-4 rounded-lg border border-[#1a1a1a]">
                            <div className="text-center">
                                <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">PRE_MEDIDAS</p>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                                    calculateDnshStatus(selectedAssessment.riskBand) === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                    calculateDnshStatus(selectedAssessment.riskBand) === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                                }`}>
                                    {calculateDnshStatus(selectedAssessment.riskBand).replace(/\s/g, '_')}
                                </span>
                                </div>
                            <ArrowRight size={20} className="text-[#666666]" />
                            <div className="text-center">
                                <p className="text-xs text-[#666666] mb-1 font-mono uppercase tracking-wider">POST_MEDIDAS</p>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                                    postMeasuresData.dnshStatus === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                    postMeasuresData.dnshStatus === 'Non-Compliant' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {postMeasuresData.dnshStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Available Measures */}
                {selectedAssessment.measuresRequired && (() => {
                    // Get recommended measures for compliance
                    const currentDnshStatus = calculateDnshStatus(selectedAssessment.riskBand);
                    const recommendedMeasures = getRecommendedMeasuresForCompliance(
                        selectedAssessment.hazardTypeId,
                        selectedAssessment.riskBand,
                        selectedAssessment.totalScore,
                        selectedAssessment.scoreVulnerability,
                        currentDnshStatus
                    );
                    
                    // Filter measures that mitigate the selected hazard, sorted by effectiveness
                    const measuresWithEffectiveness = getMeasuresByHazardSorted(selectedAssessment.hazardTypeId);
                    const relevantMeasures = measuresWithEffectiveness.map(m => m.measure);
                    
                    // Separate measures that can achieve Compliant
                    const compliantMeasures = recommendedMeasures.filter(m => m.canAchieveCompliant);
                    const otherMeasures = recommendedMeasures.filter(m => !m.canAchieveCompliant);
                    
                    return (
                    <div className="mt-6">
                            <h5 className="text-sm font-bold text-white mb-3 flex items-center justify-between font-mono uppercase tracking-wider">
                                <span>MEDIDAS_ADAPTACION_DISPONIBLES</span>
                                <span className="text-xs font-normal text-[#666666] font-mono uppercase">
                                    {relevantMeasures.length} MEDIDA{relevantMeasures.length !== 1 ? 'S' : ''}
                                </span>
                            </h5>
                        <p className="text-xs text-[#666666] mb-4 font-mono uppercase">
                            SELECCIONA_MEDIDAS_PARA_REDUCIR_RIESGO_Y_MEJORAR_ESTADO_DNSH._EL_DIAGNOSTICO_SE_ACTUALIZARA_AUTOMATICAMENTE.
                        </p>
                        
                        {/* Smart Recommendations Section */}
                        {currentDnshStatus !== 'Compliant' && (() => {
                            // Get measure combinations that can achieve Compliant
                            const measureCombinations = findMeasuresForCompliance(
                                selectedAssessment.hazardTypeId,
                                selectedAssessment.riskBand,
                                selectedAssessment.totalScore,
                                selectedAssessment.scoreVulnerability,
                                { maxMeasures: 2, maxCost: Infinity }
                            );
                            const compliantCombinations = measureCombinations.filter(c => c.canAchieveCompliant);
                            
                            return (
                                <>
                                    {/* Single Measures that can achieve Compliant */}
                                    {compliantMeasures.length > 0 && (
                                        <div className="mb-6 p-4 bg-[#00ff88]/10 border-2 border-[#00ff88]/30 rounded-lg">
                                            <div className="flex items-center space-x-2 mb-3">
                                                <CheckCircle size={20} className="text-[#00ff88]" />
                                                <h6 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                                                    RECOMENDACIONES_INTELIGENTES_PARA_ALCANZAR_COMPLIANT
                                                </h6>
                                            </div>
                                            <p className="text-xs text-[#a0a0a0] mb-4 font-mono uppercase">
                                                ESTAS_MEDIDAS_PUEDEN_CAMBIAR_EL_ESTADO_DNSH_DE_{currentDnshStatus.replace(/\s/g, '_')}_A_COMPLIANT:
                                            </p>
                                            <div className="space-y-2">
                                                {compliantMeasures.slice(0, 3).map(({ measure, postMeasuresStatus, postMeasuresRiskBand }) => {
                                                    const isSelected = selectedMeasures[selectedAssessment.hazardTypeId]?.includes(measure.id);
                                                    return (
                                                        <div
                                                            key={measure.id}
                                                            className={`flex items-center justify-between p-3 border-2 rounded-lg transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'border-[#00ff88] bg-[#00ff88]/20'
                                                                    : 'border-[#00ff88]/50 bg-[#0a0a0a] hover:bg-[#00ff88]/10'
                                                            }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleMeasure(selectedAssessment.hazardTypeId, measure.id);
                                                            }}
                                                        >
                                                            <div className="flex items-center space-x-3 flex-1">
                                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                                    isSelected ? 'border-[#00ff88] bg-[#00ff88]' : 'border-[#00ff88]/50'
                                                                }`}>
                                                                    {isSelected && <Check size={14} className="text-[#0a0a0a]" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                                                        <p className="font-semibold text-white text-sm font-mono uppercase tracking-wider">
                                                                            {measure.name.replace(/\s/g, '_')}
                                                                        </p>
                                                                        <span className="px-2 py-0.5 bg-[#00ff88] text-[#0a0a0a] text-[10px] font-bold rounded font-mono uppercase">
                                                                            PUEDE_LOGRAR_COMPLIANT
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center space-x-4 text-xs font-mono uppercase flex-wrap">
                                                                        <span className="text-[#00ff88]">
                                                                            ESTADO_POST: {postMeasuresStatus.replace(/\s/g, '_')}
                                                                        </span>
                                                                        <span className="text-[#666666]">
                                                                            RISK_BAND: {postMeasuresRiskBand.replace(/\s/g, '_')}
                                                                        </span>
                                                                        <span className="text-white">
                                                                            COSTO: €{measure.cost.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Measure Combinations that can achieve Compliant */}
                                    {compliantCombinations.length > 0 && compliantMeasures.length === 0 && (
                                        <div className="mb-6 p-4 bg-[#00a8ff]/10 border-2 border-[#00a8ff]/30 rounded-lg">
                                            <div className="flex items-center space-x-2 mb-3">
                                                <Activity size={20} className="text-[#00a8ff]" />
                                                <h6 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                                                    COMBINACIONES_DE_MEDIDAS_PARA_ALCANZAR_COMPLIANT
                                                </h6>
                                            </div>
                                            <p className="text-xs text-[#a0a0a0] mb-4 font-mono uppercase">
                                                NINGUNA_MEDIDA_INDIVIDUAL_PUEDE_LOGRAR_COMPLIANT._ESTAS_COMBINACIONES_SI_PUEDEN:
                                            </p>
                                            <div className="space-y-2">
                                                {compliantCombinations.slice(0, 3).map((combination, idx) => {
                                                    const allSelected = combination.combination.every(id => 
                                                        selectedMeasures[selectedAssessment.hazardTypeId]?.includes(id)
                                                    );
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`flex items-start justify-between p-3 border-2 rounded-lg transition-all cursor-pointer ${
                                                                allSelected
                                                                    ? 'border-[#00a8ff] bg-[#00a8ff]/20'
                                                                    : 'border-[#00a8ff]/50 bg-[#0a0a0a] hover:bg-[#00a8ff]/10'
                                                            }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Toggle all measures in combination
                                                                combination.combination.forEach(measureId => {
                                                                    toggleMeasure(selectedAssessment.hazardTypeId, measureId);
                                                                });
                                                            }}
                                                        >
                                                            <div className="flex items-start space-x-3 flex-1">
                                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                                    allSelected ? 'border-[#00a8ff] bg-[#00a8ff]' : 'border-[#00a8ff]/50'
                                                                }`}>
                                                                    {allSelected && <Check size={14} className="text-white" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-2 mb-2 flex-wrap">
                                                                        <span className="text-xs font-semibold text-[#00a8ff] font-mono uppercase">
                                                                            COMBINACION_{idx + 1}:
                                                                        </span>
                                                                        {combination.measures.map((m, i) => (
                                                                            <span key={m.id} className="px-2 py-0.5 bg-[#0a0a0a] text-white text-[10px] font-medium rounded border border-[#1a1a1a] font-mono uppercase">
                                                                                {m.name.length > 20 ? m.name.substring(0, 20) + '...' : m.name.replace(/\s/g, '_')}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex items-center space-x-4 text-xs font-mono uppercase flex-wrap">
                                                                        <span className="text-[#00ff88]">
                                                                            ESTADO_POST: {combination.postMeasuresStatus.replace(/\s/g, '_')}
                                                                        </span>
                                                                        <span className="text-[#666666]">
                                                                            RISK_BAND: {combination.postMeasuresRiskBand.replace(/\s/g, '_')}
                                                                        </span>
                                                                        <span className="text-white">
                                                                            COSTO_TOTAL: €{combination.totalCost.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[#00a8ff]">
                                                                            EFECTIVIDAD: {combination.totalEffectiveness.toFixed(0)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                            
                            {relevantMeasures.length === 0 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-sm text-amber-800">
                                        No hay medidas específicas disponibles para este hazard. Considera medidas genéricas o contacta con un especialista.
                                    </p>
                                </div>
                            ) : (
                        <div className="space-y-2">
                                    {relevantMeasures.map(measure => {
                                const isSelected = selectedMeasures[selectedAssessment.hazardTypeId]?.includes(measure.id);
                                        const mitigatedHazards = (measure.mitigatesHazards || measure.applicableHazards || []).map(hId => 
                                            EU_TAXONOMY_HAZARDS.find(h => h.id === hId)
                                        ).filter(Boolean);
                                        
                                        // Check if this measure can achieve Compliant
                                        const measureRecommendation = recommendedMeasures.find(m => m.measure.id === measure.id);
                                        const canAchieveCompliant = measureRecommendation?.canAchieveCompliant || false;
                                        const postMeasuresStatus = measureRecommendation?.postMeasuresStatus;
                                        
                                return (
                                    <div 
                                        key={measure.id} 
                                                className={`flex items-start justify-between p-4 border-2 rounded-lg transition-all ${
                                            isSelected 
                                                        ? 'border-[#00ff88] bg-[#00ff88]/10 shadow-sm' 
                                                        : canAchieveCompliant
                                                        ? 'border-[#00ff88]/50 bg-[#00ff88]/5 hover:border-[#00ff88] hover:bg-[#00ff88]/10'
                                                        : 'border-[#1a1a1a] hover:border-[#00ff88]/30 bg-[#0a0a0a] hover:bg-[#111111]'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMeasure(selectedAssessment.hazardTypeId, measure.id);
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleMeasure(selectedAssessment.hazardTypeId, measure.id);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start space-x-3 flex-1">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                            }`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                                            <p className="font-semibold text-white text-sm font-mono uppercase tracking-wider">{measure.name.replace(/\s/g, '_')}</p>
                                                            {isSelected && (
                                                                <span className="px-2 py-0.5 bg-[#00ff88] text-[#0a0a0a] text-[10px] font-bold rounded font-mono uppercase">
                                                                    ACTIVA
                                                                </span>
                                                            )}
                                                            {canAchieveCompliant && currentDnshStatus !== 'Compliant' && (
                                                                <span className="px-2 py-0.5 bg-[#00ff88]/30 text-[#00ff88] border border-[#00ff88]/50 text-[10px] font-bold rounded font-mono uppercase">
                                                                    ✓ PUEDE_COMPLIANT
                                                                </span>
                                                            )}
                                                            {postMeasuresStatus && postMeasuresStatus !== currentDnshStatus && (
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono uppercase ${
                                                                    postMeasuresStatus === 'Compliant' 
                                                                        ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                                                                        : postMeasuresStatus === 'Conditional'
                                                                        ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                }`}>
                                                                    POST: {postMeasuresStatus.replace(/\s/g, '_')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-[#666666] mb-2 font-mono">{measure.description}</p>
                                                        
                                                        {/* Specific Hazard Mitigation Details */}
                                                        {measure.hazardMitigation && measure.hazardMitigation.length > 0 && (
                                                            <div className="space-y-2 mb-2">
                                                                {measure.hazardMitigation
                                                                    .filter(hm => hm.hazardId === selectedAssessment.hazardTypeId)
                                                                    .map((hm, idx) => (
                                                                        <div key={idx} className="bg-[#00a8ff]/10 border border-[#00a8ff]/30 rounded-lg p-2">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-[10px] font-bold text-white font-mono uppercase tracking-wider">
                                                                                    {hm.hazardCode}: {EU_TAXONOMY_HAZARDS.find(h => h.id === hm.hazardId)?.name.replace(/\s/g, '_') || hm.hazardId}
                                                                                </span>
                                                                                <span className="px-2 py-0.5 bg-[#00ff88] text-[#0a0a0a] text-[9px] font-bold rounded font-mono uppercase">
                                                                                    {hm.effectiveness.overallRiskReduction}%_EFECTIVIDAD
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[10px] text-[#a0a0a0] mb-2 italic font-mono">
                                                                                {hm.mitigationMechanism}
                                                                            </p>
                                                                            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono uppercase">
                                                                                <div>
                                                                                    <span className="text-[#00a8ff] font-semibold">VULNERABILIDAD:</span>
                                                                                    <span className="ml-1 text-white">{hm.effectiveness.vulnerabilityReduction}%</span>
                                            </div>
                                                                                {hm.effectiveness.exposureReduction !== undefined && (
                                                                                    <div>
                                                                                        <span className="text-[#00a8ff] font-semibold">EXPOSICION:</span>
                                                                                        <span className="ml-1 text-white">{hm.effectiveness.exposureReduction}%</span>
                                        </div>
                                                                                )}
                                                                                {hm.effectiveness.intensityReduction !== undefined && hm.effectiveness.intensityReduction > 0 && (
                                                                                    <div>
                                                                                        <span className="text-[#00a8ff] font-semibold">INTENSIDAD:</span>
                                                                                        <span className="ml-1 text-white">{hm.effectiveness.intensityReduction}%</span>
                                        </div>
                                                                                )}
                                    </div>
                                                                            {hm.applicabilityConditions && hm.applicabilityConditions.length > 0 && (
                                                                                <div className="mt-2 pt-2 border-t border-[#00a8ff]/30">
                                                                                    <p className="text-[9px] font-semibold text-[#a0a0a0] mb-1 font-mono uppercase">CONDICIONES_APLICABILIDAD:</p>
                                                                                    <ul className="list-disc list-inside space-y-0.5">
                                                                                        {hm.applicabilityConditions.slice(0, 2).map((condition, i) => (
                                                                                            <li key={i} className="text-[9px] text-[#666666] font-mono">{condition}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                
                                                                {/* Other hazards mitigated */}
                                                                {measure.hazardMitigation.filter(hm => hm.hazardId !== selectedAssessment.hazardTypeId).length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[10px] font-semibold text-slate-500 uppercase">También mitiga:</span>
                                                                        {measure.hazardMitigation
                                                                            .filter(hm => hm.hazardId !== selectedAssessment.hazardTypeId)
                                                                            .slice(0, 3)
                                                                            .map(hm => {
                                                                                const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === hm.hazardId);
                                                                                return (
                                                                                    <span 
                                                                                        key={hm.hazardId}
                                                                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                                                                                        title={`${hazard?.name || hm.hazardId}: ${hm.effectiveness.overallRiskReduction}% efectividad`}
                                                                                    >
                                                                                        {hazard?.name.length > 20 ? hazard.name.substring(0, 20) + '...' : hazard?.name || hm.hazardCode}
                                                                                    </span>
                                );
                            })}
                                                                        {measure.hazardMitigation.filter(hm => hm.hazardId !== selectedAssessment.hazardTypeId).length > 3 && (
                                                                            <span className="text-[10px] text-slate-500">
                                                                                +{measure.hazardMitigation.filter(hm => hm.hazardId !== selectedAssessment.hazardTypeId).length - 3} más
                                                                            </span>
                                                                        )}
                    </div>
                                                                )}
                </div>
                )}
                                                        
                                                        {/* Fallback: Show basic hazard list if no hazardMitigation */}
                                                        {(!measure.hazardMitigation || measure.hazardMitigation.length === 0) && (
                                                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                                                        <span className="text-[10px] font-semibold text-[#666666] uppercase font-mono tracking-wider">MITIGA:</span>
                                                                {mitigatedHazards.map(hazard => (
                                                                    <span 
                                                                        key={hazard!.id}
                                                                        className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase ${
                                                                            hazard!.id === selectedAssessment.hazardTypeId
                                                                                ? 'bg-[#00a8ff]/20 text-[#00a8ff] border border-[#00a8ff]/30'
                                                                                : 'bg-[#1a1a1a] text-[#666666] border border-[#1a1a1a]'
                                                                        }`}
                                                                        title={hazard!.name.replace(/\s/g, '_')}
                                                                    >
                                                                        {hazard!.name.length > 25 ? hazard!.name.substring(0, 25).replace(/\s/g, '_') + '...' : hazard!.name.replace(/\s/g, '_')}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Risk Reduction and Cost */}
                                                        <div className="flex items-center space-x-4 mt-2">
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs font-semibold text-[#00ff88] font-mono uppercase tracking-wider">
                                                                    REDUCCION_RIESGO: {measure.riskReductionPercentage}%
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs text-[#666666] font-mono uppercase tracking-wider">COSTO:</span>
                                                                <span className="text-xs font-mono font-semibold text-white">
                                                                    €{measure.cost.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Environmental Risk Mitigation */}
                                                        {measure.environmentalRiskMitigation && measure.environmentalRiskMitigation.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                                                                <p className="text-[10px] font-semibold text-[#a0a0a0] mb-1 font-mono uppercase tracking-wider">RIESGOS_AMBIENTALES_MITIGADOS:</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {measure.environmentalRiskMitigation.slice(0, 3).map((risk, idx) => (
                                                                        <span 
                                                                            key={idx}
                                                                            className="px-2 py-0.5 bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 rounded text-[9px] font-medium font-mono uppercase"
                                                                            title={`${risk.riskDescription}: ${risk.effectiveness}%_EFECTIVIDAD`}
                                                                        >
                                                                            {risk.riskType.replace('_', '_')} ({risk.effectiveness}%)
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Impact preview */}
                                                        {isSelected && postMeasuresData && (
                                                            <div className="mt-3 pt-3 border-t border-emerald-200">
                                                                <div className="flex items-center space-x-2 text-xs">
                                                                    <span className="text-slate-600">Impacto esperado:</span>
                                                                    <span className={`font-bold ${
                                                                        postMeasuresData.dnshStatus === 'Compliant' 
                                                                            ? 'text-emerald-600' 
                                                                            : postMeasuresData.totalScore < selectedAssessment.totalScore
                                                                            ? 'text-blue-600'
                                                                            : 'text-slate-600'
                                                                    }`}>
                                                                        {postMeasuresData.dnshStatus === 'Compliant' && calculateDnshStatus(selectedAssessment.riskBand) !== 'Compliant'
                                                                            ? '✓ DNSH Compliant alcanzado'
                                                                            : `Score: ${postMeasuresData.totalScore} (${postMeasuresData.riskBand})`
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* No Measures Required */}
                {!selectedAssessment.measuresRequired && (
                <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center space-x-4">
                    <CheckCircleIcon />
                    <div>
                            <h4 className="font-bold text-green-900">DNSH Compliance Cumplido</h4>
                            <p className="text-sm text-green-700">
                                El riesgo ({selectedAssessment.riskBand}) es aceptable para este escenario. 
                                No se requieren medidas estructurales de adaptación. Estado DNSH: <span className="font-bold">{calculateDnshStatus(selectedAssessment.riskBand)}</span>
                            </p>
                        </div>
                    </div>
                )}
                </div>
        </div>
      );
  }

  return (
    <div className={`${embedded ? 'h-full flex flex-col' : 'h-full flex flex-col space-y-4'}`}>
      {/* Header - Only show when not embedded */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className={`p-2 rounded-full transition-colors ${themeClasses.button.ghost}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className={`text-lg font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>CLIMATE_RISK_VULNERABILITY_ASSESSMENT</h2>
            <p className={`text-xs font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>
              OBJECTIVE_02_ADAPTATION • METHODOLOGY_BBVA_CRVA
              {selectedAsset && (
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium border font-mono uppercase transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#00a8ff]/20 text-[#00a8ff] border-[#00a8ff]/30'
                    : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  EVALUANDO: {selectedAsset.name.replace(/\s/g, '_')}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      )}
      
      {/* Asset Filter Indicator - Show when embedded and asset is selected */}
      {embedded && selectedAsset && (
        <div className={`border-l-4 p-3 mb-4 rounded-r-lg flex-shrink-0 transition-colors ${
          theme === 'dark'
            ? 'bg-[#00a8ff]/10 border-[#00a8ff]'
            : 'bg-blue-50 border-blue-400'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info size={16} className={theme === 'dark' ? 'text-[#00a8ff]' : 'text-blue-600'} />
              <div>
                <p className={`text-sm font-semibold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>EVALUACION_FILTRADA_POR_ASSET</p>
                <p className={`text-xs font-mono uppercase transition-colors ${themeClasses.text.secondary}`}>MOSTRANDO_ANALISIS_RIESGO_SOLO_PARA: <strong className={themeClasses.text.primary}>{selectedAsset.name.replace(/\s/g, '_')}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${embedded ? 'flex-1 min-h-0' : 'flex-1'} grid grid-cols-12 gap-6 min-h-0`}>
          
          {/* LEFT: Hazard List */}
          <div className={`col-span-12 ${embedded ? 'lg:col-span-4' : 'lg:col-span-4'} rounded-xl border flex flex-col overflow-hidden transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default} ${embedded ? 'h-full' : ''}`}>
             {/* Configuration Panel (Step 1) */}
             <div className={`p-4 border-b space-y-3 transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                <h3 className={`text-xs font-bold uppercase flex items-center font-mono tracking-wider transition-colors ${themeClasses.text.tertiary}`}>
                    <RefreshCw size={12} className="mr-1" /> 1. CLIMATE_SCENARIOS_TIME_HORIZON
                </h3>
                
                {/* Scenario Selection */}
                    <div>
                    <label className={`text-[10px] font-bold uppercase block mb-2 font-mono tracking-wider transition-colors ${themeClasses.text.tertiary}`}>CLIMATE_SCENARIO_SSP</label>
                    <div className="space-y-2">
                        {CLIMATE_SCENARIOS.map(scenario => (
                            <button
                                key={scenario.id}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedScenario(scenario.id);
                                }}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer active:scale-[0.98] ${
                                    selectedScenario === scenario.id
                                        ? scenario.id === ClimateScenario.SSP1_26 
                                          ? theme === 'dark'
                                            ? 'border-[#00ff88] bg-[#00ff88]/10 shadow-lg shadow-[#00ff88]/10'
                                            : 'border-green-500 bg-green-50 shadow-lg shadow-green-500/10'
                                          : scenario.id === ClimateScenario.SSP2_45
                                          ? theme === 'dark'
                                            ? 'border-[#00a8ff] bg-[#00a8ff]/10 shadow-lg shadow-[#00a8ff]/10'
                                            : 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                                          : theme === 'dark'
                                            ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                                            : 'border-red-500 bg-red-50 shadow-lg shadow-red-500/10'
                                        : `${themeClasses.bg.secondary} ${themeClasses.border.default} ${
                                            theme === 'dark'
                                              ? 'hover:border-[#00ff88]/20 hover:bg-[#111111]'
                                              : 'hover:border-[#0066cc]/20 hover:bg-gray-50'
                                          } active:${themeClasses.bg.secondary}`
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <div 
                                                className={`w-3 h-3 rounded-full border-2 shadow-sm transition-colors ${
                                                  theme === 'dark' ? 'border-[#0a0a0a]' : 'border-white'
                                                }`}
                                                style={{ backgroundColor: scenario.color }}
                                            />
                                            <span className={`text-xs font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>{scenario.label}</span>
                                        </div>
                                        <p className={`text-[10px] mt-1 font-mono transition-colors ${themeClasses.text.tertiary}`}>{scenario.description}</p>
                                        <div className={`mt-2 flex items-center space-x-3 text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>
                                            <span>ΔT_2050: +{scenario.temperatureIncrease2050}°C</span>
                                            <span>SLR_2050: +{scenario.seaLevelRise2050}CM</span>
                                        </div>
                                    </div>
                                    {selectedScenario === scenario.id && (
                                        <CheckCircle size={16} className={`flex-shrink-0 ml-2 transition-colors ${
                                          theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'
                                        }`} />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Horizon */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase block mb-1 font-mono tracking-wider transition-colors ${themeClasses.text.tertiary}`}>TIME_HORIZON</label>
                        <select 
                            value={selectedHorizon}
                        onChange={(e) => setSelectedHorizon(e.target.value as '2030' | '2050' | '2100')}
                            className={`text-xs rounded p-2 w-full font-medium font-mono uppercase transition-colors ${themeClasses.inputClass}`}
                        >
                        <option value="2030">2030_SHORT_TERM</option>
                        <option value="2050">2050_MID_TERM</option>
                        <option value="2100">2100_LONG_TERM</option>
                        </select>
                </div>

                {/* Scenario Info */}
                {selectedScenarioConfig && (
                    <div className={`mt-3 p-3 border rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-[#00a8ff]/10 border-[#00a8ff]/30'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                        <div className="flex items-start space-x-2">
                            <Info size={14} className={`mt-0.5 flex-shrink-0 transition-colors ${
                              theme === 'dark' ? 'text-[#00a8ff]' : 'text-blue-600'
                            }`} />
                            <div className={`text-[10px] font-mono uppercase tracking-wider transition-colors ${themeClasses.text.secondary}`}>
                                <p className={`font-semibold mb-1 transition-colors ${themeClasses.text.primary}`}>PROJECTIONS_FOR_{selectedHorizon}:</p>
                                <ul className={`space-y-1 list-disc list-inside transition-colors ${themeClasses.text.secondary}`}>
                                    <li>TEMPERATURE: +{selectedHorizon === '2030' ? (selectedScenarioConfig.temperatureIncrease2050 * 0.6).toFixed(1) : selectedHorizon === '2050' ? selectedScenarioConfig.temperatureIncrease2050 : selectedScenarioConfig.temperatureIncrease2100}°C</li>
                                    <li>SEA_LEVEL_RISE: +{selectedHorizon === '2030' ? (selectedScenarioConfig.seaLevelRise2050 * 0.6).toFixed(0) : selectedHorizon === '2050' ? selectedScenarioConfig.seaLevelRise2050 : selectedScenarioConfig.seaLevelRise2100}CM</li>
                                    <li>PRECIPITATION: {selectedScenarioConfig.precipitationChange2050 > 0 ? '+' : ''}{selectedScenarioConfig.precipitationChange2050}%_VARIES_BY_REGION</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
             </div>

             <div className={`px-4 py-2 border-b transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold uppercase font-mono tracking-wider transition-colors ${themeClasses.text.tertiary}`}>HAZARD_SCREENING</span>
                  <span className={`text-[10px] font-mono uppercase transition-colors ${themeClasses.text.primary}`}>
                    {(() => {
                      const inScopeCount = assessments.filter(a => {
                        const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === a.hazardTypeId);
                        if (!hazard || !selectedAsset) return true;
                        return selectedAsset.attributes.adaptationHazardScope?.[hazard.id] !== 'Out of Scope';
                      }).length;
                      return `${inScopeCount}_EN_SCOPE`;
                    })()}
                  </span>
                </div>
                <div className={`text-[10px] italic font-mono uppercase transition-colors ${themeClasses.text.tertiary}`}>
                  FILTRADO_POR_THRESHOLDS_Y_METRICAS_DEL_ESCENARIO {selectedScenarioConfig?.label.replace(/\s/g, '_')}
                  {selectedAsset && (
                    <span className={`ml-2 transition-colors ${themeClasses.text.tertiary}`}>
                      • ASSET: {selectedAsset.name.replace(/\s/g, '_')}
                    </span>
                  )}
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff88]"></div>
                    </div>
                )}
                {(() => {
                  // Separate hazards into In Scope and Out of Scope
                  const inScopeAssessments: AdaptationAssessment[] = [];
                  const outOfScopeHazards: Array<{ hazard: typeof EU_TAXONOMY_HAZARDS[0]; assessment?: AdaptationAssessment }> = [];
                  
                  assessments.forEach(assessment => {
                    const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === assessment.hazardTypeId);
                    if (!hazard) return;
                    
                    // Check scope for selected asset
                    if (selectedAsset) {
                      const scope = selectedAsset.attributes.adaptationHazardScope?.[hazard.id];
                      if (scope === 'Out of Scope') {
                        // Add to out of scope list (without DNSH status)
                        outOfScopeHazards.push({ hazard, assessment });
                        return;
                      }
                      if (scope === 'In Scope') {
                        inScopeAssessments.push(assessment);
                        return;
                      }
                    }
                    
                    // If no asset selected or scope not defined, consider in scope
                    inScopeAssessments.push(assessment);
                  });
                  
                  // Also add hazards that are explicitly out of scope but don't have assessments
                  if (selectedAsset) {
                    EU_TAXONOMY_HAZARDS.forEach(hazard => {
                      const scope = selectedAsset.attributes.adaptationHazardScope?.[hazard.id];
                      if (scope === 'Out of Scope' && !outOfScopeHazards.some(h => h.hazard.id === hazard.id)) {
                        outOfScopeHazards.push({ hazard });
                      }
                    });
                  }
                  
                  return (
                    <>
                      {/* In Scope Hazards */}
                      {inScopeAssessments.map(assessment => {
                  const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === assessment.hazardTypeId);
                  if (!hazard) return null;
                  const isSelected = selectedHazardId === hazard.id;
                  const isVisible = visibleHazards[hazard.id] !== undefined;
                  const opacity = visibleHazards[hazard.id] || 0.5;
                        
                        // Check if hazard has measures applied
                        const hasMeasures = selectedMeasures[hazard.id] && selectedMeasures[hazard.id].length > 0;
                        
                        // Get DNSH status for this hazard
                        const dnshStatus = calculateDnshStatus(assessment.riskBand);
                        const postMeasuresStatus = hasMeasures 
                          ? calculatePostMeasuresStatus(assessment, selectedMeasures[hazard.id] || []).dnshStatus
                          : null;

                  return (
                    <div 
                      key={hazard.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedHazardId(hazard.id);
                      }}
                      className={`px-4 py-3 border-b border-[#1a1a1a] cursor-pointer transition-all flex flex-col active:scale-[0.98] ${
                        isSelected ? 'bg-[#00a8ff]/10 border-l-4 border-l-[#00a8ff] shadow-sm shadow-[#00a8ff]/10' : 'hover:bg-[#111111] border-l-4 border-l-transparent hover:border-l-[#00a8ff]/20 active:bg-[#0a0a0a]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                             {/* Scope Indicator - Always green for In Scope hazards */}
                             {selectedAsset && (
                                 <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#00ff88]" title="EN_SCOPE_PARA_ESTE_ASSET" />
                             )}
                             
                             {/* Toggle Map Layer Button */}
                             <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleVisibility(e, hazard.id);
                                }}
                                className={`p-1.5 rounded hover:bg-[#111111] transition-all flex-shrink-0 cursor-pointer active:scale-[0.90] ${isVisible ? 'text-[#00a8ff]' : 'text-[#666666] hover:text-[#00a8ff]'}`}
                                title={isVisible ? "HIDE_FROM_MAP" : "SHOW_ON_MAP"}
                             >
                                 {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                             </button>

                             <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 flex-wrap">
                                    <p className={`text-sm font-medium break-words font-mono uppercase tracking-wider ${isSelected ? 'text-white' : 'text-[#a0a0a0]'}`} title={hazard.name}>{hazard.name.replace(/\s/g, '_')}</p>
                                    {hasMeasures && (
                                        <span className="px-1.5 py-0.5 bg-[#00ff88]/20 text-[#00ff88] text-[10px] font-bold rounded border border-[#00ff88]/30 font-mono uppercase">
                                            {selectedMeasures[hazard.id]?.length}M
                                        </span>
                                    )}
                                    {postMeasuresStatus === 'Compliant' && dnshStatus !== 'Compliant' && (
                                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded">
                                            ✓
                                        </span>
                                    )}
                                    {(() => {
                                      const thresholdCheck = checkHazardThreshold(hazard, selectedScenario, selectedHorizon, selectedAsset || undefined);
                                      if (thresholdCheck.exceeds && hazard.threshold) {
                                        return (
                                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded" title={`Threshold excedido: ${thresholdCheck.value.toFixed(2)} ${hazard.threshold.unit} > ${thresholdCheck.threshold} ${hazard.threshold.unit}`}>
                                            ⚠
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                </div>
                                <div className="flex items-center space-x-2 mt-0.5 flex-wrap">
                                    <p className={`text-xs font-mono uppercase transition-colors ${themeClasses.text.tertiary}`}>SCORE: {assessment.totalScore}</p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold font-mono uppercase tracking-wider ${
                                        dnshStatus === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                        dnshStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                                    }`}>
                                        {dnshStatus.replace(/\s/g, '_')}
                                    </span>
                                    {postMeasuresStatus && postMeasuresStatus !== dnshStatus && (
                                        <>
                                            <span className="text-xs text-[#666666]">→</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold font-mono uppercase tracking-wider ${
                                                postMeasuresStatus === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                                postMeasuresStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                                            }`}>
                                                {postMeasuresStatus.replace(/\s/g, '_')}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {hazard.threshold && (() => {
                                  const thresholdCheck = checkHazardThreshold(hazard, selectedScenario, selectedHorizon, selectedAsset || undefined);
                                  return (
                                    <div className="mt-1 text-[9px] text-[#666666] font-mono uppercase">
                                      THRESHOLD: {hazard.threshold.thresholdValue}{hazard.threshold.unit} | 
                                      ACTUAL: {thresholdCheck.value.toFixed(2)}{hazard.threshold.unit} 
                                      {thresholdCheck.exceeds ? (
                                        <span className="text-red-400 font-semibold ml-1">EXCEDIDO</span>
                                      ) : (
                                        <span className="text-[#00ff88] ml-1">OK</span>
                                      )}
                                    </div>
                                  );
                                })()}
                             </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            assessment.riskBand === 'Very High' ? 'bg-red-500 shadow-red-500/20' : 
                            assessment.riskBand === 'High' ? 'bg-orange-500 shadow-orange-500/20' : 
                            assessment.riskBand === 'Moderate' ? 'bg-[#ffb800] shadow-[#ffb800]/20' : 'bg-[#00ff88] shadow-[#00ff88]/20'
                        } shadow-sm border border-[#0a0a0a] ml-2`} title={`RISK_BAND: ${assessment.riskBand.replace(/\s/g, '_')}`}></div>
                      </div>
                      
                      {/* Opacity Slider (Only if visible) */}
                      {isVisible && (
                          <div className="flex items-center space-x-2 mt-2 ml-9">
                              <span className="text-[10px] text-[#666666] font-medium font-mono uppercase">OPACITY</span>
                              <input 
                                  type="range" 
                                  min="0.1" 
                                  max="1" 
                                  step="0.1" 
                                  value={opacity}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => updateOpacity(hazard.id, parseFloat(e.target.value))}
                                  className="w-24 h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer"
                              />
                          </div>
                      )}
                      
                    </div>
                  );
                })}
                
                {/* Out of Scope Hazards Section - Separated at bottom, gray, no DNSH status */}
                {selectedAsset && outOfScopeHazards.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[#1a1a1a] border-t-2 border-[#1a1a1a] border-b border-[#1a1a1a] opacity-60">
                      <span className="text-xs font-bold text-[#666666] uppercase font-mono tracking-wider">
                        FUERA_DE_SCOPE ({outOfScopeHazards.length})
                      </span>
                      <p className="text-[10px] text-[#666666] mt-0.5 font-mono uppercase">
                        ESTOS_HAZARDS_NO_APLICAN_EVALUACION_DNSH_PARA_ESTE_ASSET
                      </p>
                    </div>
                    {outOfScopeHazards.map(({ hazard, assessment }) => {
                      const isSelected = selectedHazardId === hazard.id;
                      const isVisible = visibleHazards[hazard.id] !== undefined;
                      const opacity = visibleHazards[hazard.id] || 0.5;
                      
                      return (
                        <div 
                          key={hazard.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedHazardId(hazard.id);
                          }}
                          className={`px-4 py-3 border-b border-[#1a1a1a] cursor-pointer transition-all flex flex-col bg-[#0a0a0a] opacity-60 active:scale-[0.98] ${
                            isSelected ? 'bg-[#111111] border-l-4 border-l-[#666666]' : 'hover:bg-[#111111] border-l-4 border-l-transparent hover:border-l-[#666666]/30 active:bg-[#0a0a0a]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                 {/* Scope Indicator - Gray for Out of Scope */}
                                 <div className="w-2 h-2 rounded-full bg-[#666666] flex-shrink-0" title="FUERA_DE_SCOPE" />
                                 
                                 {/* Toggle Map Layer Button */}
                                 <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleVisibility(e, hazard.id);
                                    }}
                                    className={`p-1.5 rounded hover:bg-[#111111] transition-all flex-shrink-0 cursor-pointer active:scale-[0.90] ${isVisible ? 'text-[#666666]' : 'text-[#666666] opacity-50 hover:opacity-100'}`}
                                    title={isVisible ? "HIDE_FROM_MAP" : "SHOW_ON_MAP"}
                                 >
                                     {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                 </button>

                                 <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium break-words text-[#666666] font-mono uppercase tracking-wider`} title={hazard.name}>{hazard.name.replace(/\s/g, '_')}</p>
                                    <div className="mt-1 text-[10px] text-[#666666] italic font-mono uppercase">
                                        FUERA_DE_SCOPE_PARA {selectedAsset.name.replace(/\s/g, '_')}
                                    </div>
                                 </div>
                            </div>
                            {/* No DNSH status indicator - just a gray dot if assessment exists */}
                            {assessment && (
                              <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#666666] shadow-sm border border-[#0a0a0a] ml-2" title="INFO_REFERENCIA_NO_APLICA_DNSH"></div>
                            )}
                          </div>
                          
                          {/* Opacity Slider (Only if visible) */}
                          {isVisible && (
                              <div className="flex items-center space-x-2 mt-2 ml-9">
                                  <span className="text-[10px] text-[#666666] font-medium font-mono uppercase">OPACITY</span>
                                  <input 
                                      type="range" 
                                      min="0.1" 
                                      max="1" 
                                      step="0.1" 
                                      value={opacity}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => updateOpacity(hazard.id, parseFloat(e.target.value))}
                                      className="w-24 h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
                      </>
                  );
                })()}
             </div>
          </div>

          {/* RIGHT: Detail View */}
          <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
             <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-0">
               {renderStepContent()}
             </div>
             
             {/* Map Context */}
             <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] flex-shrink-0 flex flex-col mt-4" style={{ minHeight: '400px', maxHeight: '500px' }}>
                <div className="p-4 border-b border-[#1a1a1a] bg-[#111111] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <h4 className="text-xs font-bold text-[#666666] uppercase font-mono tracking-wider">SPATIAL_CONTEXT</h4>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-[#1a1a1a] text-[#666666] font-semibold font-mono uppercase">
                            {activeMapLayers.length} LAYERS
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold font-mono uppercase tracking-wider">
                        <span 
                            className="px-3 py-1 rounded-lg border"
                            style={{
                                backgroundColor: selectedScenarioConfig?.color ? `${selectedScenarioConfig.color}20` : '#0a0a0a',
                                color: selectedScenarioConfig?.color || '#00a8ff',
                                borderColor: selectedScenarioConfig?.color || '#00a8ff'
                            }}
                        >
                            {selectedScenarioConfig?.label || selectedScenario}
                    </span>
                        <span className="px-3 py-1 rounded-lg bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 font-mono uppercase">HORIZON: {selectedHorizon}</span>
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
                    <div className="lg:col-span-9 col-span-12 relative" style={{ minHeight: '360px' }}>
                        <MapViewer 
                            assets={assetsToEvaluate} 
                            activeLayers={activeMapLayers} 
                            showControls 
                            statusMeta={{ 
                                title: 'CRVA Spatial Overview',
                                scenario: selectedScenario,
                                horizon: selectedHorizon
                            }}
                        />
                    </div>
                    <div className="lg:col-span-3 col-span-12 space-y-3 overflow-y-auto">
                        <RiskBandLegend />
                        <ActiveHazardLegend activeLayers={activeMapLayers} />
                    </div>
                </div>
             </div>
          </div>

        </div>
    </div>
  );
};

const ScoreCard = ({ label, score, description, color }: any) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; progress: string }> = {
        blue: { bg: 'bg-[#00a8ff]/10', text: 'text-[#00a8ff]', border: 'border-[#00a8ff]/30', progress: 'bg-[#00a8ff]' },
        indigo: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', progress: 'bg-purple-500' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', progress: 'bg-purple-500' },
    };
    const colors = colorMap[color] || { bg: 'bg-[#00a8ff]/10', text: 'text-[#00a8ff]', border: 'border-[#00a8ff]/30', progress: 'bg-[#00a8ff]' };
    
    return (
        <div className={`p-4 rounded-lg ${colors.bg} border ${colors.border}`}>
        <div className="flex justify-between items-center mb-2">
                <span className={`text-sm font-bold ${colors.text} font-mono uppercase tracking-wider`}>{label.replace(/\s/g, '_')}</span>
                <span className={`text-xl font-bold ${colors.text} font-mono`}>{score}</span>
        </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-2 mb-2">
                <div className={`${colors.progress} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${(score/5)*100}%` }}></div>
        </div>
            <p className={`text-xs ${colors.text} font-mono uppercase tracking-wider`}>{description.replace(/\s/g, '_')}</p>
    </div>
);
};

const CheckCircleIcon = () => (
    <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 flex items-center justify-center text-[#00ff88] flex-shrink-0 border border-[#00ff88]/30">
        <Check size={20} />
    </div>
);

const RiskBandLegend = () => {
    const bands = [
        { label: 'Very High', color: 'bg-red-500' },
        { label: 'High', color: 'bg-orange-500' },
        { label: 'Moderate', color: 'bg-[#ffb800]' },
        { label: 'Low', color: 'bg-[#00ff88]' },
    ];
    return (
        <div className="border border-[#1a1a1a] rounded-lg p-3 bg-[#111111]">
            <p className="text-xs font-bold text-[#666666] uppercase mb-2 font-mono tracking-wider">RISK_BANDS</p>
            <div className="space-y-2">
                {bands.map(b => (
                    <div key={b.label} className="flex items-center gap-2 text-sm text-white font-mono uppercase tracking-wider">
                        <span className={`w-3 h-3 rounded-full ${b.color}`}></span>
                        {b.label.replace(/\s/g, '_')}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ActiveHazardLegend = ({ activeLayers }: { activeLayers: ActiveLayer[] }) => {
    if (activeLayers.length === 0) {
        return (
            <div className="border border-dashed border-[#1a1a1a] rounded-lg p-3 text-sm text-[#666666] bg-[#0a0a0a] font-mono uppercase tracking-wider">
                NO_HAZARD_LAYERS_ACTIVE._USA_EL_OJO_EN_LA_LISTA_PARA_ACTIVAR_CAPAS.
            </div>
        );
    }
    return (
        <div className="border border-[#1a1a1a] rounded-lg p-3 bg-[#0a0a0a]">
            <p className="text-xs font-bold text-[#666666] uppercase mb-2 font-mono tracking-wider">ACTIVE_LAYERS</p>
            <div className="space-y-2">
                {activeLayers.map(layer => (
                    <div key={layer.hazard.id} className="flex items-center justify-between text-sm text-white font-mono uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: hazardColorForId(layer.hazard.id) }}></span>
                            <span className="truncate">{layer.hazard.name.replace(/\s/g, '_')}</span>
                        </div>
                        <span className="text-[11px] text-[#666666] font-mono uppercase">OPACITY_{Math.round(layer.opacity * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DnshAdaptationPage;
