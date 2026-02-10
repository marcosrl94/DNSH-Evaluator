import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Calendar, Building2, Zap, Droplets, AlertTriangle, CheckCircle, XCircle, Info, Target, Factory, Leaf, ChevronDown, Link2 } from 'lucide-react';
import { Asset, DnshObjective, ClimateScenario } from '../types';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { determineAllHazardScopes, ScopeDeterminationResult } from '../services/hazardScopeDetermination';
import { getCORDEXData } from '../services/cordexData';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { logger } from '../utils/logger';

interface AssetDetailPanelProps {
  asset: Asset;
  onClose: () => void;
  onNavigateToEvaluation?: () => void;
}

const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({ asset, onClose, onNavigateToEvaluation }) => {
  const { theme } = useTheme();
  const themeClasses = React.useMemo(() => {
    try {
      return getThemeClasses(theme || 'dark');
    } catch (error) {
      logger.error('Error getting theme classes:', error);
      return getThemeClasses('dark');
    }
  }, [theme]);
  const [showKPIPopup, setShowKPIPopup] = useState(false);
  const [autoScopes, setAutoScopes] = useState<Record<string, ScopeDeterminationResult>>({});
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [hazardKPIs, setHazardKPIs] = useState<Record<string, {
    kpi: string;
    value: number;
    unit: string;
    threshold: number;
    thresholdUnit: string;
    status: 'Below Threshold' | 'At Threshold' | 'Above Threshold';
    assessmentDate?: string;
  }>>({});
  const [loadingKPIs, setLoadingKPIs] = useState(false);

  // Determine scope automatically for all hazards if not already set
  useEffect(() => {
    const determineScopes = async () => {
      setLoadingScopes(true);
      try {
        const scopes = await determineAllHazardScopes(asset, ClimateScenario.SSP2_45);
        setAutoScopes(scopes);
      } catch (error) {
        logger.error('Error determining hazard scopes:', error);
      } finally {
        setLoadingScopes(false);
      }
    };

    determineScopes();
  }, [asset.id]);

  // Get scope for a hazard: use manual if available, otherwise use auto-determined
  const getHazardScope = (hazardId: string): string => {
    // First check if manually set in asset attributes
    const manualScope = asset.attributes.adaptationHazardScope?.[hazardId];
    if (manualScope && manualScope !== 'Not Assessed') {
      return manualScope;
    }
    
    // Otherwise use auto-determined scope
    const autoScope = autoScopes[hazardId];
    return autoScope?.scope || 'Not Assessed';
  };

  // Get KPI thresholds reference for each hazard
  const getHazardThresholds = (): Record<string, { kpiName: string; value: number; unit: string }> => {
    return {
      'h2': { kpiName: 'Temperature Increase', value: 3.0, unit: '°C' }, // TEMP-02: Heat stress
      'h3': { kpiName: 'Temperature Variability', value: 2.5, unit: '°C' }, // TEMP-03: Temperature variability
      'h5': { kpiName: 'Heat Wave Frequency', value: 10.0, unit: 'events/year' }, // TEMP-05: Heat wave
      'h7': { kpiName: 'Wildfire Risk Index', value: 0.5, unit: 'index' }, // TEMP-07: Wildfire
      'h8': { kpiName: 'Wind Speed Increase', value: 15.0, unit: 'm/s' }, // WIND-01: Changing wind patterns
      'h13': { kpiName: 'Precipitation Change', value: -20.0, unit: '%' }, // WAT-01: Changing precipitation
      'h15': { kpiName: 'Flood Depth', value: 1.0, unit: 'm' }, // WAT-03: Flood
      'h17': { kpiName: 'Sea Level Rise', value: 30.0, unit: 'cm' }, // WAT-05: Sea level rise
      'h18': { kpiName: 'Water Stress Index', value: 0.4, unit: 'index' }, // WAT-06: Water scarcity
      'h19': { kpiName: 'Drought Severity', value: 0.6, unit: 'index' }, // WAT-07: Drought
    };
  };

  // Extract KPI value from CORDEX data based on hazard type
  const getKPIValueFromCORDEX = (cordexData: any, hazardId: string): number => {
    if (!cordexData) return 0;
    
    // Map hazard to appropriate KPI value
    const hazardMap: Record<string, (data: any) => number> = {
      'h2': (d) => d.changeFromBaseline || 0, // Heat stress: temperature increase
      'h3': (d) => Math.abs(d.changeFromBaseline || 0), // Temperature variability: absolute change
      'h5': (d) => (d.changeFromBaseline || 0) * 2 + 5, // Heat wave: frecuencia (proxy desde CORDEX)
      'h7': (d) => d.value || 0, // Wildfire: risk index
      'h8': (d) => d.value || 0, // Wind: speed
      'h13': (d) => d.changeFromBaseline || 0, // Precipitation: % change
      'h15': (d) => Math.abs(d.changeFromBaseline || 0) / 10, // Flood: profundidad (proxy desde CORDEX)
      'h17': (d) => d.value || 0, // Sea level: absolute rise in cm
      'h18': (d) => Math.abs(d.changeFromBaseline || 0) / 100, // Water stress: índice (proxy desde CORDEX)
      'h19': (d) => Math.abs(d.changeFromBaseline || 0) / 100, // Drought: índice (proxy desde CORDEX)
    };
    
    const extractor = hazardMap[hazardId];
    return extractor ? extractor(cordexData) : 0;
  };

  // Calculate KPIs for In-Scope hazards based on lat/lon
  useEffect(() => {
    const calculateKPIs = async () => {
      if (!showKPIPopup) return;
      
      setLoadingKPIs(true);
      const kpis: Record<string, any> = {};
      
      try {
        // Get thresholds reference for each hazard
        const hazardThresholds = getHazardThresholds();
        
        // Calculate KPIs only for In-Scope hazards
        for (const hazard of EU_TAXONOMY_HAZARDS) {
          const scope = getHazardScope(hazard.id);
          
          if (scope === 'In Scope') {
            // Get CORDEX data for this hazard at asset location
            const cordexData = await getCORDEXData(
              hazard.id,
              asset.lat,
              asset.lng,
              ClimateScenario.SSP2_45,
              '2050'
            );
            
            if (cordexData && hazardThresholds[hazard.id]) {
              const threshold = hazardThresholds[hazard.id];
              const kpiValue = getKPIValueFromCORDEX(cordexData, hazard.id);
              
              // Determine status
              let status: 'Below Threshold' | 'At Threshold' | 'Above Threshold';
              const diff = Math.abs(kpiValue - threshold.value);
              const tolerance = Math.abs(threshold.value * 0.05); // 5% tolerance
              
              if (diff <= tolerance) {
                status = 'At Threshold';
              } else if (kpiValue > threshold.value) {
                status = 'Above Threshold';
              } else {
                status = 'Below Threshold';
              }
              
              kpis[hazard.id] = {
                kpi: threshold.kpiName,
                value: kpiValue,
                unit: threshold.unit,
                threshold: threshold.value,
                thresholdUnit: threshold.unit,
                status,
                assessmentDate: new Date().toISOString(),
              };
            }
          }
        }
        
        setHazardKPIs(kpis);
      } catch (error) {
        logger.error('Error calculating KPIs:', error);
      } finally {
        setLoadingKPIs(false);
      }
    };

    calculateKPIs();
  }, [showKPIPopup, asset.lat, asset.lng, autoScopes]);

  const getAssetIcon = (type: string) => {
    if (type.includes('Solar') || type.includes('Wind')) return <Zap size={20} className="text-yellow-500" />;
    if (type.includes('Grid') || type.includes('Infrastructure')) return <Building2 size={20} className="text-blue-500" />;
    if (type.includes('Building')) return <Building2 size={20} className="text-purple-500" />;
    return <Factory size={20} className="text-slate-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Non-Compliant':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Conditional':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'In Scope':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Out of Scope':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Not Assessed':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getKPIStatusColor = (status: string) => {
    switch (status) {
      case 'Below Threshold':
        return 'bg-emerald-100 text-emerald-700';
      case 'At Threshold':
        return 'bg-amber-100 text-amber-700';
      case 'Above Threshold':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-[#1a1a1a] text-[#666666] border-[#1a1a1a]';
    }
  };

  return (
    <div className={`absolute top-4 right-4 w-96 max-w-[calc(100vw-2rem)] rounded-xl border z-[1000] max-h-[90vh] flex flex-col transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#00ff88] to-[#00a8ff] text-[#0a0a0a] p-4 rounded-t-xl flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex-shrink-0">{getAssetIcon(asset.assetType)}</div>
            <h3 className="font-bold text-lg break-words leading-tight font-mono uppercase tracking-wider">{asset.name.replace(/\s/g, '_')}</h3>
          </div>
          <p className="text-xs text-[#0a0a0a]/90 font-mono uppercase tracking-wider">{asset.assetType.replace(/\s/g, '_')}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="text-[#0a0a0a]/80 hover:text-[#0a0a0a] p-1 rounded-full hover:bg-[#0a0a0a]/20 transition-all cursor-pointer active:scale-[0.90]"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
        {/* Basic Information */}
        <div className={`rounded-lg p-3 border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
          <h4 className={`font-semibold mb-3 flex items-center font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
            <Info size={16} className="mr-2" />
            INFO_BASICA
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>VALOR_EXPUESTO</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>€{(asset.exposedValue / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>COORDENADAS</span>
              <span className={`font-mono text-xs transition-colors ${themeClasses.text.secondary}`}>{asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}</span>
            </div>
            {asset.attributes.yearBuilt && (
              <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>AÑO_CONSTRUCCION</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>{asset.attributes.yearBuilt}</span>
              </div>
            )}
            {asset.attributes.constructionYear && (
              <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>INICIO_CONSTRUCCION</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>{asset.attributes.constructionYear}</span>
              </div>
            )}
            {asset.attributes.operationalYear && (
              <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>INICIO_OPERACIONES</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>{asset.attributes.operationalYear}</span>
              </div>
            )}
            {asset.attributes.siteType && (
              <div className="flex justify-between">
                <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>TIPO_SITIO</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono uppercase ${
                  asset.attributes.siteType === 'Brownfield' 
                    ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' 
                    : 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                }`}>
                  {asset.attributes.siteType.replace(/\s/g, '_')}
                </span>
              </div>
            )}
            {asset.attributes.capacity && (
              <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>CAPACIDAD</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>
                  {asset.attributes.capacity.toLocaleString()} {asset.attributes.capacityUnit || 'MW'}
                </span>
              </div>
            )}
            {asset.attributes.elevationMeters && (
              <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>ELEVACION</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>{asset.attributes.elevationMeters.toFixed(0)}M</span>
              </div>
            )}
            {asset.attributes.distanceToCoastKm && (
              <div className="flex justify-between">
              <span className={`font-mono uppercase tracking-wider text-xs transition-colors ${themeClasses.text.tertiary}`}>DISTANCIA_COSTA</span>
              <span className={`font-semibold font-mono transition-colors ${themeClasses.text.primary}`}>{asset.attributes.distanceToCoastKm.toFixed(1)}KM</span>
              </div>
            )}
          </div>
        </div>

        {/* Materials */}
        {asset.attributes.materials && asset.attributes.materials.length > 0 && (
          <div className="bg-[#111111] rounded-lg p-3 border border-[#1a1a1a]">
            <h4 className="font-semibold text-white mb-2 flex items-center font-mono uppercase tracking-wider">
              <Factory size={16} className="mr-2" />
              MATERIALES_PRINCIPALES
            </h4>
            <div className="flex flex-wrap gap-2">
              {asset.attributes.materials.map((material, idx) => (
                <span key={idx} className="px-2 py-1 bg-[#0a0a0a] text-[#a0a0a0] text-xs rounded border border-[#1a1a1a] font-mono uppercase">
                  {material.replace(/\s/g, '_')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Primary Objective Contribution */}
        {asset.attributes.substantialContribution && (
          <div className="bg-[#00a8ff]/10 rounded-lg p-3 border border-[#00a8ff]/30">
            <h4 className="font-semibold text-white mb-2 flex items-center font-mono uppercase tracking-wider">
              <Target size={16} className="mr-2" />
              CONTRIBUCION_SUSTANCIAL_PRINCIPAL
            </h4>
            <span className="text-sm text-[#a0a0a0] font-medium font-mono uppercase">{asset.attributes.substantialContribution.replace(/\s/g, '_')}</span>
          </div>
        )}

        {/* DNSH Status */}
        <div className="bg-[#111111] rounded-lg p-3 border border-[#1a1a1a]">
          <h4 className="font-semibold text-white mb-2 flex items-center font-mono uppercase tracking-wider">
            <CheckCircle size={16} className="mr-2" />
            ESTADO_DNSH
          </h4>
          <div className="space-y-1">
            {asset.dnshEvaluation ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666666] font-mono uppercase tracking-wider">ESTADO_GENERAL</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border font-mono uppercase tracking-wider ${getStatusColor(asset.dnshEvaluation.overallStatus)}`}>
                    {asset.dnshEvaluation.overallStatus.replace(/\s/g, '_')}
                  </span>
                </div>
                {asset.dnshEvaluation.adaptationStatus && asset.dnshEvaluation.adaptationStatus !== 'Not Assessed' && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#666666] font-mono uppercase tracking-wider">ADAPTACION</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border font-mono uppercase tracking-wider ${getStatusColor(asset.dnshEvaluation.adaptationStatus)}`}>
                      {asset.dnshEvaluation.adaptationStatus.replace(/\s/g, '_')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666666] italic font-mono uppercase">NO_EVALUADO</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold border border-[#1a1a1a] bg-[#1a1a1a] text-[#666666] font-mono uppercase tracking-wider">
                  NOT_ASSESSED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Adaptation: Hazard Scope In/Out - Exhaustive list of all 28 hazards */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowKPIPopup(true);
          }}
          className="bg-[#ffb800]/10 rounded-lg p-3 border border-[#ffb800]/30 hover:bg-[#ffb800]/20 hover:border-[#ffb800]/50 transition-all cursor-pointer text-left w-full active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-white flex items-center font-mono uppercase tracking-wider">
              <AlertTriangle size={16} className="mr-2" />
              SCOPE_IN_OUT_HAZARDS_MATERIALES_APPENDIX_A
            </h4>
            <ChevronDown size={16} className="text-[#ffb800]" />
          </div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
            {EU_TAXONOMY_HAZARDS.slice(0, 5).map((hazard) => {
              const scope = asset.attributes.adaptationHazardScope?.[hazard.id] || 'Not Assessed';
              return (
                <div key={hazard.id} className="flex items-start justify-between bg-[#0a0a0a] p-2 rounded border border-[#ffb800]/30">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center space-x-1 mb-0.5">
                      <span className="text-[10px] font-mono text-[#666666]">{hazard.code}</span>
                    </div>
                    <span className="text-xs text-[#a0a0a0] block break-words leading-relaxed font-mono uppercase tracking-wider" title={hazard.name}>
                      {hazard.name.replace(/\s/g, '_')}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border flex-shrink-0 whitespace-nowrap ml-2 font-mono uppercase tracking-wider ${getScopeColor(scope)}`}>
                    {scope.replace(/\s/g, '_')}
                  </span>
                </div>
              );
            })}
            {EU_TAXONOMY_HAZARDS.length > 5 && (
              <div className="text-xs text-[#ffb800] font-medium text-center pt-2 font-mono uppercase tracking-wider">
                VER_TODOS_{EU_TAXONOMY_HAZARDS.length}_HAZARDS_Y_EVALUACION_EXPOSICION →
              </div>
            )}
          </div>
        </button>

        {/* KPI Popup Modal */}
        {showKPIPopup && (
          <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowKPIPopup(false)}>
            <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] max-w-4xl w-full max-h-[90vh] my-auto flex flex-col min-h-0" onClick={(e) => e.stopPropagation()}>
              {/* Popup Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-[#ffb800] to-purple-500 text-[#0a0a0a] p-4 rounded-t-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-1 font-mono uppercase tracking-wider">SCOPE_IN_OUT_HAZARDS_MATERIALES_APPENDIX_A</h3>
                  <p className="text-xs text-[#0a0a0a]/90 font-mono uppercase tracking-wider">EVALUACION_COMPLETA_HAZARDS_Y_EXPOSICION</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowKPIPopup(false);
                  }}
                  className="text-[#0a0a0a]/80 hover:text-[#0a0a0a] p-1 rounded-full hover:bg-[#0a0a0a]/20 transition-all cursor-pointer active:scale-[0.90]"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Popup Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {/* Integrated Hazards List with KPIs */}
                <div className="bg-[#111111] rounded-lg p-4 border border-[#1a1a1a]">
                  <h4 className="font-semibold text-white mb-3 flex items-center font-mono uppercase tracking-wider">
                    <AlertTriangle size={16} className="mr-2 text-[#ffb800]" />
                    SCOPE_IN_OUT_HAZARDS_MATERIALES_28
                  </h4>
                  {loadingScopes && (
                    <div className="text-xs text-[#666666] text-center py-4 font-mono uppercase tracking-wider">
                      DETERMINANDO_SCOPE_AUTOMATICAMENTE...
                    </div>
                  )}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {EU_TAXONOMY_HAZARDS.map((hazard) => {
                      const scope = getHazardScope(hazard.id);
                      const autoScope = autoScopes[hazard.id];
                      const isAutoDetermined = !asset.attributes.adaptationHazardScope?.[hazard.id] || 
                                              asset.attributes.adaptationHazardScope?.[hazard.id] === 'Not Assessed';
                      const isInScope = scope === 'In Scope';
                      const kpiData = hazardKPIs[hazard.id];
                      
                      return (
                        <div 
                          key={hazard.id} 
                          className={`bg-[#0a0a0a] p-3 rounded border transition-colors ${
                            isInScope ? 'border-purple-500/30 bg-purple-500/10' : 'border-[#1a1a1a]'
                          }`}
                          title={isAutoDetermined && autoScope ? `AUTO_DETERMINADO: ${autoScope.reasoning.replace(/\s/g, '_')}` : ''}
                        >
                          {/* Hazard Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="flex items-center space-x-1 mb-0.5">
                                <span className="text-[10px] font-mono text-[#666666]">{hazard.code}</span>
                                {isAutoDetermined && (
                                  <span className="text-[9px] px-1 py-0.5 bg-[#00a8ff]/20 text-[#00a8ff] rounded border border-[#00a8ff]/30 font-semibold font-mono uppercase">
                                    AUTO
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-white block break-words leading-relaxed font-mono uppercase tracking-wider" title={hazard.name}>
                                {hazard.name.replace(/\s/g, '_')}
                              </span>
                              {isAutoDetermined && autoScope && (
                                <div className="text-[10px] text-[#666666] mt-1 italic break-words font-mono uppercase">
                                  {autoScope.reasoning.replace(/\s/g, '_')}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {isInScope ? (
                                loadingKPIs ? (
                                  <span className="text-[10px] text-[#666666] font-mono uppercase">CALCULANDO...</span>
                                ) : kpiData ? (
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border font-mono uppercase tracking-wider ${getKPIStatusColor(kpiData.status)}`}>
                                    {kpiData.status.replace(/\s/g, '_')}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-[#1a1a1a] text-[#666666] border-[#1a1a1a] font-mono uppercase tracking-wider">
                                    IN_SCOPE
                                  </span>
                                )
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30 font-mono uppercase tracking-wider">
                                  OK
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* KPI Details for In-Scope hazards */}
                          {isInScope && kpiData && (
                            <div className="mt-3 pt-3 border-t border-purple-500/30 bg-[#111111] rounded p-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-purple-400 flex items-center font-mono uppercase tracking-wider">
                                  <Link2 size={12} className="mr-1" />
                                  EVALUACION_SIGNIFICATIVA
                                </span>
                              </div>
                              <div className="space-y-1.5 text-xs font-mono uppercase tracking-wider">
                                <div className="flex justify-between">
                                  <span className="text-[#666666]">KPI:</span>
                                  <span className="font-medium text-white">{kpiData.kpi.replace(/\s/g, '_')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#666666]">VALOR_ACTUAL:</span>
                                  <span className="font-bold text-white">
                                    {kpiData.value.toFixed(2)} {kpiData.unit}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#666666]">THRESHOLD:</span>
                                  <span className="font-semibold text-[#a0a0a0]">
                                    {kpiData.threshold.toFixed(2)} {kpiData.thresholdUnit}
                                  </span>
                                </div>
                                {kpiData.assessmentDate && (
                                  <div className="flex justify-between text-[#666666] pt-1 border-t border-[#1a1a1a]">
                                    <span>FECHA_EVALUACION:</span>
                                    <span>{new Date(kpiData.assessmentDate).toLocaleDateString('es-ES')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {onNavigateToEvaluation && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNavigateToEvaluation();
            }}
            className="w-full px-4 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-all flex items-center justify-center font-mono uppercase tracking-wider cursor-pointer active:scale-[0.95] shadow-lg shadow-[#00ff88]/20 hover:shadow-xl hover:shadow-[#00ff88]/30"
          >
            <CheckCircle size={16} className="mr-2" />
            EVALUAR_DNSH_COMPLETO
          </button>
        )}
      </div>
    </div>
  );
};

export default AssetDetailPanel;
