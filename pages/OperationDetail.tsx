import React, { useState } from 'react';
import { ArrowLeft, FileText, MapPin, Zap, Building, Target, ChevronRight, Edit, CheckCircle, AlertTriangle, ShieldCheck, Droplets, RefreshCw, Leaf, Sparkles, XCircle, X } from 'lucide-react';
import { Operation, DnshObjective, Asset } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import MapViewer from '../components/MapViewer';
import EvidenceRegistry from '../components/EvidenceRegistry';
import AssetDetailPanel from '../components/AssetDetailPanel';
import { calculateObjectiveStats } from '../utils/dnshCalculations';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface Props {
  operation: Operation;
  onNavigateToDnshEvaluation: () => void;
  onNavigateToDnshObjective?: (objective: DnshObjective) => void;
  onNavigateToAssetEvaluation: (assetId: string) => void;
  onBack: () => void;
  onUpdateOperation?: (operation: Operation) => void;
}

const OperationDetailPage: React.FC<Props> = ({ 
  operation, 
  onNavigateToDnshEvaluation,
  onNavigateToDnshObjective,
  onNavigateToAssetEvaluation, 
  onBack, 
  onUpdateOperation 
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);

  const selectedAsset = selectedAssetId 
    ? operation.assets.find(a => a.id === selectedAssetId)
    : null;

  const handleAssetClick = (assetId: string) => {
    setSelectedAssetId(assetId);
    setShowAssetDetail(true);
  };

  const handleCloseAssetDetail = () => {
    setShowAssetDetail(false);
    setSelectedAssetId(null);
  };

  const handleNavigateToAssetEvaluation = () => {
    if (selectedAssetId) {
      onNavigateToAssetEvaluation(selectedAssetId);
    }
  };

  const handleAddEvidence = (evidenceData: Omit<any, 'id' | 'uploadDate'>) => {
    const newEvidence = {
      ...evidenceData,
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      uploadDate: new Date().toISOString(),
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

  // Calculate DNSH status summary
  const getDnshSummary = () => {
    const totalAssets = operation.assets.length;
    let compliant = 0;
    let nonCompliant = 0;
    let conditional = 0;
    let notAssessed = 0;

    operation.assets.forEach(asset => {
      const status = asset.dnshEvaluation?.overallStatus || 'Not Assessed';
      switch (status) {
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

    return { totalAssets, compliant, nonCompliant, conditional, notAssessed };
  };

  // Calculate status per objective using centralized function
  const getObjectiveStatus = (objective: DnshObjective) => {
    const stats = calculateObjectiveStats(operation, objective);
    return {
      compliant: stats.compliant,
      total: stats.totalAssessed,
      progress: stats.progress
    };
  };

  const getObjectiveIcon = (objective: DnshObjective) => {
    switch (objective) {
      case DnshObjective.MITIGATION: return <ShieldCheck size={16} className="text-emerald-600" />;
      case DnshObjective.ADAPTATION: return <AlertTriangle size={16} className="text-amber-600" />;
      case DnshObjective.WATER: return <Droplets size={16} className="text-blue-600" />;
      case DnshObjective.CIRCULAR: return <RefreshCw size={16} className="text-purple-600" />;
      case DnshObjective.POLLUTION: return <XCircle size={16} className="text-red-600" />;
      case DnshObjective.BIODIVERSITY: return <Leaf size={16} className="text-green-600" />;
      default: return <CheckCircle size={16} />;
    }
  };

  const getObjectiveColor = (objective: DnshObjective) => {
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

  const dnshSummary = getDnshSummary();

  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  return (
    <div className={`h-full flex flex-col transition-colors ${themeClasses.bg.primary}`}>
      {/* Breadcrumb Navigation */}
      <div className={`border-b px-6 py-2 transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
        <div className={`flex items-center space-x-2 text-xs font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>
          <span>DASHBOARD</span>
          <ChevronRight size={12} />
          <span>OPS</span>
          <ChevronRight size={12} />
          <span className={`font-medium transition-colors ${themeClasses.text.primary}`}>{operation.name.toUpperCase().replace(/\s/g, '_')}</span>
        </div>
      </div>

      {/* Header */}
      <div className={`border-b px-6 py-4 transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-1 font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>{operation.name.toUpperCase().replace(/\s/g, '_')}</h1>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBack();
              }}
              className={`text-xs transition-colors flex items-center font-mono uppercase tracking-wider cursor-pointer active:scale-[0.95] ${themeClasses.text.tertiary} ${themeClasses.button.ghost}`}
            >
              <ArrowLeft size={12} className="mr-1" />
              BACK_TO_DASHBOARD
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              type="button"
              className="px-4 py-2 bg-[#111111] border border-[#1a1a1a] text-[#666666] rounded-lg font-medium hover:bg-[#1a1a1a] hover:text-white transition-all flex items-center font-mono uppercase tracking-wider text-xs cursor-pointer active:scale-[0.95]"
            >
              <Edit size={14} className="mr-2" />
              EDIT_OP
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigateToDnshEvaluation();
              }}
              className="px-4 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium shadow-lg shadow-[#00ff88]/20 hover:bg-[#00ff88]/80 hover:shadow-xl hover:shadow-[#00ff88]/30 transition-all flex items-center font-mono uppercase tracking-wider text-xs cursor-pointer active:scale-[0.95]"
            >
              <CheckCircle size={14} className="mr-2" />
              DNSH_EVAL
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Operation Info & Assets */}
        <div className={`w-80 ${themeClasses.bg.secondary} ${themeClasses.border.default} border-r flex flex-col overflow-hidden`}>
          {/* Operation Info Card */}
          <div className={`p-6 border-b ${themeClasses.border.default} ${themeClasses.bg.tertiary}`}>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-lg font-bold ${themeClasses.text.primary} mb-1 font-mono uppercase tracking-wider`}>{operation.name.toUpperCase().replace(/\s/g, '_')}</h2>
                  <p className={`text-xs ${themeClasses.text.tertiary} font-mono uppercase`}>{operation.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className={`${themeClasses.text.tertiary} text-xs block mb-1 font-mono uppercase tracking-wider`}>NACE_SECTOR</span>
                  <span className={`font-semibold ${themeClasses.text.primary} font-mono`}>{operation.sectorNACE}</span>
                </div>
                <div>
                  <span className={`${themeClasses.text.tertiary} text-xs block mb-1 font-mono uppercase tracking-wider`}>LOCATION</span>
                  <span className={`font-semibold ${themeClasses.text.primary} font-mono uppercase`}>{operation.country}</span>
                </div>
                <div>
                  <span className={`${themeClasses.text.tertiary} text-xs block mb-1 font-mono uppercase tracking-wider`}>TOTAL_CAPEX</span>
                  <span className={`font-semibold ${themeClasses.text.primary} font-mono`}>€{(operation.capex / 1000000).toFixed(1)}M</span>
                </div>
                <div>
                  <span className={`${themeClasses.text.tertiary} text-xs block mb-1 font-mono uppercase tracking-wider`}>STATUS</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono uppercase tracking-wider ${
                    operation.status === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                    operation.status === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                  }`}>
                    {operation.status.replace(/\s/g, '_')}
                  </span>
                </div>
              </div>

              {/* DNSH Summary */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-3 border ${themeClasses.border.default}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>DNSH_STATUS</span>
                  {dnshSummary.totalAssets > 0 ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                      dnshSummary.compliant === dnshSummary.totalAssets ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30' :
                      dnshSummary.nonCompliant > 0 ? 'bg-red-500/10 text-red-500 border border-red-500/30' :
                      dnshSummary.notAssessed === dnshSummary.totalAssets ? `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} border ${themeClasses.border.default}` :
                      'bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/30'
                    }`}>
                      {dnshSummary.compliant}/{dnshSummary.totalAssets} COMPLIANT
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} border ${themeClasses.border.default}`}>
                      NO_ASSETS_EVAL
                    </span>
                  )}
                </div>
                {dnshSummary.totalAssets > 0 ? (
                  <div className={`flex items-center space-x-2 text-xs ${themeClasses.text.tertiary} font-mono`}>
                    {dnshSummary.compliant > 0 && <span className="text-[#00ff88]">{dnshSummary.compliant} ✓</span>}
                    {dnshSummary.nonCompliant > 0 && <span className="text-red-500">{dnshSummary.nonCompliant} ✗</span>}
                    {dnshSummary.conditional > 0 && <span className="text-[#ffb800]">{dnshSummary.conditional} ⚠</span>}
                    {dnshSummary.notAssessed > 0 && (
                      <span className={`${themeClasses.text.tertiary} italic`} title="Assets without DNSH evaluation">
                        {dnshSummary.notAssessed} ○ NOT_ASSESSED
                      </span>
                    )}
                  </div>
                ) : (
                  <p className={`text-xs ${themeClasses.text.tertiary} italic font-mono`}>NO_ASSETS_EVALUATED_FOR_DNSH_COMPLIANCE_YET</p>
                )}
              </div>

              {/* DNSH Objectives Quick Access */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-3 border ${themeClasses.border.default}`}>
                <h4 className={`text-xs font-semibold ${themeClasses.text.primary} mb-2 flex items-center font-mono uppercase tracking-wider`}>
                  <Target size={12} className="mr-1" />
                  OBJETIVOS_DNSH
                </h4>
                <div className="space-y-1.5">
                  {DNSH_CHECKLIST_TEMPLATES.map((template) => {
                      const objective = template.objective;
                      const status = getObjectiveStatus(objective);
                      const color = getObjectiveColor(objective);
                      const isSubstantial = operation.substantialContributionId === objective;
                      
                      return (
                        <button
                          key={objective}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onNavigateToDnshObjective) {
                              onNavigateToDnshObjective(objective);
                            } else {
                              onNavigateToDnshEvaluation();
                            }
                          }}
                          className={`w-full text-left p-2 rounded border transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                            isSubstantial 
                              ? (color === 'emerald' ? 'bg-[#00ff88]/10 border-[#00ff88]/30 hover:bg-[#00ff88]/15 hover:shadow-lg hover:shadow-[#00ff88]/10' :
                                 color === 'amber' ? 'bg-[#ffb800]/10 border-[#ffb800]/30 hover:bg-[#ffb800]/15 hover:shadow-lg hover:shadow-[#ffb800]/10' :
                                 color === 'blue' ? 'bg-[#00a8ff]/10 border-[#00a8ff]/30 hover:bg-[#00a8ff]/15 hover:shadow-lg hover:shadow-[#00a8ff]/10' :
                                 color === 'purple' ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15 hover:shadow-lg hover:shadow-purple-500/10' :
                                 color === 'red' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15 hover:shadow-lg hover:shadow-red-500/10' :
                                 color === 'green' ? 'bg-[#00ff88]/10 border-[#00ff88]/30 hover:bg-[#00ff88]/15 hover:shadow-lg hover:shadow-[#00ff88]/10' :
                                 `${themeClasses.bg.secondary} ${themeClasses.border.default} hover:${themeClasses.bg.hover}`)
                              : `${themeClasses.bg.secondary} ${themeClasses.border.default} hover:border-[#00ff88]/20 hover:${themeClasses.bg.hover} active:${themeClasses.bg.secondary}`
                          }`}
                        >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {getObjectiveIcon(objective)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">{objectiveNumbers[objective]}</span>
                                <span className="text-xs font-medium text-white truncate font-mono uppercase tracking-wider" title={objectiveLabels[objective]}>{objectiveLabels[objective].toUpperCase().replace(/\s/g, '_')}</span>
                                {isSubstantial && (
                                  <Sparkles size={10} className={`flex-shrink-0 ${
                                    color === 'emerald' ? 'text-emerald-600' :
                                    color === 'amber' ? 'text-amber-600' :
                                    color === 'blue' ? 'text-blue-600' :
                                    color === 'purple' ? 'text-purple-600' :
                                    color === 'red' ? 'text-red-600' :
                                    color === 'green' ? 'text-green-600' :
                                    'text-slate-600'
                                  }`} />
                                )}
                              </div>
                              <div className="flex items-center space-x-1 mt-0.5">
                                <div className={`flex-1 h-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                                  <div 
                                    className={`h-1 rounded-full ${
                                      color === 'emerald' ? 'bg-emerald-500' :
                                      color === 'amber' ? 'bg-amber-500' :
                                      color === 'blue' ? 'bg-blue-500' :
                                      color === 'purple' ? 'bg-purple-500' :
                                      color === 'red' ? 'bg-red-500' :
                                      color === 'green' ? 'bg-green-500' :
                                      theme === 'dark' ? 'bg-slate-500' : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${status.progress}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] ${themeClasses.text.tertiary} whitespace-nowrap ml-1`}>
                                  {status.compliant}/{status.total}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigateToDnshEvaluation();
                  }}
                  className="w-full mt-2 px-3 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg text-xs font-medium hover:bg-[#00ff88]/80 transition-all flex items-center justify-center font-mono uppercase tracking-wider cursor-pointer active:scale-[0.95] shadow-lg shadow-[#00ff88]/20 hover:shadow-xl hover:shadow-[#00ff88]/30"
                >
                  <CheckCircle size={14} className="mr-1.5" />
                  EVALUACION_COMPLETA
                </button>
              </div>
            </div>
          </div>

          {/* Assets List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="mb-3 flex items-center justify-between">
              <h3 className={`font-semibold ${themeClasses.text.primary} text-sm font-mono uppercase tracking-wider`}>ASSETS ({operation.assets.length})</h3>
              <span className={`text-xs ${themeClasses.text.tertiary} font-mono uppercase tracking-wider`}>CLICK_PARA_VER_EN_MAPA</span>
            </div>
            <div className="space-y-2">
              {operation.assets.map(asset => {
                const isSelected = selectedAssetId === asset.id;
                const status = asset.dnshEvaluation?.overallStatus || 'Not Assessed';
                
                return (
                  <div
                    key={asset.id}
                    onClick={() => handleAssetClick(asset.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAssetClick(asset.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select asset ${asset.name}`}
                    aria-current={isSelected ? 'true' : 'false'}
                    className={`p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                      isSelected
                        ? 'bg-[#00ff88]/10 border-[#00ff88]/30 shadow-lg shadow-[#00ff88]/10'
                        : `${themeClasses.bg.secondary} ${themeClasses.border.default} hover:border-[#00ff88]/30 hover:${themeClasses.bg.hover} hover:shadow-md hover:shadow-[#00ff88]/5 active:${themeClasses.bg.secondary}`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          asset.assetType.includes('Solar') || asset.assetType.includes('Wind')
                            ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                            : 'bg-[#00a8ff]/20 text-[#00a8ff] border border-[#00a8ff]/30'
                        }`}>
                          {asset.assetType.includes('Solar') || asset.assetType.includes('Wind') ? (
                            <Zap size={16} />
                          ) : (
                            <Building size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate font-mono uppercase tracking-wider ${
                            isSelected ? 'text-[#00ff88]' : themeClasses.text.primary
                          }`}>
                            {asset.name.replace(/\s/g, '_')}
                          </p>
                          <p className={`text-xs ${themeClasses.text.tertiary} truncate font-mono uppercase`}>
                            {asset.assetType.replace(/\s/g, '_')}
                            {asset.attributes.yearBuilt && ` • ${asset.attributes.yearBuilt}`}
                            {asset.attributes.siteType && ` • ${asset.attributes.siteType.replace(/\s/g, '_')}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2">
                      <div className={`flex items-center space-x-2 ${themeClasses.text.tertiary}`}>
                        <MapPin size={12} />
                        <span className="font-mono">{asset.lat.toFixed(2)}, {asset.lng.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${themeClasses.text.primary} font-mono`}>€{(asset.exposedValue / 1000000).toFixed(1)}M</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          status === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                          status === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          status === 'Conditional' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                          `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} border ${themeClasses.border.default}`
                        }`}>
                          {status.charAt(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Main Content - Integrated Map View */}
        <div className={`flex-1 flex flex-col overflow-hidden ${themeClasses.bg.primary} relative`}>
          {/* Floating Action Bar */}
          <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEvidencePanel(!showEvidencePanel);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center backdrop-blur-md border shadow-lg font-mono uppercase tracking-wider cursor-pointer active:scale-[0.95] ${
                showEvidencePanel
                  ? 'bg-[#00ff88] text-[#0a0a0a] border-[#00ff88] shadow-xl shadow-[#00ff88]/20'
                  : 'bg-[#0a0a0a]/90 text-white border-[#1a1a1a] hover:bg-[#111111] hover:border-[#00ff88]/30 hover:shadow-xl hover:shadow-[#00ff88]/10 active:bg-[#0a0a0a]'
              }`}
            >
              <FileText size={16} className="mr-2" />
              EVIDENCIAS
              {operation.evidenceDocuments && operation.evidenceDocuments.length > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-mono uppercase ${
                  showEvidencePanel ? 'bg-[#0a0a0a]/20' : 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                }`}>
                  {operation.evidenceDocuments.length}
                </span>
              )}
            </button>
          </div>

          {/* Map Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {operation.assets && operation.assets.length > 0 ? (
              <>
                <MapViewer 
                  assets={operation.assets} 
                  activeLayers={[]} 
                  theme="dark"
                  onAssetClick={handleAssetClick}
                  focusedAssetId={selectedAssetId}
                  statusMeta={{
                    title: operation.name,
                    scenario: undefined,
                  }}
                />
                
                {/* Asset Detail Panel Overlay */}
                {showAssetDetail && selectedAsset && (
                  <AssetDetailPanel
                    asset={selectedAsset}
                    onClose={handleCloseAssetDetail}
                    onNavigateToEvaluation={handleNavigateToAssetEvaluation}
                  />
                )}

                {/* Evidence Panel Overlay (Slide-in from right) */}
                {showEvidencePanel && (
                  <div className="absolute top-0 right-0 bottom-0 w-96 max-w-[calc(100vw-2rem)] bg-[#0a0a0a] shadow-2xl z-30 border-l border-[#1a1a1a] flex flex-col">
                    <div className="p-4 border-b border-[#1a1a1a] bg-[#111111] flex items-center justify-between flex-shrink-0">
                      <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">EVIDENCE</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowEvidencePanel(false);
                        }}
                        className="p-1 hover:bg-[#1a1a1a] rounded transition-all cursor-pointer active:scale-[0.90]"
                      >
                        <X size={20} className="text-[#666666]" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <EvidenceRegistry
                        operation={operation}
                        onAddEvidence={handleAddEvidence}
                        onDeleteEvidence={handleDeleteEvidence}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[#666666]">
                <p className="font-mono uppercase tracking-wider">NO_ASSETS_AVAILABLE_FOR_THIS_OPERATION</p>
              </div>
            )}
          </div>

          {/* Map Info Overlay (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-20 bg-[#0a0a0a]/80 backdrop-blur-md border border-[#1a1a1a] rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-3 text-sm text-[#a0a0a0]">
              <MapPin size={16} className="text-[#00ff88]" />
              <div>
                <p className="text-xs text-[#666666] font-mono uppercase tracking-wider">ASSETS_EN_MAPA</p>
                <p className="font-bold text-white font-mono">{operation.assets.length} UBICACIONES</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationDetailPage;
