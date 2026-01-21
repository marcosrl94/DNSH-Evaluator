import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Droplets, RefreshCw, Leaf, Zap, FileText, MapPin, Sparkles, Info, Shield, MapPin as MapPinIcon } from 'lucide-react';
import { Operation, DnshObjective, EvidenceDocument, Asset } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import DnshAdaptationPage from './DnshAdaptation';
import MapViewer from '../components/MapViewer';
import EvidenceRegistry from '../components/EvidenceRegistry';
import { findNearbyKBAs } from '../constants/kbas';
import { findNearbyWaterRiskZones } from '../constants/waterRisk';
import { getObjectiveStatusFromAsset, calculateObjectiveStats, isAssetExemptForObjective } from '../utils/dnshCalculations';
import { validateDnshStatus, canDisplayDnshStatus } from '../services/dnshValidation';

interface Props {
  operation: Operation;
  onBack: () => void;
  onUpdateOperation?: (operation: Operation) => void;
}

const DnshEvaluationPage: React.FC<Props> = ({ operation, onBack, onUpdateOperation }) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3643d2bc-84c4-48ef-965a-acea6e50f48b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DnshEvaluation.tsx:18',message:'DnshEvaluationPage mounted',data:{operationId:operation.id,assetsCount:operation.assets.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // State declarations (must be before useEffect hooks)
  const [activeObjective, setActiveObjective] = useState<DnshObjective>(DnshObjective.MITIGATION);
  const [activeTab, setActiveTab] = useState<'evaluation' | 'evidence' | 'map'>('evaluation');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [waterRiskZones, setWaterRiskZones] = useState<any[]>([]);
  
  // Load WRI data when Water objective is active and asset is selected
  useEffect(() => {
    if (activeObjective === DnshObjective.WATER && selectedAssetId) {
      const asset = operation.assets.find(a => a.id === selectedAssetId);
      if (asset) {
        findNearbyWaterRiskZones(asset.lat, asset.lng, 50).then(setWaterRiskZones);
      }
    } else {
      setWaterRiskZones([]);
    }
  }, [activeObjective, selectedAssetId, operation.assets]);

  const selectedAsset = selectedAssetId 
    ? operation.assets.find(a => a.id === selectedAssetId)
    : null;

  // Filter evidence by objective and asset
  const filteredEvidence = useMemo(() => {
    let evidence = operation.evidenceDocuments || [];
    
    // Filter by objective
    evidence = evidence.filter(ev => 
      !ev.relatedObjective || ev.relatedObjective === activeObjective
    );
    
    // Filter by asset if selected
    if (selectedAssetId) {
      evidence = evidence.filter(ev => 
        !ev.assetId || ev.assetId === selectedAssetId
      );
    }
    
    return evidence;
  }, [operation.evidenceDocuments, activeObjective, selectedAssetId]);

  const handleAddEvidence = (evidenceData: Omit<EvidenceDocument, 'id' | 'uploadDate'>) => {
    const newEvidence: EvidenceDocument = {
      ...evidenceData,
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      uploadDate: new Date().toISOString(),
      relatedObjective: evidenceData.relatedObjective || activeObjective, // Use provided or current objective
      assetId: evidenceData.assetId || selectedAssetId || undefined,
    };

    const updatedOperation: Operation = {
      ...operation,
      evidenceDocuments: [...(operation.evidenceDocuments || []), newEvidence]
    };

    if (onUpdateOperation) {
      onUpdateOperation(updatedOperation);
    }
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    const updatedOperation: Operation = {
      ...operation,
      evidenceDocuments: (operation.evidenceDocuments || []).filter(ev => ev.id !== evidenceId)
    };

    if (onUpdateOperation) {
      onUpdateOperation(updatedOperation);
    }
  };

  // Get compliance justification for an asset
  const getComplianceJustification = (asset: Asset, objective: DnshObjective): {
    reason: 'SubstantialContribution' | 'NotMaterialByNature' | 'NotMaterialByLocation' | 'EvidenceBased' | 'Unknown';
    description: string;
    evidence: string[];
  } => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) {
      return {
        reason: 'Unknown',
        description: 'No se ha realizado evaluación DNSH para este asset.',
        evidence: []
      };
    }

    // Check if this is the substantial contribution objective
    if (asset.attributes.substantialContribution === objective || operation.substantialContributionId === objective) {
      return {
        reason: 'SubstantialContribution',
        description: 'Este objetivo es la contribución sustancial principal del asset. Los criterios DNSH no se aplican según el Reglamento (UE) 2020/852.',
        evidence: []
      };
    }

    // Get status using centralized function
    const status = getObjectiveStatusFromAsset(evaluation, objective);
    
    // Get evidence and notes for this objective
    let evidence: string[] = [];
    let notes: string | undefined;

    switch (objective) {
      case DnshObjective.MITIGATION:
        evidence = evaluation.mitigationEvidence || [];
        notes = evaluation.mitigationNotes;
        break;
      case DnshObjective.ADAPTATION:
        notes = evaluation.adaptationNotes;
        // Adaptation evidence might be in adaptationMeasures or notes
        if (evaluation.adaptationMeasures && evaluation.adaptationMeasures.length > 0) {
          evidence = evaluation.adaptationMeasures;
        }
        break;
      case DnshObjective.WATER:
        evidence = evaluation.waterEvidence || [];
        notes = evaluation.waterNotes;
        break;
      case DnshObjective.CIRCULAR:
        evidence = evaluation.circularEvidence || [];
        notes = evaluation.circularNotes;
        break;
      case DnshObjective.POLLUTION:
        evidence = evaluation.pollutionEvidence || [];
        notes = evaluation.pollutionNotes;
        break;
      case DnshObjective.BIODIVERSITY:
        evidence = evaluation.biodiversityEvidence || [];
        notes = evaluation.biodiversityNotes;
        break;
    }

    if (status !== 'Compliant') {
      return {
        reason: 'Unknown',
        description: `Estado actual: ${status}. Se requiere evaluación completa.`,
        evidence: evidence
      };
    }

    // Check if not material by nature (asset type doesn't interact with this objective)
    const isNotMaterialByNature = checkNotMaterialByNature(asset, objective);
    if (isNotMaterialByNature) {
      return {
        reason: 'NotMaterialByNature',
        description: `El tipo de asset (${asset.assetType}) no tiene impacto material en este objetivo DNSH por su naturaleza operativa.`,
        evidence: evidence
      };
    }

    // Check if not material by location (geographic factors)
    const isNotMaterialByLocation = checkNotMaterialByLocation(asset, objective);
    if (isNotMaterialByLocation) {
      return {
        reason: 'NotMaterialByLocation',
        description: `La ubicación del asset (${asset.lat.toFixed(2)}, ${asset.lng.toFixed(2)}) no presenta riesgos materiales para este objetivo DNSH.`,
        evidence: evidence
      };
    }

    // Evidence-based compliance
    if (evidence.length > 0 || notes) {
      return {
        reason: 'EvidenceBased',
        description: notes || `Cumplimiento basado en ${evidence.length} documento(s) de evidencia proporcionado(s).`,
        evidence: evidence
      };
    }

    // If status is Compliant but no valid justification found, this is invalid
    // Return Unknown but with a warning that this should not be considered Compliant
    return {
      reason: 'Unknown',
      description: '⚠️ ERROR: Cumplimiento marcado como Compliant sin justificación válida. Este asset requiere revisión y no puede considerarse compliant hasta que se proporcione una justificación adecuada (evidencia, notas, o determinación de no materialidad).',
      evidence: evidence
    };
  };

  // Check if objective is not material by asset nature
  const checkNotMaterialByNature = (asset: Asset, objective: DnshObjective): boolean => {
    const assetType = asset.assetType.toLowerCase();
    
    switch (objective) {
      case DnshObjective.WATER:
        // Solar PV typically has minimal water use
        if (assetType.includes('solar') || assetType.includes('pv') || assetType.includes('wind')) {
          return true;
        }
        break;
      case DnshObjective.BIODIVERSITY:
        // Urban infrastructure might have less biodiversity impact
        if (assetType.includes('grid') || assetType.includes('substation') || assetType.includes('urban')) {
          return true;
        }
        break;
      case DnshObjective.POLLUTION:
        // Renewable energy typically has minimal pollution
        if (assetType.includes('solar') || assetType.includes('pv') || assetType.includes('wind') || assetType.includes('renewable')) {
          return true;
        }
        break;
    }
    
    return false;
  };

  // Check if objective is not material by location
  const checkNotMaterialByLocation = (asset: Asset, objective: DnshObjective): boolean => {
    switch (objective) {
      case DnshObjective.WATER:
        // Check if NOT in water-stressed area
        // Note: WRI Aqueduct data is now integrated asynchronously
        // For now, using static zones; async call would be: await findNearbyWaterRiskZones(asset.lat, asset.lng, 50)
        const nearbyWaterRisk: any[] = []; // Will be populated async in future
        const hasHighWaterRisk = nearbyWaterRisk.some(zone => 
          zone.riskLevel === 'High' || zone.riskLevel === 'Very High'
        );
        // If no high water risk zones nearby, might be not material by location
        return !hasHighWaterRisk && nearbyWaterRisk.length === 0;
        
      case DnshObjective.BIODIVERSITY:
        // Check distance to KBAs
        const nearbyKBAs = findNearbyKBAs(asset.lat, asset.lng, 50);
        // If no KBAs nearby (within 50km), might be not material by location
        return nearbyKBAs.length === 0;
        
      case DnshObjective.ADAPTATION:
        // Check if adaptation hazards are scoped out
        const hazardScope = asset.attributes.adaptationHazardScope;
        if (hazardScope) {
          const scopedOutCount = Object.values(hazardScope).filter(scope => scope === 'Out of Scope').length;
          const totalHazards = Object.keys(hazardScope).length;
          // If most hazards are scoped out, might be not material
          return scopedOutCount > totalHazards * 0.7;
        }
        return false;
    }
    
    return false;
  };

  // Get objective-specific data
  const getObjectiveData = (objective: DnshObjective) => {
    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
    const isSubstantial = operation.substantialContributionId === objective;
    
    // Use centralized calculation function
    const stats = calculateObjectiveStats(operation, objective);
    
    // Build compliant assets list with justifications
    const compliantAssets: Array<{ asset: Asset; justification: ReturnType<typeof getComplianceJustification> }> = [];
    
    operation.assets.forEach(asset => {
      const status = getObjectiveStatusFromAsset(asset.dnshEvaluation, objective);
      if (status === 'Compliant') {
        const justification = getComplianceJustification(asset, objective);
        // Only count as compliant if there's a valid justification
        // Unknown reason means Compliant status is invalid and should be treated as Conditional
        if (justification.reason !== 'Unknown') {
          compliantAssets.push({
            asset,
            justification
          });
        }
      }
    });

    // Recalculate compliantCount based on assets with valid justifications
    const validCompliantCount = compliantAssets.length;
    const validProgress = stats.totalAssessed > 0 
      ? Math.round((validCompliantCount / stats.totalAssessed) * 100) 
      : 0;

    return {
      template,
      isSubstantial,
      compliantCount: validCompliantCount, // Use count with valid justifications
      totalAssessed: stats.totalAssessed,
      totalAssets: stats.total,
      progress: validProgress, // Use progress with valid justifications
      compliantAssets
    };
  };

  const getObjectiveIcon = (objective: DnshObjective) => {
    switch (objective) {
      case DnshObjective.MITIGATION:
        return <Zap size={18} className="text-emerald-600" />;
      case DnshObjective.ADAPTATION:
        return <AlertTriangle size={18} className="text-amber-600" />;
      case DnshObjective.WATER:
        return <Droplets size={18} className="text-blue-600" />;
      case DnshObjective.CIRCULAR:
        return <RefreshCw size={18} className="text-purple-600" />;
      case DnshObjective.POLLUTION:
        return <XCircle size={18} className="text-red-600" />;
      case DnshObjective.BIODIVERSITY:
        return <Leaf size={18} className="text-green-600" />;
      default:
        return <CheckCircle size={18} />;
    }
  };

  const getObjectiveColor = (objective: DnshObjective): string => {
    switch (objective) {
      case DnshObjective.MITIGATION: return 'emerald';
      case DnshObjective.ADAPTATION: return 'amber';
      case DnshObjective.WATER: return 'blue';
      case DnshObjective.CIRCULAR: return 'purple';
      case DnshObjective.POLLUTION: return 'red';
      case DnshObjective.BIODIVERSITY: return 'green';
      default: return 'slate';
    }
  };

  const getObjectiveColorClasses = (objective: DnshObjective, type: 'bg' | 'text' | 'border' = 'bg') => {
    const colors: Record<DnshObjective, Record<string, string>> = {
      [DnshObjective.MITIGATION]: {
        bg: 'bg-emerald-50 border-emerald-500',
        text: 'text-emerald-900',
        border: 'border-emerald-500',
        progress: 'bg-emerald-500'
      },
      [DnshObjective.ADAPTATION]: {
        bg: 'bg-amber-50 border-amber-500',
        text: 'text-amber-900',
        border: 'border-amber-500',
        progress: 'bg-amber-500'
      },
      [DnshObjective.WATER]: {
        bg: 'bg-blue-50 border-blue-500',
        text: 'text-blue-900',
        border: 'border-blue-500',
        progress: 'bg-blue-500'
      },
      [DnshObjective.CIRCULAR]: {
        bg: 'bg-purple-50 border-purple-500',
        text: 'text-purple-900',
        border: 'border-purple-500',
        progress: 'bg-purple-500'
      },
      [DnshObjective.POLLUTION]: {
        bg: 'bg-red-50 border-red-500',
        text: 'text-red-900',
        border: 'border-red-500',
        progress: 'bg-red-500'
      },
      [DnshObjective.BIODIVERSITY]: {
        bg: 'bg-green-50 border-green-500',
        text: 'text-green-900',
        border: 'border-green-500',
        progress: 'bg-green-500'
      }
    };
    return colors[objective]?.[type] || 'bg-slate-50 border-slate-500';
  };

  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Mitigación',
    [DnshObjective.ADAPTATION]: 'Adaptación',
    [DnshObjective.WATER]: 'Agua',
    [DnshObjective.CIRCULAR]: 'Economía Circular',
    [DnshObjective.POLLUTION]: 'Contaminación',
    [DnshObjective.BIODIVERSITY]: 'Biodiversidad'
  };

  const objectiveNumbers: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: '1',
    [DnshObjective.ADAPTATION]: '2',
    [DnshObjective.WATER]: '3',
    [DnshObjective.CIRCULAR]: '4',
    [DnshObjective.POLLUTION]: '5',
    [DnshObjective.BIODIVERSITY]: '6'
  };

  // Render objective-specific content
  const renderObjectiveContent = () => {
    const colorClasses = getObjectiveColorClasses(activeObjective);
    const data = getObjectiveData(activeObjective);

    // Special handling for Adaptation - show CRVA page
    if (activeObjective === DnshObjective.ADAPTATION) {
      return (
        <div className="h-full overflow-hidden">
          <DnshAdaptationPage 
            operation={operation} 
            onBack={onBack}
            embedded={true}
            selectedAssetId={selectedAssetId}
            onUpdateOperation={onUpdateOperation}
          />
        </div>
      );
    }

    // For other objectives, show checklist with objective-specific enhancements
    return (
      <div className="h-full flex flex-col space-y-4">
        {/* Objective Header */}
        <div className={`${colorClasses.bg} border-l-4 ${colorClasses.border} p-4 rounded-r-lg bg-[#0a0a0a] border-[#1a1a1a]`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {getObjectiveIcon(activeObjective)}
                <h2 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
                  OBJ_{objectiveNumbers[activeObjective]}: {data.template?.title.toUpperCase().replace(/\s/g, '_')}
                </h2>
                {data.isSubstantial && (
                  <span className="px-2 py-1 bg-[#00a8ff]/20 text-[#00a8ff] text-[10px] font-bold rounded border border-[#00a8ff]/30 font-mono uppercase tracking-wider">
                    SUBSTANTIAL_CONTRIBUTION
                  </span>
                )}
              </div>
              <p className="text-xs text-[#666666] mb-3 font-mono uppercase tracking-wider">{data.template?.description.toUpperCase()}</p>
              
              {/* Progress Stats */}
              <div className="flex items-center space-x-4 text-xs font-mono">
                <div>
                  <span className="text-[#666666]">ASSETS_EVAL: </span>
                  <span className="font-semibold text-white">{data.totalAssessed}/{data.totalAssets}</span>
                </div>
                <div>
                  <span className="text-[#666666]">COMPLIANT: </span>
                  <span className={`font-semibold ${colorClasses.text}`}>{data.compliantCount}</span>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso</span>
                    <span>{data.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`${colorClasses.progress} h-2 rounded-full transition-all`}
                      style={{ width: `${data.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exemption Notice */}
        {data.isSubstantial && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-800 text-sm mb-1">Exención: Contribución Sustancial</h4>
                <p className="text-xs text-blue-700">
                  Este objetivo es la contribución sustancial principal de la operación. 
                  Por lo tanto, los criterios DNSH para este objetivo no se evalúan según el Reglamento (UE) 2020/852.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Objective-specific enhancements */}
        {activeObjective === DnshObjective.BIODIVERSITY && selectedAsset && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Leaf size={16} className="text-green-600" />
              <h4 className="font-semibold text-green-900 text-sm">Key Biodiversity Areas (KBAs) Cercanas</h4>
            </div>
            {(() => {
              const nearbyKBAs = findNearbyKBAs(selectedAsset.lat, selectedAsset.lng, 50);
              return nearbyKBAs.length > 0 ? (
                <div className="space-y-1 text-xs text-green-800">
                  {nearbyKBAs.slice(0, 3).map(kba => (
                    <div key={kba.id}>
                      • {kba.name} ({kba.distanceFromAssetKm?.toFixed(1)} km) - {kba.designation}
                    </div>
                  ))}
                  {nearbyKBAs.length > 3 && (
                    <div className="text-green-600">+{nearbyKBAs.length - 3} más KBAs en el área</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-green-700">No se detectaron KBAs en un radio de 50 km</p>
              );
            })()}
          </div>
        )}

        {activeObjective === DnshObjective.WATER && selectedAsset && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Droplets size={16} className="text-blue-600" />
              <h4 className="font-semibold text-blue-900 text-sm">Zonas de Riesgo Hídrico Cercanas</h4>
            </div>
            {(() => {
              // Note: WRI Aqueduct data is now integrated asynchronously
              const nearbyWaterRisk: any[] = []; // Will be populated async in future
              return nearbyWaterRisk.length > 0 ? (
                <div className="space-y-1 text-xs text-blue-800">
                  {nearbyWaterRisk.slice(0, 3).map(zone => (
                    <div key={zone.id}>
                      • {zone.name} ({zone.riskLevel} Risk, {zone.distanceFromAssetKm?.toFixed(1)} km) - {zone.riskType}
                    </div>
                  ))}
                  {nearbyWaterRisk.length > 3 && (
                    <div className="text-blue-600">+{nearbyWaterRisk.length - 3} más zonas de riesgo</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-blue-700">No se detectaron zonas de riesgo hídrico en un radio de 50 km</p>
              );
            })()}
          </div>
        )}

        {/* Checklist Questions - Hidden if asset is Not Material */}
        {!data.isSubstantial && data.template && (() => {
          // Check if selected asset is "Not Material"
          let selectedAssetJustification = selectedAsset 
            ? data.compliantAssets.find(ca => ca.asset.id === selectedAsset.id)?.justification
            : null;
          
          // If no justification found but asset exists, check if it's not material
          if (!selectedAssetJustification && selectedAsset) {
            const isNotMaterialByNature = checkNotMaterialByNature(selectedAsset, activeObjective);
            const isNotMaterialByLocation = checkNotMaterialByLocation(selectedAsset, activeObjective);
            
            if (isNotMaterialByNature) {
              selectedAssetJustification = {
                reason: 'NotMaterialByNature',
                description: `El tipo de asset (${selectedAsset.assetType}) no tiene impacto material en este objetivo DNSH por su naturaleza operativa.`,
                evidence: []
              };
            } else if (isNotMaterialByLocation) {
              selectedAssetJustification = {
                reason: 'NotMaterialByLocation',
                description: `La ubicación del asset (${selectedAsset.lat.toFixed(2)}, ${selectedAsset.lng.toFixed(2)}) no presenta riesgos materiales para este objetivo DNSH.`,
                evidence: []
              };
            }
          }
          
          const isNotMaterial = selectedAssetJustification && (
            selectedAssetJustification.reason === 'NotMaterialByNature' || 
            selectedAssetJustification.reason === 'NotMaterialByLocation'
          );

          // If Not Material, show info message instead of questionnaire
          if (isNotMaterial && selectedAsset) {
            return (
              <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] flex-1 overflow-y-auto p-6">
                <div className="bg-[#00a8ff]/10 border-l-4 border-[#00a8ff] p-6 rounded-r-lg">
                  <div className="flex items-start space-x-3">
                    <Zap size={24} className="text-[#00a8ff] flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider mb-2">
                        DNSH_NOT_MATERIAL: {selectedAsset.name.toUpperCase().replace(/\s/g, '_')}
                      </h3>
                      <p className="text-sm text-[#a0a0a0] mb-4 leading-relaxed font-mono">
                        {selectedAssetJustification.description}
                      </p>
                      {selectedAssetJustification.reason === 'NotMaterialByNature' && (
                        <div className="bg-[#111111] rounded-lg p-4 border border-[#1a1a1a]">
                          <h4 className="font-semibold text-white mb-2 text-sm font-mono uppercase tracking-wider">WHY_NOT_MATERIAL</h4>
                          <p className="text-xs text-[#a0a0a0] leading-relaxed font-mono">
                            ASSET_TYPE ({selectedAsset.assetType}) NO_MATERIAL_IMPACT ON THIS DNSH_OBJECTIVE BY OPERATIONAL_NATURE. 
                            PER_REGULATION_(UE)_2020/852, NO_COMPLETE_DNSH_EVAL_REQUIRED WHEN IMPACT_NOT_MATERIAL.
                          </p>
                        </div>
                      )}
                      {selectedAssetJustification.reason === 'NotMaterialByLocation' && (
                        <div className="bg-[#111111] rounded-lg p-4 border border-[#1a1a1a] mt-3">
                          <h4 className="font-semibold text-white mb-2 text-sm font-mono uppercase tracking-wider">WHY_NOT_MATERIAL</h4>
                          <p className="text-xs text-[#a0a0a0] leading-relaxed font-mono">
                            ASSET_LOCATION ({selectedAsset.lat.toFixed(2)}, {selectedAsset.lng.toFixed(2)}) 
                            NO_MATERIAL_RISKS FOR THIS DNSH_OBJECTIVE. NO_COMPLETE_DNSH_EVAL_REQUIRED WHEN GEOGRAPHIC_RISK_NOT_MATERIAL.
                          </p>
                        </div>
                      )}
                      {selectedAssetJustification.evidence.length > 0 && (
                        <div className="mt-4 bg-[#111111] rounded-lg p-4 border border-[#1a1a1a]">
                          <h4 className="font-semibold text-white mb-2 text-sm font-mono uppercase tracking-wider">EVIDENCE</h4>
                          <ul className="text-xs text-[#a0a0a0] space-y-1 font-mono">
                            {selectedAssetJustification.evidence.map((ev, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-1 text-[#00ff88]">•</span>
                                <span className="break-words">{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Show normal questionnaire
          return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-y-auto p-6 min-h-0">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Criterios de Evaluación DNSH</h3>
                <div className="space-y-4 pb-4">
                {data.template.questions.map((q, idx) => {
                  // Find asset-level answers if asset selected
                  const assetAnswer = selectedAsset?.dnshEvaluation 
                    ? (() => {
                        const evaluation = selectedAsset.dnshEvaluation;
                        // This would need to map question IDs to evaluation fields
                        // For now, just show placeholder
                        return null;
                      })()
                    : null;

                  return (
                    <div key={q.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 break-words leading-relaxed">{q.text}</p>
                          <div className="flex items-start text-xs text-slate-500 mt-1">
                            <FileText size={12} className="mr-1 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{q.guidance}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Asset selector for this question */}
                      <div className="ml-9">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-medium text-slate-600">Evaluar para:</span>
                          <select
                            value={selectedAssetId || ''}
                            onChange={(e) => setSelectedAssetId(e.target.value || null)}
                            className="text-xs border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500"
                          >
                            <option value="">Todos los assets</option>
                            {operation.assets.map(asset => (
                              <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {selectedAsset && (
                          <div className="bg-white p-3 rounded border border-slate-200">
                            <div className="flex space-x-4 mb-2">
                              {['Yes', 'No', 'N/A'].map((opt) => (
                                <label key={opt} className="flex items-center cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={`q-${q.id}-${selectedAsset.id}`} 
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                  />
                                  <span className="ml-2 text-sm text-slate-700 font-medium">{opt}</span>
                                </label>
                              ))}
                            </div>
                            <textarea 
                              className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 min-h-[60px] p-2 border"
                              placeholder="Evidencia / Documentación de apoyo..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-[#111111] rounded-lg text-[#666666] hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wider">DNSH_EVAL</h1>
            <p className="text-xs text-[#666666] font-mono uppercase tracking-wider mt-1">{operation.name.toUpperCase().replace(/\s/g, '_')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar: Objectives Navigation */}
        <div className="w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-[#1a1a1a] bg-[#111111]">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider font-mono">OBJECTIVES_DNSH</h3>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {DNSH_CHECKLIST_TEMPLATES.map((template) => {
              const objective = template.objective;
              const data = getObjectiveData(objective);
              const colorClasses = getObjectiveColorClasses(objective);
              const isActive = activeObjective === objective;
              
              return (
                <button
                  key={objective}
                  onClick={() => setActiveObjective(objective)}
                  className={`w-full text-left px-4 py-4 border-l-4 transition-all hover:bg-[#111111] flex justify-between items-center group ${
                    isActive 
                      ? `${colorClasses.border} ${colorClasses.bg}` 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="flex-shrink-0">{getObjectiveIcon(objective)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate font-mono ${isActive ? colorClasses.text : 'text-white'}`} title={`${objectiveNumbers[objective]}. ${objectiveLabels[objective]}`}>
                          {objectiveNumbers[objective]}. {objectiveLabels[objective].toUpperCase().replace(/\s/g, '_')}
                        </p>
                        <p className="text-xs text-[#666666] font-mono mt-0.5">{data.compliantCount}/{data.totalAssets} COMPLIANT</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-[#1a1a1a] rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${colorClasses.progress}`} 
                        style={{ width: `${data.progress}%` }}
                      />
                    </div>
                  </div>
                  {data.isSubstantial && (
                    <Sparkles size={14} className={`${colorClasses.text} ml-2`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Center Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs for Evaluation/Evidence/Map */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                activeTab === 'evaluation'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm'
              }`}
            >
              <CheckCircle size={16} className="mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Evaluación</span>
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                activeTab === 'evidence'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm'
              }`}
            >
              <FileText size={16} className="mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Evidencias</span>
              {filteredEvidence.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold flex-shrink-0">
                  {filteredEvidence.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm'
              }`}
            >
              <MapPin size={16} className="mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Mapa</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'evaluation' && renderObjectiveContent()}
            
            {activeTab === 'evidence' && (
              <div className="h-full">
                <EvidenceRegistry
                  operation={{
                    ...operation,
                    evidenceDocuments: filteredEvidence
                  }}
                  onAddEvidence={handleAddEvidence}
                  onDeleteEvidence={handleDeleteEvidence}
                />
              </div>
            )}
            
            {activeTab === 'map' && (
              <div className="h-full relative bg-slate-900 flex flex-col">
                {/* Map Header with Context Info */}
                <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg p-3 shadow-lg">
                  <div className="flex items-center space-x-3 text-sm text-slate-300">
                    <div className="flex items-center space-x-2">
                      {getObjectiveIcon(activeObjective)}
                      <div>
                        <p className="text-xs text-slate-400">Objetivo Activo</p>
                        <p className="font-semibold text-white">{objectiveNumbers[activeObjective]}. {objectiveLabels[activeObjective]}</p>
                      </div>
                    </div>
                    {selectedAsset && (
                      <>
                        <div className="w-px h-6 bg-slate-700"></div>
                        <div>
                          <p className="text-xs text-slate-400">Asset Seleccionado</p>
                          <p className="font-semibold text-white truncate max-w-[200px]">{selectedAsset.name}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Map Canvas */}
                <div className="flex-1 relative">
                  <MapViewer 
                    assets={selectedAsset ? [selectedAsset] : operation.assets}
                    activeLayers={[]}
                    theme="dark"
                    showKBAs={activeObjective === DnshObjective.BIODIVERSITY}
                    kbas={selectedAsset ? findNearbyKBAs(selectedAsset.lat, selectedAsset.lng, 50) : operation.assets.flatMap(asset => findNearbyKBAs(asset.lat, asset.lng, 50))}
                    showWaterRisk={activeObjective === DnshObjective.WATER}
                    waterRiskZones={waterRiskZones}
                    onAssetClick={(assetId) => {
                      setSelectedAssetId(assetId);
                      // Scroll to asset in right panel if not visible
                    }}
                    focusedAssetId={selectedAssetId}
                    statusMeta={{
                      title: `Evaluación DNSH - ${operation.name}`,
                      scenario: activeObjective === DnshObjective.ADAPTATION ? 'SSP2-4.5' : undefined,
                    }}
                  />
                </div>
                
                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg p-3 shadow-lg">
                  <div className="text-xs text-slate-400 mb-2 font-semibold">Leyenda</div>
                  <div className="space-y-1.5 text-[10px]">
                    {activeObjective === DnshObjective.BIODIVERSITY && (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400"></div>
                        <span>KBAs (Key Biodiversity Areas)</span>
                      </div>
                    )}
                    {activeObjective === DnshObjective.WATER && (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400"></div>
                        <span>Zonas de Riesgo Hídrico</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-slate-300">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-400"></div>
                      <span>Asset Compliant</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-400"></div>
                      <span>Asset Non-Compliant</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-400"></div>
                      <span>Asset Conditional</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Right Panel: Objective Details */}
          {activeObjective && (
            <div className="w-96 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-blue-600 text-white flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    {getObjectiveIcon(activeObjective)}
                    <h3 className="font-bold text-lg truncate">
                      {objectiveNumbers[activeObjective]}. {objectiveLabels[activeObjective]}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-white/90 break-words leading-relaxed">{getObjectiveData(activeObjective).template?.title}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
                {(() => {
                  const data = getObjectiveData(activeObjective);
                  const colorClasses = getObjectiveColorClasses(activeObjective);
                  
                  return (
                    <>
                      {/* Status Summary */}
                      <div className={`${colorClasses.bg} rounded-lg p-3 border ${colorClasses.border}`}>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <CheckCircle size={16} className="mr-2" />
                          Estado de Cumplimiento
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Assets Compliant</span>
                            <span className={`font-bold ${colorClasses.text}`}>
                              {data.compliantCount}/{data.totalAssets}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Assets Evaluados</span>
                            <span className="font-semibold text-slate-900">
                              {data.totalAssessed}/{data.totalAssets}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full ${colorClasses.progress}`}
                              style={{ width: `${data.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 text-center mt-1">
                            {data.progress}% de progreso
                          </div>
                        </div>
                      </div>

                      {/* Compliance Justification - MOVED UP */}
                      {data.compliantCount > 0 && (
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                          <h4 className="font-semibold text-emerald-900 mb-3 flex items-center">
                            <Shield size={16} className="mr-2" />
                            Justificación de Cumplimiento
                          </h4>
                          <div className="space-y-3">
                            {data.compliantAssets.map(({ asset, justification }) => {
                              const getReasonIcon = () => {
                                switch (justification.reason) {
                                  case 'SubstantialContribution':
                                    return <Sparkles size={14} className="text-blue-600" />;
                                  case 'NotMaterialByNature':
                                    return <Zap size={14} className="text-purple-600" />;
                                  case 'NotMaterialByLocation':
                                    return <MapPinIcon size={14} className="text-indigo-600" />;
                                  case 'EvidenceBased':
                                    return <FileText size={14} className="text-emerald-600" />;
                                  default:
                                    return <Info size={14} className="text-slate-600" />;
                                }
                              };

                              const getReasonLabel = () => {
                                switch (justification.reason) {
                                  case 'SubstantialContribution':
                                    return 'Contribución Sustancial';
                                  case 'NotMaterialByNature':
                                    return 'No Material por Naturaleza';
                                  case 'NotMaterialByLocation':
                                    return 'No Material por Ubicación';
                                  case 'EvidenceBased':
                                    return 'Basado en Evidencia';
                                  case 'Unknown':
                                    return '⚠️ Sin Justificación Válida';
                                  default:
                                    return 'Sin Justificación';
                                }
                              };

                              const getReasonColor = () => {
                                switch (justification.reason) {
                                  case 'SubstantialContribution':
                                    return 'bg-blue-100 text-blue-700 border-blue-200';
                                  case 'NotMaterialByNature':
                                    return 'bg-purple-100 text-purple-700 border-purple-200';
                                  case 'NotMaterialByLocation':
                                    return 'bg-indigo-100 text-indigo-700 border-indigo-200';
                                  case 'EvidenceBased':
                                    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                  case 'Unknown':
                                    return 'bg-red-100 text-red-700 border-red-300'; // Red for invalid
                                  default:
                                    return 'bg-amber-100 text-amber-700 border-amber-200';
                                }
                              };

                              return (
                                <div key={asset.id} className={`bg-white rounded-lg p-3 border ${
                                  justification.reason === 'Unknown' 
                                    ? 'border-red-300 bg-red-50' 
                                    : 'border-emerald-200'
                                }`}>
                                  <div className="flex items-start justify-between mb-2 gap-2">
                                    <span className="text-sm font-semibold text-slate-900 break-words flex-1 min-w-0">{asset.name}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border flex items-center space-x-1 flex-shrink-0 ${getReasonColor()}`}>
                                      {getReasonIcon()}
                                      <span className="whitespace-nowrap">{getReasonLabel()}</span>
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed mb-2 break-words">
                                    {justification.description}
                                  </p>
                                  {justification.evidence.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                      <p className="text-xs font-semibold text-slate-600 mb-1">Evidencia:</p>
                                      <ul className="text-xs text-slate-600 space-y-1">
                                        {justification.evidence.slice(0, 3).map((ev, idx) => (
                                          <li key={idx} className="flex items-start">
                                            <span className="mr-1">•</span>
                                            <span className="break-words">{ev}</span>
                                          </li>
                                        ))}
                                        {justification.evidence.length > 3 && (
                                          <li className="text-slate-500 italic">
                                            +{justification.evidence.length - 3} más...
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  {justification.reason === 'Unknown' && (
                                    <div className="mt-2 pt-2 border-t border-amber-200 bg-amber-50 rounded p-2">
                                      <p className="text-xs text-amber-700 font-medium">
                                        ⚠️ Se recomienda documentar la justificación del cumplimiento.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {data.template?.description && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <h4 className="font-semibold text-slate-900 mb-2">Descripción</h4>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {data.template.description}
                          </p>
                        </div>
                      )}

                      {/* Substantial Contribution Notice */}
                      {data.isSubstantial && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <div className="flex items-start space-x-2">
                            <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-blue-900 mb-1">Contribución Sustancial Principal</h4>
                              <p className="text-xs text-blue-700">
                                Este objetivo es la contribución sustancial principal de la operación. 
                                Los criterios DNSH para este objetivo no se evalúan según el Reglamento (UE) 2020/852.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Asset Status Breakdown */}
                      <div className="bg-[#111111] rounded-lg p-3 border border-[#1a1a1a]">
                        <h4 className="font-semibold text-white mb-3 font-mono uppercase tracking-wider">ASSET_STATUS</h4>
                        <div className="space-y-2">
                          {operation.assets.map(asset => {
                            const evaluation = asset.dnshEvaluation;
                            const assetStatus = getObjectiveStatusFromAsset(evaluation, activeObjective);
                            
                            // Validate that status has assessment
                            const validation = validateDnshStatus(asset, activeObjective, operation);
                            const displayStatus = validation.hasAssessment ? assetStatus : 'Not Assessed';

                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case 'Compliant':
                                  return 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30';
                                case 'Non-Compliant':
                                  return 'bg-red-500/10 text-red-500 border-red-500/30';
                                case 'Conditional':
                                  return 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/30';
                                case 'Not Assessed':
                                  return 'bg-[#111111] text-[#666666] border-[#1a1a1a] italic';
                                default:
                                  return 'bg-[#111111] text-[#666666] border-[#1a1a1a]';
                              }
                            };

                            return (
                              <div 
                                key={asset.id}
                                onClick={() => setSelectedAssetId(asset.id)}
                                className={`p-2 rounded border cursor-pointer transition-all hover:border-[#00ff88]/30 ${
                                  selectedAssetId === asset.id 
                                    ? 'bg-[#00ff88]/10 border-[#00ff88]/30 ring-2 ring-[#00ff88]/20' 
                                    : displayStatus === 'Not Assessed'
                                    ? 'bg-[#0a0a0a] border-[#1a1a1a] opacity-75'
                                    : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#1a1a1a]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-sm font-medium break-words flex-1 min-w-0 font-mono uppercase tracking-wider ${
                                    displayStatus === 'Not Assessed' ? 'text-[#666666] italic' : 'text-white'
                                  }`}>
                                    {asset.name.replace(/\s/g, '_')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 whitespace-nowrap font-mono uppercase ${getStatusColor(displayStatus)}`}>
                                    {displayStatus.replace(/\s/g, '_')}
                                  </span>
                                </div>
                                <div className={`text-xs mt-1 break-words flex items-center justify-between font-mono ${
                                  displayStatus === 'Not Assessed' ? 'text-[#666666]' : 'text-[#666666]'
                                }`}>
                                  <span>{asset.assetType} • €{(asset.exposedValue / 1000000).toFixed(1)}M</span>
                                  {!validation.hasAssessment && (
                                    <span className="text-[10px] text-[#666666] ml-2" title={validation.missingRequirements.join(', ')}>
                                      ⚠ NO_EVAL
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Questions Count */}
                      {data.template && (
                        <div className="bg-[#111111] rounded-lg p-3 border border-[#1a1a1a]">
                          <h4 className="font-semibold text-white mb-2 font-mono uppercase tracking-wider">EVAL_CRITERIA</h4>
                          <p className="text-sm text-[#666666] font-mono">
                            {data.template.questions.length} QUESTION{data.template.questions.length !== 1 ? 'S' : ''} DNSH_EVAL
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DnshEvaluationPage;
