/**
 * Enhanced DNSH Evaluation Page
 * Comprehensive evaluation with:
 * - Portfolio/Asset granular views
 * - Flexible asset grouping
 * - Integrated questionnaires
 * - Scenario reference comparisons
 * - Modular, collapsible sections
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Droplets, RefreshCw, Leaf, Zap, 
  FileText, MapPin, ChevronDown, ChevronUp, Grid, List, Layers, Filter, 
  ShieldCheck, Database, Eye, EyeOff, BarChart3, TrendingUp, Clock, Info,
  Activity, ArrowRight
} from 'lucide-react';
import { Operation, DnshObjective, Asset, EvidenceDocument, AssetDnshEvaluation, AssetDnshAnswer } from '../types';
import EvidenceModal from '../components/EvidenceModal';
import { DNSH_CHECKLIST_TEMPLATES, EU_TAXONOMY_HAZARDS } from '../constants';
import MapViewer from '../components/MapViewer';
import { findNearbyKBAs } from '../constants/kbas';
import { findNearbyWaterRiskZones } from '../constants/waterRisk';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
// Removed: getObjectiveStatusFromAsset - now using centralized getAssetObjectiveStatus from dnshEvaluationService
import { validateDnshStatus } from '../services/dnshValidation';
import { 
  createAssetGroups, 
  isHomogeneousPortfolio, 
  calculateGroupEvaluation,
  groupAssetsByType,
  groupAssetsByRiskProfile
} from '../services/assetGrouping';
import { AssetGroup } from '../types/dnshExtended';
import { 
  getAssetObjectiveStatus,
  buildEvaluationFromAnswers,
  calculateStatusFromAnswers,
  getOperationDnshStats
} from '../services/dnshEvaluationService';
import { updateAssetEvaluation, dataStore } from '../services/dataManagement';
import { useAdaptationAssessment } from '../hooks/useAdaptationAssessment';
import { ClimateScenario } from '../types';
import { CLIMATE_SCENARIOS, getScenarioById } from '../constants/climateScenarios';
import { getMeasuresByHazardSorted, getRecommendedMeasuresForCompliance, findMeasuresForCompliance, initializeCatalog } from '../services/catalogService';
import { getAllMeasures, EXTENDED_MEASURES } from '../constants/extendedMeasures';
import { AdaptationAssessment, RiskBand } from '../types';
import { AVAILABLE_MEASURES } from '../constants';
import { determineAllHazardScopes } from '../services/hazardScopeDetermination';

interface Props {
  operation: Operation;
  onBack: () => void;
  onUpdateOperation?: (operation: Operation) => void;
  initialAssetId?: string | null; // Optional: start with this asset selected
  initialObjective?: DnshObjective; // Optional: start with this objective selected
}

type ViewMode = 'Portfolio' | 'Group' | 'Asset';
type GroupingStrategy = 'ByAssetType' | 'ByRiskProfile' | 'None';

const DnshEvaluationEnhancedPage: React.FC<Props> = ({ 
  operation: initialOperation, 
  onBack, 
  onUpdateOperation,
  initialAssetId = null,
  initialObjective = DnshObjective.MITIGATION
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  // Local operation state to ensure re-renders when evaluation changes
  const [operation, setOperation] = useState<Operation>(initialOperation);
  
  // Sync with external updates
  useEffect(() => {
    setOperation(initialOperation);
  }, [initialOperation]);
  
  // Initialize catalog with measures on mount
  useEffect(() => {
    initializeCatalog(AVAILABLE_MEASURES);
  }, []);
  
  // View configuration
  const [viewMode, setViewMode] = useState<ViewMode>(initialAssetId ? 'Asset' : 'Portfolio');
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>('ByAssetType');
  const [selectedObjective, setSelectedObjective] = useState<DnshObjective>(initialObjective);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialAssetId);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null); // For Adaptation Details
  
  // Checklist answers state (for asset-level evaluation)
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, AssetDnshAnswer>>({});
  
  // Evidence modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  
  // Display sections (modular)
  const [showSections, setShowSections] = useState({
    overview: true,
    substantialContribution: true,
    objectiveEvaluations: true,
    checklist: true, // Default to true when in Asset view
    evidence: true,
    materialityAssessment: false, // Includes map and scenario comparison
    adaptationDetails: false
  });
  
  // Portfolio analysis
  const portfolioAnalysis = useMemo(() => {
    const homogeneity = isHomogeneousPortfolio(operation.assets);
    const groups = groupingStrategy !== 'None' 
      ? createAssetGroups(operation.assets, groupingStrategy)
      : [];
    
    return {
      homogeneity,
      groups,
      totalAssets: operation.assets.length,
      evaluatedAssets: operation.assets.filter(a => a.dnshEvaluation).length
    };
  }, [operation.assets, groupingStrategy]);
  
  // Auto-select grouping strategy based on homogeneity
  React.useEffect(() => {
    if (portfolioAnalysis.homogeneity.isHomogeneous && groupingStrategy === 'None') {
      setGroupingStrategy('ByAssetType');
      setViewMode('Group');
    }
  }, [portfolioAnalysis.homogeneity.isHomogeneous]);
  
  // Selected group assets
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return portfolioAnalysis.groups.find(g => g.id === selectedGroupId) || null;
  }, [selectedGroupId, portfolioAnalysis.groups]);
  
  const selectedGroupAssets = useMemo(() => {
    if (!selectedGroup) return [];
    return operation.assets.filter(a => selectedGroup.assetIds.includes(a.id));
  }, [selectedGroup, operation.assets]);
  
  // Objective stats - Use centralized service for consistency
  const objectiveStats = useMemo(() => {
    const stats: Record<DnshObjective, ReturnType<typeof getOperationDnshStats>> = {} as any;
    Object.values(DnshObjective).forEach(obj => {
      stats[obj] = getOperationDnshStats(operation, obj);
    });
    return stats;
  }, [operation]);
  
  // Group evaluation for selected group
  const groupEvaluation = useMemo(() => {
    if (!selectedGroup) return null;
    
    const evalData: Record<DnshObjective, ReturnType<typeof calculateGroupEvaluation>> = {} as any;
    Object.values(DnshObjective).forEach(obj => {
      evalData[obj] = calculateGroupEvaluation(selectedGroup, operation.assets, obj);
    });
    
    return evalData;
  }, [selectedGroup, operation.assets]);
  
  const toggleSection = (section: keyof typeof showSections) => {
    setShowSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      return newState;
    });
  };
  
  // Handler to select asset from map
  const handleSelectAssetFromMap = (assetId: string) => {
    setSelectedAssetId(assetId);
    setViewMode('Asset');
    // Scroll to top of asset view
    setTimeout(() => {
      const element = document.querySelector('.flex-1.overflow-y-auto');
      if (element) {
        element.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };
  
  // Handle saving asset evaluation
  const handleSaveAssetEvaluation = (assetId: string, evaluation: AssetDnshEvaluation) => {
    // Update in data store first (ensures all views are notified)
    updateAssetEvaluation(assetId, evaluation);
    
    // Also update via callback for immediate local state update
    if (onUpdateOperation) {
      const updatedOperation: Operation = {
        ...operation,
        assets: operation.assets.map(a => 
          a.id === assetId 
            ? { ...a, dnshEvaluation: evaluation }
            : a
        )
      };
      onUpdateOperation(updatedOperation);
      
      // Force re-render by updating operation state
      // This ensures AdaptationDetailsContent sees the updated asset.dnshEvaluation
      setOperation(updatedOperation);
    }
    
    // Update local state to reflect saved evaluation
    setChecklistAnswers({});
  };

  // Handle evidence operations
  const handleAddEvidence = (evidence: Omit<EvidenceDocument, 'id' | 'uploadDate'>) => {
    const newEvidence: EvidenceDocument = {
      ...evidence,
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
    setOperation(updatedOperation);
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    const updatedOperation: Operation = {
      ...operation,
      evidenceDocuments: (operation.evidenceDocuments || []).filter(ev => ev.id !== evidenceId)
    };

    if (onUpdateOperation) {
      onUpdateOperation(updatedOperation);
    }
    setOperation(updatedOperation);
  };
  
  // Load existing answers when asset is selected
  React.useEffect(() => {
    if (selectedAssetId && viewMode === 'Asset') {
      const asset = operation.assets.find(a => a.id === selectedAssetId);
      if (asset?.dnshEvaluation?.checklistAnswers) {
        const answers: Record<string, AssetDnshAnswer> = {};
        Object.entries(asset.dnshEvaluation.checklistAnswers).forEach(([objective, objAnswers]) => {
          Object.entries(objAnswers).forEach(([questionId, answer]) => {
            answers[questionId] = {
              assetId: asset.id,
              questionId,
              objective: objective as DnshObjective,
              response: answer.response,
              evidence: answer.evidence,
              supportingDocuments: answer.evidenceIds || [],
              assessedBy: 'Current User',
              assessedDate: answer.assessedDate || new Date().toISOString(),
            };
          });
        });
        setChecklistAnswers(answers);
      } else {
        setChecklistAnswers({});
      }
    }
  }, [selectedAssetId, viewMode, operation.assets]);
  
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Compliant':
        return theme === 'dark'
          ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
          : 'bg-green-50 text-green-600 border border-green-200';
      case 'Non-Compliant':
        return theme === 'dark'
          ? 'bg-red-500/10 text-red-500 border border-red-500/30'
          : 'bg-red-50 text-red-600 border border-red-200';
      case 'Conditional':
        return theme === 'dark'
          ? 'bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/30'
          : 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'Not Assessed':
        return `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default}`;
      default:
        return `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default}`;
    }
  }, [theme, themeClasses]);
  
  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'MITIGATION',
    [DnshObjective.ADAPTATION]: 'ADAPTATION',
    [DnshObjective.WATER]: 'WATER',
    [DnshObjective.CIRCULAR]: 'CIRCULAR',
    [DnshObjective.POLLUTION]: 'POLLUTION',
    [DnshObjective.BIODIVERSITY]: 'BIODIVERSITY',
  };
  
  return (
    <div className={`h-full flex flex-col transition-colors ${themeClasses.bg.primary} ${themeClasses.text.primary}`}>
      {/* Header */}
      <div className={`border-b px-8 py-4 transition-colors ${themeClasses.border.default} ${themeClasses.bg.secondary}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${themeClasses.bg.hover} ${themeClasses.text.tertiary} ${themeClasses.button.ghost}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className={`text-2xl font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
                DNSH_EVAL_ENHANCED: {operation.name.toUpperCase().replace(/\s/g, '_')}
              </h1>
              <p className={`text-xs font-mono uppercase tracking-wider mt-1 transition-colors ${themeClasses.text.tertiary}`}>
                {operation.assets.length} ASSETS • {portfolioAnalysis.evaluatedAssets} EVALUATED
              </p>
            </div>
          </div>
          
          {/* View Mode Selector */}
          <div className={`flex items-center space-x-2 rounded-lg p-1 border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
            <button
              onClick={() => setViewMode('Portfolio')}
              className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] ${
                viewMode === 'Portfolio' 
                  ? theme === 'dark'
                    ? 'bg-[#00ff88] text-[#0a0a0a] shadow-lg shadow-[#00ff88]/20'
                    : 'bg-[#0066cc] text-white shadow-lg shadow-[#0066cc]/20'
                  : `${themeClasses.text.tertiary} ${themeClasses.button.ghost}`
              }`}
            >
              <BarChart3 size={14} className="inline mr-2" />
              PORTFOLIO
            </button>
            <button
              onClick={() => setViewMode('Group')}
              className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] ${
                viewMode === 'Group' 
                  ? theme === 'dark'
                    ? 'bg-[#00ff88] text-[#0a0a0a] shadow-lg shadow-[#00ff88]/20'
                    : 'bg-[#0066cc] text-white shadow-lg shadow-[#0066cc]/20'
                  : `${themeClasses.text.tertiary} ${themeClasses.button.ghost}`
              }`}
            >
              <Layers size={14} className="inline mr-2" />
              GROUP
            </button>
            <button
              onClick={() => setViewMode('Asset')}
              className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] ${
                viewMode === 'Asset' 
                  ? theme === 'dark'
                    ? 'bg-[#00ff88] text-[#0a0a0a] shadow-lg shadow-[#00ff88]/20'
                    : 'bg-[#0066cc] text-white shadow-lg shadow-[#0066cc]/20'
                  : `${themeClasses.text.tertiary} ${themeClasses.button.ghost}`
              }`}
            >
              <List size={14} className="inline mr-2" />
              ASSET
            </button>
          </div>
        </div>
        
        {/* Grouping Strategy Selector */}
        {viewMode === 'Group' && (
          <div className="flex items-center space-x-4 mt-4">
            <span className={`text-xs font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>GROUPING:</span>
            <div className="flex items-center space-x-2">
              {(['ByAssetType', 'ByRiskProfile', 'None'] as GroupingStrategy[]).map(strategy => (
                <button
                  key={strategy}
                  onClick={() => setGroupingStrategy(strategy)}
                  className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border ${
                    groupingStrategy === strategy
                      ? theme === 'dark'
                        ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30 shadow-sm shadow-[#00ff88]/10'
                        : 'bg-[#0066cc]/20 text-[#0066cc] border-[#0066cc]/30 shadow-sm shadow-[#0066cc]/10'
                      : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default} ${themeClasses.button.ghost}`
                  }`}
                >
                  {strategy.replace(/([A-Z])/g, ' $1').trim()}
                </button>
              ))}
            </div>
            {portfolioAnalysis.homogeneity.isHomogeneous && (
              <div className={`flex items-center space-x-2 text-xs font-mono transition-colors ${
                theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
              }`}>
                <CheckCircle size={12} />
                <span>HOMOGENEOUS_PORTFOLIO ({Math.round(portfolioAnalysis.homogeneity.homogeneityScore * 100)}%)</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Objectives & Navigation */}
        <div className={`w-64 border-r overflow-y-auto transition-colors ${themeClasses.border.default} ${themeClasses.bg.secondary}`}>
          <div className="p-4">
            <h3 className={`text-xs font-bold font-mono uppercase tracking-wider mb-4 transition-colors ${themeClasses.text.primary}`}>OBJECTIVES</h3>
            <div className="space-y-1">
              {Object.values(DnshObjective).map(obj => {
                const stats = objectiveStats[obj];
                const isActive = selectedObjective === obj;
                
                return (
                  <button
                    key={obj}
                    onClick={() => setSelectedObjective(obj)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer active:scale-[0.98] ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-[#00ff88]/10 border-[#00ff88]/30 text-white shadow-lg shadow-[#00ff88]/10'
                          : 'bg-[#0066cc]/10 border-[#0066cc]/30 text-gray-900 shadow-lg shadow-[#0066cc]/10'
                        : `${themeClasses.bg.tertiary} ${themeClasses.border.default} ${themeClasses.text.tertiary} ${
                            theme === 'dark'
                              ? 'hover:text-white hover:border-[#00ff88]/20 hover:bg-[#111111]'
                              : 'hover:text-gray-900 hover:border-[#0066cc]/20 hover:bg-gray-50'
                          } active:${themeClasses.bg.secondary}`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono uppercase tracking-wider">{objectiveLabels[obj]}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusColor(
                        stats.totalAssessed > 0 
                          ? (stats.compliant === stats.totalAssessed ? 'Compliant' : 
                             stats.nonCompliant > 0 ? 'Non-Compliant' : 'Conditional')
                          : 'Not Assessed'
                      ).split(' ')[0]} ${getStatusColor(
                        stats.totalAssessed > 0 
                          ? (stats.compliant === stats.totalAssessed ? 'Compliant' : 
                             stats.nonCompliant > 0 ? 'Non-Compliant' : 'Conditional')
                          : 'Not Assessed'
                      ).split(' ')[1]}`}>
                        {stats.compliant}/{stats.totalAssessed}
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-1 mt-2 transition-colors ${themeClasses.border.default} bg-opacity-20`} style={{ backgroundColor: theme === 'dark' ? '#1a1a1a' : '#e5e7eb' }}>
                      <div 
                        className={`h-1 rounded-full transition-colors ${
                          stats.progress === 100 
                            ? theme === 'dark' ? 'bg-[#00ff88]' : 'bg-[#0066cc]'
                            : theme === 'dark' ? 'bg-[#ffb800]' : 'bg-[#ff9500]'
                        }`}
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <div className={`text-[10px] font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>
                      {stats.progress}% COMPLIANT
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Display Sections Toggle */}
          <div className={`p-4 border-t transition-colors ${themeClasses.border.default}`}>
            <h3 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 transition-colors ${themeClasses.text.primary}`}>DISPLAY_SECTIONS</h3>
            <div className="space-y-2">
              {Object.entries(showSections).map(([key, value]) => {
                // Map friendly labels
                const labelMap: Record<string, string> = {
                  overview: 'OVERVIEW',
                  substantialContribution: 'SUBSTANTIAL_CONTRIBUTION',
                  objectiveEvaluations: 'OBJECTIVE_EVALUATIONS',
                  checklist: 'CHECKLIST',
                  evidence: 'EVIDENCE',
                  materialityAssessment: 'MATERIALITY_ASSESSMENT',
                  adaptationDetails: 'ADAPTATION_DETAILS'
                };
                
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Special handling for sections that require Asset view
                      const requiresAssetView = ['materialityAssessment', 'checklist', 'evidence', 'adaptationDetails'].includes(key);
                      
                      if (requiresAssetView && viewMode !== 'Asset') {
                        // Switch to Asset view and select first asset if none selected
                        if (!selectedAssetId && operation.assets.length > 0) {
                          setSelectedAssetId(operation.assets[0].id);
                        }
                        setViewMode('Asset');
                      }
                      
                      toggleSection(key as keyof typeof showSections);
                    }}
                    onMouseDown={(e) => {
                      // Ensure click is handled
                      e.stopPropagation();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] pointer-events-auto relative z-10 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                      value 
                        ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/15 shadow-sm shadow-[#00ff88]/10' 
                        : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default} ${
                            theme === 'dark'
                              ? 'hover:text-white hover:border-[#1a1a1a] hover:bg-[#0a0a0a]'
                              : 'hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                          } active:${themeClasses.bg.secondary}`
                    }`}
                    style={{ pointerEvents: 'auto' }}
                    aria-label={`${value ? 'Hide' : 'Show'} ${labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}`}
                    aria-pressed={value}
                  >
                    <span>{labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</span>
                    {value ? <Eye size={12} aria-hidden="true" /> : <EyeOff size={12} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Section */}
          {showSections.overview && (
            <div className={`mb-6 border rounded-xl p-6 transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>PORTFOLIO_OVERVIEW</h2>
                <button
                  onClick={() => toggleSection('overview')}
                  className={`transition-colors ${themeClasses.text.tertiary} ${themeClasses.button.ghost}`}
                >
                  <ChevronUp size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>TOTAL_ASSETS</div>
                  <div className={`text-2xl font-bold font-mono transition-colors ${themeClasses.text.primary}`}>{operation.assets.length}</div>
                </div>
                <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>EVALUATED</div>
                  <div className={`text-2xl font-bold font-mono transition-colors ${themeClasses.text.primary}`}>{portfolioAnalysis.evaluatedAssets}</div>
                </div>
                <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>HOMOGENEITY</div>
                  <div className={`text-2xl font-bold font-mono transition-colors ${
                    theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
                  }`}>
                    {Math.round(portfolioAnalysis.homogeneity.homogeneityScore * 100)}%
                  </div>
                </div>
                <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>GROUPS</div>
                  <div className={`text-2xl font-bold font-mono transition-colors ${themeClasses.text.primary}`}>{portfolioAnalysis.groups.length}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Portfolio/Group/Asset View */}
          {viewMode === 'Portfolio' && (
            <PortfolioView 
              operation={operation}
              selectedObjective={selectedObjective}
              objectiveStats={objectiveStats}
              getStatusColor={getStatusColor}
              onSelectAsset={(id) => {
                setSelectedAssetId(id);
                setViewMode('Asset');
              }}
            />
          )}
          
          {viewMode === 'Group' && (
            <GroupView
              groups={portfolioAnalysis.groups}
              operation={operation}
              selectedGroupId={selectedGroupId}
              selectedObjective={selectedObjective}
              groupEvaluation={groupEvaluation}
              getStatusColor={getStatusColor}
              onSelectGroup={(id) => setSelectedGroupId(id)}
              onSelectAsset={(id) => {
                setSelectedAssetId(id);
                setViewMode('Asset');
              }}
            />
          )}
          
          {viewMode === 'Asset' && selectedAssetId && (() => {
            // Get current asset from operation state (ensures it updates when operation changes)
            const currentAsset = operation.assets.find(a => a.id === selectedAssetId);
            if (!currentAsset) return null;
            
            return (
              <AssetView
                asset={currentAsset}
                operation={operation}
                selectedObjective={selectedObjective}
                getStatusColor={getStatusColor}
                showChecklist={showSections.checklist}
                showEvidence={showSections.evidence}
                showMaterialityAssessment={showSections.materialityAssessment}
                showAdaptationDetails={showSections.adaptationDetails}
                checklistAnswers={checklistAnswers}
                onAnswersChange={setChecklistAnswers}
                onSaveEvaluation={(evaluation) => handleSaveAssetEvaluation(selectedAssetId, evaluation)}
              onSelectAsset={handleSelectAssetFromMap}
              selectedHazardId={selectedHazardId}
              onSelectHazard={setSelectedHazardId}
              selectedAssetId={selectedAssetId}
              onShowEvidenceModal={() => setShowEvidenceModal(true)}
              theme={theme}
            />
            );
          })()}
        </div>
      </div>
      
      {/* Evidence Modal - Outside AssetView to access parent state */}
      <EvidenceModal
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
        evidenceDocuments={operation.evidenceDocuments || []}
        onAddEvidence={handleAddEvidence}
        onDeleteEvidence={handleDeleteEvidence}
        assetId={selectedAssetId || undefined}
        operationId={operation.id}
      />
    </div>
  );
};

// Portfolio View Component
const PortfolioView: React.FC<{
  operation: Operation;
  selectedObjective: DnshObjective;
  objectiveStats: Record<DnshObjective, ReturnType<typeof getOperationDnshStats>>;
  getStatusColor: (status: string) => string;
  onSelectAsset: (id: string) => void;
}> = ({ operation, selectedObjective, objectiveStats, getStatusColor, onSelectAsset }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const stats = objectiveStats[selectedObjective];
  
  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
        <h3 className={`text-lg font-bold font-mono uppercase tracking-wider mb-4 transition-colors ${themeClasses.text.primary}`}>
          {selectedObjective.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
        </h3>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
            <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>COMPLIANT</div>
            <div className={`text-2xl font-bold font-mono transition-colors ${
              theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'
            }`}>{stats.compliant}</div>
          </div>
          <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
            <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>NON_COMPLIANT</div>
            <div className={`text-2xl font-bold font-mono transition-colors ${
              theme === 'dark' ? 'text-red-500' : 'text-red-600'
            }`}>{stats.nonCompliant}</div>
          </div>
          <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
            <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>CONDITIONAL</div>
            <div className={`text-2xl font-bold font-mono transition-colors ${
              theme === 'dark' ? 'text-[#ffb800]' : 'text-amber-600'
            }`}>{stats.conditional}</div>
          </div>
          <div className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
            <div className={`text-xs font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>NOT_ASSESSED</div>
            <div className={`text-2xl font-bold font-mono transition-colors ${themeClasses.text.tertiary}`}>{stats.notAssessed}</div>
          </div>
        </div>
        
        {/* Assets List */}
        <div className="space-y-2">
          {operation.assets.map(asset => {
              // Use centralized service for consistent status
              const status = getAssetObjectiveStatus(asset, selectedObjective);
            
            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${
                  status === 'Compliant' 
                    ? theme === 'dark'
                      ? 'bg-[#00ff88]/5 border-[#00ff88]/20 hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30 hover:shadow-lg hover:shadow-[#00ff88]/10'
                      : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 hover:shadow-lg hover:shadow-green-200'
                    : status === 'Non-Compliant'
                      ? theme === 'dark'
                        ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/10'
                        : 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300 hover:shadow-lg hover:shadow-red-200'
                      : status === 'Conditional'
                        ? theme === 'dark'
                          ? 'bg-[#ffb800]/5 border-[#ffb800]/20 hover:bg-[#ffb800]/10 hover:border-[#ffb800]/30 hover:shadow-lg hover:shadow-[#ffb800]/10'
                          : 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-200'
                        : `${themeClasses.bg.tertiary} ${themeClasses.border.default} ${themeClasses.card.hover}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`text-sm font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
                      {asset.name.replace(/\s/g, '_')}
                    </div>
                    <div className={`text-xs font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>
                      {asset.assetType} • €{(asset.exposedValue / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${getStatusColor(status)}`}>
                    {status.replace(/\s/g, '_')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Group View Component
const GroupView: React.FC<{
  groups: AssetGroup[];
  operation: Operation;
  selectedGroupId: string | null;
  selectedObjective: DnshObjective;
  groupEvaluation: Record<DnshObjective, ReturnType<typeof calculateGroupEvaluation>> | null;
  getStatusColor: (status: string) => string;
  onSelectGroup: (id: string) => void;
  onSelectAsset: (id: string) => void;
}> = ({ groups, operation, selectedGroupId, selectedObjective, groupEvaluation, getStatusColor, onSelectGroup, onSelectAsset }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  return (
    <div className="space-y-4">
      {groups.map(group => {
        const isSelected = selectedGroupId === group.id;
        const evalData = groupEvaluation?.[selectedObjective];
        const groupAssets = operation.assets.filter(a => group.assetIds.includes(a.id));
        
        return (
          <div
            key={group.id}
            className={`border rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] ${
              isSelected 
                ? theme === 'dark'
                  ? 'border-[#00ff88]/30 bg-[#00ff88]/5 shadow-lg shadow-[#00ff88]/10'
                  : 'border-[#0066cc]/30 bg-[#0066cc]/5 shadow-lg shadow-[#0066cc]/10'
                : `${themeClasses.card.bg} ${themeClasses.card.border} ${
                    theme === 'dark' 
                      ? 'hover:border-[#00ff88]/20 hover:bg-[#111111]' 
                      : 'hover:border-[#0066cc]/20 hover:bg-gray-50'
                  }`
            }`}
            onClick={() => onSelectGroup(group.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className={`text-sm font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
                  {group.name.replace(/\s/g, '_')}
                </h4>
                <p className={`text-xs font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>
                  {group.assetIds.length} ASSETS • {group.evaluationApproach} EVALUATION
                </p>
              </div>
              {evalData && (
                <span className={`px-3 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${getStatusColor(evalData.status)}`}>
                  {evalData.status.replace(/\s/g, '_')} ({evalData.complianceRate}%)
                </span>
              )}
            </div>
            
            {isSelected && (
              <div className={`mt-4 space-y-2 border-t pt-4 transition-colors ${themeClasses.border.default}`}>
                {groupAssets.map(asset => {
                  // Use centralized service for consistent status
                  const status = getAssetObjectiveStatus(asset, selectedObjective);
                  
                  return (
                    <div
                      key={asset.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAsset(asset.id);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${
                        status === 'Compliant' 
                          ? theme === 'dark'
                            ? 'bg-[#00ff88]/5 border-[#00ff88]/20 hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30 hover:shadow-md hover:shadow-[#00ff88]/10'
                            : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 hover:shadow-md hover:shadow-green-200'
                          : `${themeClasses.bg.tertiary} ${themeClasses.border.default} ${themeClasses.card.hover}`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
                          {asset.name.replace(/\s/g, '_')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${getStatusColor(status)}`}>
                          {status.replace(/\s/g, '_')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Asset View Component - INTEGRATED EVALUATION
const AssetView: React.FC<{
  asset: Asset;
  operation: Operation;
  selectedObjective: DnshObjective;
  getStatusColor: (status: string) => string;
  showChecklist: boolean;
  showEvidence: boolean;
  showMaterialityAssessment: boolean;
  showAdaptationDetails: boolean;
  checklistAnswers: Record<string, AssetDnshAnswer>;
  onAnswersChange: (answers: Record<string, AssetDnshAnswer>) => void;
  onSaveEvaluation: (evaluation: AssetDnshEvaluation) => void;
  onSelectAsset: (assetId: string) => void;
  selectedHazardId: string | null;
  onSelectHazard: (hazardId: string | null) => void;
  selectedAssetId: string | null;
  onShowEvidenceModal: () => void;
}> = ({ 
  asset, 
  operation, 
  selectedObjective, 
  getStatusColor, 
  showChecklist, 
  showEvidence, 
  showMaterialityAssessment,
  showAdaptationDetails,
  checklistAnswers,
  onAnswersChange,
  onSaveEvaluation,
  onSelectAsset,
  selectedHazardId,
  onSelectHazard,
  selectedAssetId,
  onShowEvidenceModal
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  // Pass theme to AdaptationDetailsContent
  const themeProp = theme;
  const [saved, setSaved] = useState(false);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false); // Collapsed by default to save space
  const evaluation = asset.dnshEvaluation;
  
  // Auto-determined scope state (fallback when manual scope not set) - Shared between Materiality Assessment and Adaptation Details
  const [autoDeterminedScopes, setAutoDeterminedScopes] = useState<Record<string, 'In Scope' | 'Out of Scope'>>({});
  const [isDeterminingScopes, setIsDeterminingScopes] = useState(false);
  
  // Determine scopes automatically if not manually set
  useEffect(() => {
    const hasManualScopes = asset.attributes.adaptationHazardScope && 
      Object.keys(asset.attributes.adaptationHazardScope).length > 0;
    
    if (!hasManualScopes && selectedObjective === DnshObjective.ADAPTATION) {
      setIsDeterminingScopes(true);
      determineAllHazardScopes(asset, ClimateScenario.SSP2_45)
        .then(scopes => {
          const simplified: Record<string, 'In Scope' | 'Out of Scope'> = {};
          Object.entries(scopes).forEach(([hazardId, result]) => {
            simplified[hazardId] = result.scope;
          });
          setAutoDeterminedScopes(simplified);
        })
        .catch(err => {
          console.error('Error determining hazard scopes:', err);
        })
        .finally(() => {
          setIsDeterminingScopes(false);
        });
    } else {
      setAutoDeterminedScopes({});
    }
  }, [asset.id, asset.attributes.adaptationHazardScope, selectedObjective]);
  
  // Calculate hazard scope status (use manual if available, otherwise use auto-determined) - Shared logic
  const hazardScopeStatus = useMemo(() => {
    const status: Record<string, 'In Scope' | 'Out of Scope' | 'Not Set'> = {};
    const hasManualScopes = asset.attributes.adaptationHazardScope && 
      Object.keys(asset.attributes.adaptationHazardScope).length > 0;
    
    EU_TAXONOMY_HAZARDS.forEach(hazard => {
      if (hasManualScopes) {
        // Use manual scope if available
        const scope = asset.attributes.adaptationHazardScope?.[hazard.id];
        status[hazard.id] = scope === 'In Scope' ? 'In Scope' : scope === 'Out of Scope' ? 'Out of Scope' : 'Not Set';
      } else {
        // Use auto-determined scope as fallback
        const autoScope = autoDeterminedScopes[hazard.id];
        status[hazard.id] = autoScope || 'Not Set';
      }
    });
    return status;
  }, [asset, autoDeterminedScopes]);
  
  // Use centralized service for status - This is the PRIMARY source of truth (from checklist)
  const status = getAssetObjectiveStatus(asset, selectedObjective);
  
  // Check if checklist has been completed for this objective
  const hasChecklistEvaluation = asset.dnshEvaluation?.checklistAnswers?.[selectedObjective] && 
    Object.keys(asset.dnshEvaluation.checklistAnswers[selectedObjective]).length > 0;
  
  const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === selectedObjective);
  
  // Check if this is substantial contribution
  const isSubstantialContribution = asset.attributes.substantialContribution === selectedObjective;
  
  // Handle answer change
  const handleAnswerChange = (questionId: string, response: 'Yes' | 'No' | 'N/A') => {
    const newAnswers = {
      ...checklistAnswers,
      [questionId]: {
        assetId: asset.id,
        questionId,
        objective: selectedObjective,
        response,
        evidence: checklistAnswers[questionId]?.evidence || '',
        supportingDocuments: checklistAnswers[questionId]?.supportingDocuments || [],
        assessedBy: 'Current User',
        assessedDate: new Date().toISOString(),
      }
    };
    onAnswersChange(newAnswers);
    setSaved(false);
  };
  
  // Handle evidence change
  const handleEvidenceChange = (questionId: string, evidence: string) => {
    const newAnswers = {
      ...checklistAnswers,
      [questionId]: {
        ...checklistAnswers[questionId],
        assetId: asset.id,
        questionId,
        objective: selectedObjective,
        response: checklistAnswers[questionId]?.response || null,
        evidence,
        supportingDocuments: checklistAnswers[questionId]?.supportingDocuments || [],
        assessedBy: 'Current User',
        assessedDate: new Date().toISOString(),
      }
    };
    onAnswersChange(newAnswers);
    setSaved(false);
  };
  
  // Handle save
  const handleSave = () => {
    const newEvaluation = buildEvaluationFromAnswers(asset, checklistAnswers, evaluation);
    onSaveEvaluation(newEvaluation);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  // Calculate current status from answers
  const currentStatusFromAnswers = calculateStatusFromAnswers(checklistAnswers, selectedObjective, template);
  
  return (
    <div className="space-y-6">
      {/* Asset Header */}
      <div className={`border rounded-xl p-6 transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
              {asset.name.replace(/\s/g, '_')}
            </h3>
            <p className={`text-xs font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>
              {asset.assetType} • €{(asset.exposedValue / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <span className={`px-4 py-2 rounded text-sm font-bold font-mono uppercase tracking-wider ${getStatusColor(status)}`}>
                {status.replace(/\s/g, '_')}
              </span>
              {hasChecklistEvaluation && (
                <span className={`text-[9px] font-mono uppercase mt-1 ${themeClasses.text.tertiary}`}>
                  DESDE_CHECKLIST
                </span>
              )}
              {!hasChecklistEvaluation && selectedObjective === DnshObjective.ADAPTATION && (
                <span className={`text-[9px] font-mono uppercase mt-1 text-[#ffb800]`}>
                  COMPLETA_CHECKLIST
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border ${
                saved 
                  ? theme === 'dark'
                    ? 'bg-[#00ff88] text-[#0a0a0a] shadow-lg shadow-[#00ff88]/20'
                    : 'bg-[#0066cc] text-white shadow-lg shadow-[#0066cc]/20'
                  : `${themeClasses.bg.tertiary} ${themeClasses.text.primary} ${themeClasses.border.default} ${
                      theme === 'dark'
                        ? 'hover:bg-[#00ff88] hover:text-[#0a0a0a] hover:border-[#00ff88] hover:shadow-lg hover:shadow-[#00ff88]/20'
                        : 'hover:bg-[#0066cc] hover:text-white hover:border-[#0066cc] hover:shadow-lg hover:shadow-[#0066cc]/20'
                    }`
              }`}
            >
              {saved ? 'SAVED' : 'SAVE_EVAL'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Substantial Contribution Notice */}
      {isSubstantialContribution && (
        <div className={`border-l-4 p-4 rounded-r-lg transition-colors ${
          theme === 'dark' 
            ? 'bg-[#00a8ff]/10 border-[#00a8ff]' 
            : 'bg-blue-50 border-blue-400'
        }`}>
          <div className="flex items-start space-x-3">
            <CheckCircle size={20} className={`flex-shrink-0 mt-0.5 transition-colors ${
              theme === 'dark' ? 'text-[#00a8ff]' : 'text-blue-600'
            }`} />
            <div className="flex-1">
              <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.primary}`}>
                PRIMARY_CONTRIBUTION_OBJECTIVE
              </h4>
              <p className={`text-xs font-mono transition-colors ${
                theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600'
              }`}>
                THIS_ASSET_MAKES_SUBSTANTIAL_CONTRIBUTION_TO_{selectedObjective.toUpperCase().replace(/\s/g, '_')}.
                DNSH_EVAL_AUTOMATICALLY_FULFILLED_FOR_THIS_OBJECTIVE.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Checklist Section - COLLAPSIBLE */}
      {showChecklist && template && !isSubstantialContribution && (
        <div className={`border rounded-xl overflow-hidden transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
          <button
            type="button"
            onClick={() => setChecklistCollapsed(!checklistCollapsed)}
            className={`w-full p-4 flex items-center justify-between transition-colors ${
              checklistCollapsed ? '' : 'border-b'
            } ${themeClasses.border.default} ${themeClasses.bg.secondary} hover:${themeClasses.bg.hover}`}
          >
            <div className="flex items-center space-x-3">
              <ChevronDown 
                size={16} 
                className={`transition-transform transition-colors ${themeClasses.text.tertiary} ${
                  checklistCollapsed ? 'rotate-[-90deg]' : ''
                }`}
              />
              <h4 className={`text-sm font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
                CHECKLIST: {template.title.toUpperCase().replace(/\s/g, '_')}
              </h4>
            </div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono uppercase ${getStatusColor(currentStatusFromAnswers)}`}>
              {currentStatusFromAnswers.replace(/\s/g, '_')}
            </span>
          </button>
          {!checklistCollapsed && (
            <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {template.questions.map((q, idx) => {
              const answer = checklistAnswers[q.id];
              const response = answer?.response || null;
              
              return (
                <div key={q.id} className={`p-4 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className="flex items-start space-x-3 mb-3">
                    <span className={`text-xs font-mono flex-shrink-0 transition-colors ${themeClasses.text.tertiary}`}>{idx + 1}.</span>
                    <div className="flex-1">
                      <p className={`text-sm font-mono mb-1 transition-colors ${themeClasses.text.primary}`}>{q.text}</p>
                      <p className={`text-xs font-mono transition-colors ${themeClasses.text.tertiary}`}>{q.guidance}</p>
                    </div>
                  </div>
                  
                  {/* Answer Buttons */}
                  <div className="flex items-center space-x-2 mb-3">
                    {(['Yes', 'No', 'N/A'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAnswerChange(q.id, opt);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border ${
                          response === opt
                            ? opt === 'Yes' 
                              ? theme === 'dark'
                                ? 'bg-[#00ff88] text-[#0a0a0a] shadow-lg shadow-[#00ff88]/20'
                                : 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                              : opt === 'No'
                              ? theme === 'dark'
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                              : theme === 'dark'
                                ? 'bg-[#ffb800] text-[#0a0a0a] shadow-lg shadow-[#ffb800]/20'
                                : 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                            : `${themeClasses.bg.secondary} ${themeClasses.text.tertiary} ${themeClasses.border.default} ${
                                theme === 'dark'
                                  ? 'hover:text-white hover:bg-[#111111] hover:border-[#1a1a1a]'
                                  : 'hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300'
                              } active:${themeClasses.bg.secondary}`
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  
                  {/* Evidence Input */}
                  <textarea
                    value={answer?.evidence || ''}
                    onChange={(e) => handleEvidenceChange(q.id, e.target.value)}
                    placeholder="EVIDENCE / NOTES..."
                    className={`w-full border rounded p-2 text-xs font-mono transition-colors ${themeClasses.input.bg} ${themeClasses.input.border} ${themeClasses.input.text} ${themeClasses.input.placeholder} ${
                      theme === 'dark' ? 'focus:border-[#00ff88]/30' : 'focus:border-[#0066cc]/30'
                    } focus:outline-none`}
                    rows={2}
                  />
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}
      
      {/* Evidence Section */}
      {showEvidence && (
        <div className={`border rounded-xl p-4 transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
              EVIDENCE
            </h4>
            <button
              onClick={onShowEvidenceModal}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 flex items-center space-x-2 ${
                theme === 'dark'
                  ? 'bg-[#00ff88] text-[#0a0a0a] border-[#00ff88] hover:bg-[#00ff88]/80'
                  : 'bg-[#0066cc] text-white border-[#0066cc] hover:bg-[#0066cc]/80'
              }`}
            >
              <FileText size={14} />
              <span>GESTIONAR_EVIDENCIAS</span>
            </button>
          </div>
          
          {/* Quick preview - Show count and recent evidence */}
          {(() => {
            const assetEvidence = (operation.evidenceDocuments || []).filter(ev => ev.assetId === asset.id);
            const objectiveEvidence = assetEvidence.filter(ev => ev.relatedObjective === selectedObjective);
            
            if (objectiveEvidence.length === 0 && assetEvidence.length === 0) {
              return (
                <div className={`text-xs font-mono italic transition-colors ${themeClasses.text.tertiary} text-center py-4`}>
                  NO_HAY_EVIDENCIAS_SUBIDAS
                </div>
              );
            }
            
            return (
              <div className="space-y-2">
                <div className={`text-xs font-mono transition-colors ${themeClasses.text.tertiary}`}>
                  {objectiveEvidence.length > 0 
                    ? `${objectiveEvidence.length} EVIDENCIA(S)_PARA_${selectedObjective}`
                    : `${assetEvidence.length} EVIDENCIA(S)_PARA_ESTE_ASSET`
                  }
                </div>
                {objectiveEvidence.slice(0, 3).map(ev => (
                  <div key={ev.id} className={`p-2 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default} flex items-center justify-between`}>
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText size={14} className={`flex-shrink-0 ${themeClasses.text.tertiary}`} />
                      <span className={`text-xs font-mono truncate transition-colors ${themeClasses.text.primary}`}>
                        {ev.name}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase transition-colors ${themeClasses.text.tertiary} ml-2`}>
                      {ev.type}
                    </span>
                  </div>
                ))}
                {(objectiveEvidence.length > 3 || assetEvidence.length > objectiveEvidence.length) && (
                  <button
                    onClick={onShowEvidenceModal}
                    className={`w-full text-xs font-mono uppercase transition-colors ${themeClasses.text.tertiary} hover:${themeClasses.text.primary} text-center py-2`}
                  >
                    VER_TODAS ({assetEvidence.length})
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Materiality Assessment & Adaptation Details - COMPACT GRID LAYOUT */}
      {(showMaterialityAssessment || (showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION)) && (
        <div className={`grid grid-cols-1 ${showMaterialityAssessment && showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION ? 'lg:grid-cols-2' : ''} gap-4`} style={{ maxHeight: showMaterialityAssessment && showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION ? 'calc(100vh - 400px)' : 'none' }}>
          {/* Materiality Assessment Section - Compact */}
          {showMaterialityAssessment && (
            <div className={`border rounded-xl overflow-hidden flex flex-col transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`} style={{ maxHeight: showMaterialityAssessment && showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION ? 'calc(100vh - 400px)' : 'none' }}>
              <div className={`p-4 border-b flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
                <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.primary}`}>
                  MATERIALITY_ASSESSMENT
                </h4>
                <p className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>
                  GEOGRAPHIC_CONTEXT_&_HAZARD_SCOPE
                </p>
              </div>
              
              {/* Scope In/Out Hazards Display - ONLY in Materiality Assessment */}
              {selectedObjective === DnshObjective.ADAPTATION && (() => {
                // Use shared hazardScopeStatus calculated above
                
                return (
                  <div className={`p-4 border-b flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
                    <h5 className={`text-xs font-bold mb-3 flex items-center font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                      <Activity size={14} className="mr-2 text-[#00a8ff]" />
                      HAZARD_SCOPE_ASSESSMENT
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      {/* In Scope Hazards */}
                      <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#00ff88] font-mono uppercase">IN_SCOPE</span>
                          <span className={`text-xs font-bold font-mono ${themeClasses.text.primary}`}>
                            {Object.values(hazardScopeStatus).filter(s => s === 'In Scope').length}
                          </span>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                          {EU_TAXONOMY_HAZARDS
                            .filter(h => hazardScopeStatus[h.id] === 'In Scope')
                            .map(hazard => (
                              <button
                                key={hazard.id}
                                type="button"
                                onClick={() => {
                                  onSelectHazard(hazard.id);
                                }}
                                className={`w-full flex items-center space-x-2 text-[10px] font-mono uppercase transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 rounded ${
                                  selectedHazardId === hazard.id ? 'opacity-100 font-bold' : 'opacity-70'
                                }`}
                                aria-label={`Select hazard ${hazard.name}`}
                              >
                                <div className="w-2 h-2 rounded-full bg-[#00ff88] flex-shrink-0"></div>
                                <span className={`truncate text-left ${themeClasses.text.primary}`}>{hazard.name.replace(/\s/g, '_')}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                      {/* Out of Scope Hazards */}
                      <div className="bg-[#666666]/20 border border-[#666666]/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#666666] font-mono uppercase">OUT_OF_SCOPE</span>
                          <span className={`text-xs font-bold font-mono ${themeClasses.text.primary}`}>
                            {Object.values(hazardScopeStatus).filter(s => s === 'Out of Scope').length}
                          </span>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                          {EU_TAXONOMY_HAZARDS
                            .filter(h => hazardScopeStatus[h.id] === 'Out of Scope')
                            .map(hazard => (
                              <div key={hazard.id} className={`flex items-center space-x-2 text-[10px] font-mono uppercase`} aria-label={`Hazard ${hazard.name} is out of scope`}>
                                <div className="w-2 h-2 rounded-full bg-[#666666] flex-shrink-0"></div>
                                <span className={`truncate ${themeClasses.text.tertiary}`}>{hazard.name.replace(/\s/g, '_')}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Map Section - ONLY in Materiality Assessment */}
              <div className={`flex-1 min-h-0 relative transition-colors ${themeClasses.bg.secondary}`} style={{ minHeight: '300px', maxHeight: showMaterialityAssessment && showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION ? '350px' : '400px' }}>
            <MapViewer 
              assets={operation.assets}
              activeLayers={[]}
              theme={theme}
              onAssetClick={(assetId) => {
                onSelectAsset(assetId);
              }}
              focusedAssetId={asset.id}
              showKBAs={selectedObjective === DnshObjective.BIODIVERSITY}
              kbas={operation.assets.flatMap(a => findNearbyKBAs(a.lat, a.lng, 50))}
              showWaterRisk={selectedObjective === DnshObjective.WATER}
              waterRiskZones={operation.assets.flatMap(a => findNearbyWaterRiskZones(a.lat, a.lng, 50))}
              statusMeta={{
                title: `${operation.name} - ${asset.name}`,
                scenario: selectedObjective === DnshObjective.ADAPTATION ? 'SSP2-4.5' : undefined,
              }}
            />
            
            {/* Map Info Overlay */}
            <div className={`absolute top-4 left-4 z-20 backdrop-blur-md border rounded-lg p-3 shadow-lg transition-colors ${
              theme === 'dark' 
                ? 'bg-[#0a0a0a]/90 border-[#1a1a1a]' 
                : 'bg-white/90 border-gray-200'
            }`}>
              <div className={`flex items-center space-x-3 text-sm transition-colors ${
                theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600'
              }`}>
                <MapPin size={16} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'} />
                <div>
                  <p className={`text-xs font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>ASSET_SELECTED</p>
                  <p className={`font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>{asset.name.replace(/\s/g, '_')}</p>
                  <p className={`text-[10px] font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>
                    {operation.assets.length} ASSETS_EN_PORTFOLIO • CLICK_PARA_NAVEGAR
                  </p>
                </div>
              </div>
            </div>
            
            {/* Portfolio Assets List Overlay */}
            <div className={`absolute top-4 right-4 z-20 backdrop-blur-md border rounded-lg p-3 shadow-lg max-w-xs max-h-[400px] overflow-y-auto transition-colors ${
              theme === 'dark' 
                ? 'bg-[#0a0a0a]/90 border-[#1a1a1a]' 
                : 'bg-white/90 border-gray-200'
            }`}>
              <p className={`text-xs font-mono uppercase tracking-wider mb-2 sticky top-0 pb-2 border-b transition-colors ${
                theme === 'dark' 
                  ? 'text-[#666666] bg-[#0a0a0a] border-[#1a1a1a]' 
                  : 'text-gray-500 bg-white border-gray-200'
              }`}>PORTFOLIO_ASSETS</p>
              <div className="space-y-1">
                {operation.assets.map(a => {
                  const isCurrent = a.id === asset.id;
                  const status = a.dnshEvaluation?.overallStatus || 'Not Assessed';
                  
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectAsset(a.id);
                      }}
                      className={`w-full text-left p-2 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                        isCurrent
                          ? theme === 'dark'
                            ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30 shadow-sm shadow-[#00ff88]/10'
                            : 'bg-green-50 text-green-600 border-green-200 shadow-sm shadow-green-200'
                          : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default} ${
                              theme === 'dark'
                                ? 'hover:bg-[#0a0a0a] hover:text-white hover:border-[#00ff88]/20'
                                : 'hover:bg-gray-50 hover:text-gray-900 hover:border-[#0066cc]/20'
                            }`
                      }`}
                      aria-label={`Select asset ${a.name}`}
                      aria-current={isCurrent ? 'true' : 'false'}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{a.name.replace(/\s/g, '_')}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 transition-colors ${
                          status === 'Compliant' 
                            ? theme === 'dark' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-green-50 text-green-600'
                            : status === 'Non-Compliant'
                              ? theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
                              : status === 'Conditional'
                                ? theme === 'dark' ? 'bg-[#ffb800]/20 text-[#ffb800]' : 'bg-amber-50 text-amber-600'
                                : theme === 'dark' ? 'bg-[#1a1a1a] text-[#666666]' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {status.charAt(0)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Scenario Comparison Section */}
          <div className={`p-4 border-t flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
            <h5 className={`text-xs font-bold font-mono uppercase tracking-wider mb-3 transition-colors ${themeClasses.text.primary}`}>
              ESCENARIOS_DE_REFERENCIA_VS_MATERIALIDAD
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border transition-all ${themeClasses.bg.tertiary} ${themeClasses.border.default} ${
                theme === 'dark' ? 'hover:border-[#00ff88]/30' : 'hover:border-green-300'
              }`}>
                <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>SSP1-2.6</div>
                <div className={`text-sm font-bold font-mono transition-colors ${
                  theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'
                }`}>OPTIMISTIC</div>
                <div className={`text-[10px] font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>ΔT_2050: +1.5°C</div>
                <div className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>SLR_2050: +15CM</div>
              </div>
              <div className={`p-4 rounded-lg border transition-all ${themeClasses.bg.tertiary} ${themeClasses.border.default} ${
                theme === 'dark' ? 'hover:border-[#00a8ff]/30' : 'hover:border-blue-300'
              }`}>
                <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>SSP2-4.5</div>
                <div className={`text-sm font-bold font-mono transition-colors ${
                  theme === 'dark' ? 'text-[#00a8ff]' : 'text-blue-600'
                }`}>MODERATE</div>
                <div className={`text-[10px] font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>ΔT_2050: +2.0°C</div>
                <div className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>SLR_2050: +20CM</div>
              </div>
              <div className={`p-4 rounded-lg border transition-all ${themeClasses.bg.tertiary} ${themeClasses.border.default} ${
                theme === 'dark' ? 'hover:border-red-500/30' : 'hover:border-red-300'
              }`}>
                <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.tertiary}`}>SSP5-8.5</div>
                <div className={`text-sm font-bold font-mono transition-colors ${
                  theme === 'dark' ? 'text-red-500' : 'text-red-600'
                }`}>PESSIMISTIC</div>
                <div className={`text-[10px] font-mono mt-1 transition-colors ${themeClasses.text.tertiary}`}>ΔT_2050: +2.7°C</div>
                <div className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>SLR_2050: +30CM</div>
              </div>
            </div>
            <div className={`mt-3 text-[10px] font-mono italic transition-colors ${themeClasses.text.tertiary}`}>
              COMPARACION_VS_UMBRALES_DE_MATERIALIDAD_DEFINIDOS_POR_OBJETIVO_DNSH
            </div>
          </div>
            </div>
          )}
          
          {/* Adaptation Details - Show only adaptation content for selected hazard */}
          {showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION && (
            <AdaptationDetailsContent
              asset={asset}
              operation={operation}
              selectedHazardId={selectedHazardId}
              onSelectHazard={onSelectHazard}
              onSaveEvaluation={onSaveEvaluation}
              themeClasses={themeClasses}
              theme={themeProp}
              hazardScopeStatus={hazardScopeStatus}
              autoDeterminedScopes={autoDeterminedScopes}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Adaptation Details Component - Shows only adaptation content (not full DnshAdaptationPage)
const AdaptationDetailsContent: React.FC<{
  asset: Asset;
  operation: Operation;
  selectedHazardId: string | null;
  onSelectHazard: (hazardId: string | null) => void;
  onSaveEvaluation: (evaluation: AssetDnshEvaluation) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  hazardScopeStatus: Record<string, 'In Scope' | 'Out of Scope' | 'Not Set'>;
  autoDeterminedScopes: Record<string, 'In Scope' | 'Out of Scope'>;
}> = ({ asset, operation, selectedHazardId, onSelectHazard, onSaveEvaluation, themeClasses, theme, hazardScopeStatus: providedHazardScopeStatus, autoDeterminedScopes: providedAutoDeterminedScopes }) => {
  const [selectedScenario, setSelectedScenario] = useState<ClimateScenario>(ClimateScenario.SSP2_45);
  const [selectedHorizon, setSelectedHorizon] = useState<'2030' | '2050' | '2100'>('2050');
  
  // Load saved measures from asset evaluation
  const savedMeasures = useMemo(() => {
    const measures: Record<string, string[]> = {};
    if (asset.dnshEvaluation?.adaptationMeasures) {
      // Group measures by hazard (we need to check which hazard each measure mitigates)
      asset.dnshEvaluation.adaptationMeasures.forEach(measureId => {
        const measure = getAllMeasures().find(m => m.id === measureId);
        if (measure) {
          // Find which hazards this measure mitigates
          measure.hazardMitigation?.forEach(hm => {
            if (!measures[hm.hazardId]) {
              measures[hm.hazardId] = [];
            }
            if (!measures[hm.hazardId].includes(measureId)) {
              measures[hm.hazardId].push(measureId);
            }
          });
        }
      });
    }
    return measures;
  }, [asset.dnshEvaluation?.adaptationMeasures]);
  
  const [selectedMeasures, setSelectedMeasures] = useState<Record<string, string[]>>({});
  
  // Load measures for current hazard when hazard changes
  useEffect(() => {
    if (selectedHazardId) {
      setSelectedMeasures(prev => ({
        ...prev,
        [selectedHazardId]: savedMeasures[selectedHazardId] || []
      }));
    }
  }, [selectedHazardId, savedMeasures]);
  
  // Get adaptation assessments
  const {
    assessments,
    risks,
    loading
  } = useAdaptationAssessment({
    operation,
    selectedAssetId: asset.id,
    selectedScenario,
    selectedHorizon
  });
  
  // Use provided hazardScopeStatus from parent (AssetView) to ensure consistency
  const hazardScopeStatus = providedHazardScopeStatus;
  
  // Get in-scope hazards
  const inScopeHazards = useMemo(() => {
    return EU_TAXONOMY_HAZARDS.filter(h => hazardScopeStatus[h.id] === 'In Scope');
  }, [hazardScopeStatus]);
  
  // Auto-select first in-scope hazard if none selected
  useEffect(() => {
    if (!selectedHazardId && inScopeHazards.length > 0) {
      onSelectHazard(inScopeHazards[0].id);
    }
  }, [selectedHazardId, inScopeHazards, onSelectHazard]);
  
  const selectedHazard = selectedHazardId ? EU_TAXONOMY_HAZARDS.find(h => h.id === selectedHazardId) : null;
  const selectedAssessment = assessments.find(a => a.hazardTypeId === selectedHazardId);
  
  // Helper function to calculate DNSH status from risk band
  const calculateDnshStatus = (riskBand: RiskBand | string): 'Compliant' | 'Non-Compliant' | 'Conditional' => {
    const band = typeof riskBand === 'string' ? riskBand : riskBand;
    if (band === 'Very High' || band === 'High') return 'Non-Compliant';
    if (band === 'Moderate') return 'Conditional';
    return 'Compliant';
  };
  
  // Calculate post-measures status using proper risk engine logic
  const calculatePostMeasuresStatus = useCallback((assessment: AdaptationAssessment, measureIds: string[]): {
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
      return acc + ((measure.riskReductionPercentage || 0) / 100);
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
  }, []);
  
  // Calculate post-measures status
  const postMeasuresData = useMemo(() => {
    if (!selectedAssessment) return null;
    const measures = selectedMeasures[selectedAssessment.hazardTypeId] || [];
    if (measures.length === 0) return null;
    return calculatePostMeasuresStatus(selectedAssessment, measures);
  }, [selectedAssessment, selectedMeasures, calculatePostMeasuresStatus]);
  
  // Get measures for selected hazard - Use getAllMeasures directly to ensure measures are available
  const relevantMeasures = useMemo(() => {
    if (!selectedHazardId) return [];
    // Try catalog first, fallback to direct getAllMeasures
    const catalogMeasures = getMeasuresByHazardSorted(selectedHazardId);
    if (catalogMeasures.length > 0) {
      return catalogMeasures.map(m => m.measure);
    }
    // Fallback: filter measures directly from EXTENDED_MEASURES
    return getAllMeasures().filter(measure => {
      // Check if measure mitigates this hazard
      const hasHazardMitigation = measure.hazardMitigation?.some(hm => hm.hazardId === selectedHazardId);
      const mitigatesHazard = measure.mitigatesHazards?.includes(selectedHazardId) || 
                              measure.applicableHazards?.includes(selectedHazardId);
      return hasHazardMitigation || mitigatesHazard;
    });
  }, [selectedHazardId]);
  
  const toggleMeasure = (measureId: string) => {
    if (!selectedHazardId) return;
    setSelectedMeasures(prev => {
      const current = prev[selectedHazardId] || [];
      const newMeasures = current.includes(measureId)
        ? current.filter(id => id !== measureId)
        : [...current, measureId];
      return { ...prev, [selectedHazardId]: newMeasures };
    });
  };
  
  // Save adaptation measures to asset evaluation
  // IMPORTANT: Measures are qualitative support only. Checklist is the primary source of truth.
  // Measures are saved PER HAZARD, not globally.
  const handleSaveMeasures = () => {
    if (!selectedAssessment || !selectedHazardId) return;
    
    const measures = selectedMeasures[selectedAssessment.hazardTypeId] || [];
    if (measures.length === 0) return;
    
    // Calculate post-measures status (qualitative only)
    const postMeasures = calculatePostMeasuresStatus(selectedAssessment, measures);
    
    // Get current evaluation or create new one
    const currentEvaluation = asset.dnshEvaluation || {
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
    
    // Get existing measures grouped by hazard
    const existingMeasuresByHazard: Record<string, string[]> = {};
    if (currentEvaluation.adaptationMeasures) {
      currentEvaluation.adaptationMeasures.forEach(measureId => {
        const measure = getAllMeasures().find(m => m.id === measureId);
        if (measure?.hazardMitigation) {
          measure.hazardMitigation.forEach(hm => {
            if (!existingMeasuresByHazard[hm.hazardId]) {
              existingMeasuresByHazard[hm.hazardId] = [];
            }
            if (!existingMeasuresByHazard[hm.hazardId].includes(measureId)) {
              existingMeasuresByHazard[hm.hazardId].push(measureId);
            }
          });
        }
      });
    }
    
    // Update measures for THIS hazard only
    existingMeasuresByHazard[selectedAssessment.hazardTypeId] = measures;
    
    // Flatten back to array (all measures across all hazards)
    const allMeasures = [...new Set(Object.values(existingMeasuresByHazard).flat())];
    
    // Get primary status from checklist (if available)
    const checklistStatus = getAssetObjectiveStatus(asset, DnshObjective.ADAPTATION);
    const hasChecklist = currentEvaluation.checklistAnswers?.[DnshObjective.ADAPTATION] && 
      Object.keys(currentEvaluation.checklistAnswers[DnshObjective.ADAPTATION]).length > 0;
    
    // Update evaluation - PRESERVE checklist status as primary, measures are qualitative support
    const updatedEvaluation: AssetDnshEvaluation = {
      ...currentEvaluation,
      // Keep checklist status as primary adaptation status
      adaptationStatus: hasChecklist ? checklistStatus : currentEvaluation.adaptationStatus,
      // Store qualitative risk assessment data
      adaptationStatusPreMeasures: calculateDnshStatus(selectedAssessment.riskBand),
      adaptationStatusPostMeasures: postMeasures.dnshStatus, // Qualitative reference only
      adaptationRiskBandPreMeasures: selectedAssessment.riskBand,
      adaptationRiskBandPostMeasures: postMeasures.riskBand,
      adaptationRiskBand: postMeasures.riskBand, // Qualitative reference
      adaptationMeasures: allMeasures, // Store all measures, but grouped by hazard in logic
      adaptationNotes: hasChecklist 
        ? `Checklist completado: ${checklistStatus}. Medidas cualitativas para ${selectedHazard?.name || 'hazard'}: ${measures.length} medida(s).`
        : `Medidas de adaptación aplicadas para ${selectedHazard?.name || 'hazard'}: ${measures.length} medida(s). Estado cualitativo: ${postMeasures.dnshStatus} (${postMeasures.riskBand}). COMPLETA_EL_CHECKLIST_PARA_DETERMINAR_ESTADO_DNSH_FINAL.`,
      // Overall status should come from checklist, not from measures
      overallStatus: hasChecklist 
        ? (checklistStatus === 'Non-Compliant' ? 'Non-Compliant' :
           checklistStatus === 'Conditional' && currentEvaluation.overallStatus !== 'Non-Compliant' ? 'Conditional' :
           currentEvaluation.overallStatus === 'Non-Compliant' ? 'Non-Compliant' :
           checklistStatus === 'Compliant' && currentEvaluation.overallStatus === 'Conditional' ? 'Conditional' :
           currentEvaluation.overallStatus)
        : currentEvaluation.overallStatus,
    };
    
    // Save evaluation
    onSaveEvaluation(updatedEvaluation);
  };
  
  if (!selectedHazard || !selectedAssessment) {
    return (
      <div className={`border rounded-xl overflow-hidden flex flex-col transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
        <div className={`p-4 border-b flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
          <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.primary}`}>
            ADAPTATION_DETAILS
          </h4>
          <p className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>
            SELECCIONA_UN_HAZARD_IN_SCOPE_EN_MATERIALITY_ASSESSMENT
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle size={48} className={`mx-auto mb-4 ${themeClasses.text.tertiary}`} />
            <p className={`text-sm font-bold font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
              SELECCIONA_HAZARD
            </p>
            <p className={`text-xs font-mono uppercase ${themeClasses.text.tertiary}`}>
              CLICK_EN_UN_HAZARD_IN_SCOPE_EN_LA_SECCION_MATERIALITY_ASSESSMENT
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if hazard is out of scope
  if (hazardScopeStatus[selectedHazard.id] === 'Out of Scope') {
    return (
      <div className={`border rounded-xl overflow-hidden flex flex-col transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
        <div className={`p-4 border-b flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
          <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.primary}`}>
            ADAPTATION_DETAILS
          </h4>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle size={48} className={`mx-auto mb-4 ${themeClasses.text.tertiary}`} />
            <p className={`text-sm font-bold font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
              HAZARD_FUERA_DE_SCOPE
            </p>
            <p className={`text-xs font-mono uppercase ${themeClasses.text.tertiary}`}>
              {selectedHazard.name.replace(/\s/g, '_')} NO_REQUIERE_MEDIDAS_DE_ADAPTACION
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`border rounded-xl overflow-hidden flex flex-col transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`} style={{ maxHeight: 'calc(100vh - 400px)' }}>
      <div className={`p-4 border-b flex-shrink-0 transition-colors ${themeClasses.border.default}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className={`text-sm font-bold font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>
              ADAPTATION_DETAILS
            </h4>
            <p className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>
              {selectedHazard.name.replace(/\s/g, '_')}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 500px)' }}>
        {/* Primary DNSH Status from Checklist (Source of Truth) */}
        {(() => {
          // Recalculate status whenever asset.dnshEvaluation changes
          const checklistStatus = getAssetObjectiveStatus(asset, DnshObjective.ADAPTATION);
          const hasChecklistAnswers = asset.dnshEvaluation?.checklistAnswers?.[DnshObjective.ADAPTATION] && 
            Object.keys(asset.dnshEvaluation.checklistAnswers[DnshObjective.ADAPTATION]).length > 0;
          
          return (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                  ESTADO_DNSH_ADAPTACION
                </h5>
                <span className={`text-[10px] font-mono uppercase ${
                  checklistStatus === 'Compliant' && hasChecklistAnswers ? 'text-[#00ff88]' :
                  checklistStatus === 'Non-Compliant' && hasChecklistAnswers ? 'text-red-400' :
                  checklistStatus === 'Conditional' && hasChecklistAnswers ? 'text-[#ffb800]' :
                  themeClasses.text.tertiary
                }`}>
                  {hasChecklistAnswers ? 'DESDE_CHECKLIST' : 'NO_EVALUADO'}
                </span>
              </div>
              
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg border-2 ${
                checklistStatus === 'Compliant' && hasChecklistAnswers ? 'border-[#00ff88]/30 bg-[#00ff88]/10' :
                checklistStatus === 'Non-Compliant' && hasChecklistAnswers ? 'border-red-500/30 bg-red-500/10' :
                checklistStatus === 'Conditional' && hasChecklistAnswers ? 'border-[#ffb800]/30 bg-[#ffb800]/10' :
                `${themeClasses.border.default} ${themeClasses.bg.tertiary}`
              }`}>
                <div>
                  <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>ESTADO_DNSH</p>
                  <span className={`px-2 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider ${
                    checklistStatus === 'Compliant' && hasChecklistAnswers ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                    checklistStatus === 'Non-Compliant' && hasChecklistAnswers ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    checklistStatus === 'Conditional' && hasChecklistAnswers ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                    'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}>
                    {hasChecklistAnswers ? checklistStatus.replace(/\s/g, '_') : 'NO_EVALUADO'}
                  </span>
                </div>
                <div>
                  <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>FUENTE</p>
                  <p className={`text-xs font-semibold font-mono uppercase ${
                    hasChecklistAnswers ? 'text-[#00ff88]' : themeClasses.text.tertiary
                  }`}>
                    {hasChecklistAnswers ? 'CHECKLIST' : 'NO_EVALUADO'}
                  </p>
                </div>
              </div>
              
              {!hasChecklistAnswers && (
                <div className={`mt-3 p-3 rounded-lg border-2 border-[#ffb800]/30 bg-[#ffb800]/10 ${themeClasses.border.default}`}>
                  <p className={`text-[10px] font-mono uppercase text-[#ffb800] font-bold`}>
                    ⚠ COMPLETA_EL_CHECKLIST_EN_LA_SECCION_CHECKLIST_PARA_DETERMINAR_ESTADO_DNSH
                  </p>
                  <p className={`text-[9px] font-mono mt-2 ${themeClasses.text.tertiary}`}>
                    EL_ESTADO_DNSH_SOLO_SE_DETERMINA_MEDIANTE_CHECKLIST_Y_EVIDENCIAS. LAS_MEDIDAS_Y_DIAGNOSTICOS_DE_RIESGO_SON_SOLO_APOYO_CUALITATIVO.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
        
        {/* Risk Assessment - Qualitative Support (Not Primary Source) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h5 className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
              DIAGNOSTICO_CUALITATIVO_RIESGO
            </h5>
            <span className={`text-[10px] font-mono uppercase ${themeClasses.text.tertiary}`}>
              APOYO_AL_DIAGNOSTICO
            </span>
          </div>
          
          <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
            <div>
              <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>RISK_BAND</p>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase font-mono tracking-wider ${
                selectedAssessment.riskBand === 'Very High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                selectedAssessment.riskBand === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                selectedAssessment.riskBand === 'Moderate' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
              }`}>
                {selectedAssessment.riskBand.replace(/\s/g, '_')}
              </span>
            </div>
            <div>
              <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>ESTADO_REFERENCIA</p>
              <span className={`px-2 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider ${
                calculateDnshStatus(selectedAssessment.riskBand) === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                calculateDnshStatus(selectedAssessment.riskBand) === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
              }`}>
                {calculateDnshStatus(selectedAssessment.riskBand).replace(/\s/g, '_')}
              </span>
              <p className={`text-[9px] mt-1 font-mono italic ${themeClasses.text.tertiary}`}>
                (SOLO_REFERENCIA)
              </p>
            </div>
            <div>
              <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>TOTAL_SCORE_H+E+V</p>
              <p className={`text-base font-bold font-mono ${themeClasses.text.primary}`}>{selectedAssessment.totalScore} / 15</p>
            </div>
            <div>
              <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>MATERIALIDAD</p>
              <p className={`text-xs font-semibold font-mono uppercase ${selectedAssessment.materiality ? 'text-red-400' : 'text-[#00ff88]'}`}>
                {selectedAssessment.materiality ? 'MATERIAL' : 'NO_MATERIAL'}
              </p>
            </div>
          </div>
          <div className={`mt-3 p-2 rounded border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
            <p className={`text-[9px] font-mono italic ${themeClasses.text.tertiary}`}>
              NOTA: EL_ESTADO_DNSH_PRIMARIO_PROVIENE_DEL_CHECKLIST_Y_EVIDENCIAS. ESTE_DIAGNOSTICO_ES_SOLO_APOYO_CUALITATIVO_PARA_ENTENDER_EL_RIESGO_Y_SUGERIR_MEDIDAS.
            </p>
          </div>
        </div>

        {/* Post-Measures Diagnosis - Qualitative Impact */}
        {postMeasuresData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                IMPACTO_CUALITATIVO_CON_MEDIDAS
              </h5>
              <span className={`text-[10px] font-semibold font-mono uppercase text-[#00ff88]`}>
                {selectedMeasures[selectedAssessment.hazardTypeId]?.length || 0} MEDIDAS_SELECCIONADAS
              </span>
            </div>
            <div className={`mb-2 p-2 rounded border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
              <p className={`text-[9px] font-mono italic ${themeClasses.text.tertiary}`}>
                NOTA: LAS_MEDIDAS_SON_APOYO_CUALITATIVO. EL_ESTADO_DNSH_FINAL_DEPENDE_DEL_CHECKLIST_COMPLETADO_Y_EVIDENCIAS_SUBIDAS.
              </p>
            </div>
            
            <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg border-2 border-[#00ff88]/30 bg-[#00ff88]/10`}>
              <div>
                <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>RISK_BAND</p>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase font-mono tracking-wider ${
                  postMeasuresData.riskBand === 'Very High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  postMeasuresData.riskBand === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  postMeasuresData.riskBand === 'Moderate' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                  'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                }`}>
                  {postMeasuresData.riskBand.replace(/\s/g, '_')}
                </span>
              </div>
              <div>
                <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>DNSH_STATUS</p>
                <span className={`px-2 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider ${
                  postMeasuresData.dnshStatus === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                  postMeasuresData.dnshStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                }`}>
                  {postMeasuresData.dnshStatus.replace(/\s/g, '_')}
                </span>
              </div>
              <div>
                <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>TOTAL_SCORE_H+E+V</p>
                <p className={`text-base font-bold font-mono ${themeClasses.text.primary}`}>
                  {postMeasuresData.totalScore} / 15
                  {postMeasuresData.totalScore < selectedAssessment.totalScore && (
                    <span className="ml-2 text-xs text-[#00ff88]">↓ {selectedAssessment.totalScore - postMeasuresData.totalScore}</span>
                  )}
                </p>
              </div>
              <div>
                <p className={`text-[10px] mb-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>MEJORA</p>
                <p className={`text-xs font-semibold font-mono uppercase ${
                  postMeasuresData.dnshStatus === 'Compliant' && calculateDnshStatus(selectedAssessment.riskBand) !== 'Compliant' 
                    ? 'text-[#00ff88]' 
                    : postMeasuresData.totalScore < selectedAssessment.totalScore 
                    ? 'text-[#00a8ff]' 
                    : themeClasses.text.tertiary
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

        {/* Available Measures - Always show for in-scope hazards as qualitative support */}
        {relevantMeasures.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                  MEDIDAS_ADAPTACION_DISPONIBLES ({relevantMeasures.length})
                </h5>
                <p className={`text-[9px] font-mono italic mt-1 ${themeClasses.text.tertiary}`}>
                  APOYO_CUALITATIVO_PARA_ENTENDER_MITIGACION_DE_RIESGO
                </p>
              </div>
              {selectedMeasures[selectedAssessment.hazardTypeId]?.length > 0 && (
                <button
                  onClick={() => handleSaveMeasures()}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                    theme === 'dark'
                      ? 'bg-[#00ff88] text-[#0a0a0a] border-[#00ff88] hover:bg-[#00ff88]/80 shadow-lg shadow-[#00ff88]/20'
                      : 'bg-[#0066cc] text-white border-[#0066cc] hover:bg-[#0066cc]/80 shadow-lg shadow-[#0066cc]/20'
                  }`}
                  aria-label="Guardar medidas de adaptación seleccionadas"
                >
                  GUARDAR_MEDIDAS ({selectedMeasures[selectedAssessment.hazardTypeId]?.length || 0})
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {relevantMeasures.map(measure => {
                const isSelected = selectedMeasures[selectedAssessment.hazardTypeId]?.includes(measure.id);
                return (
                  <div
                    key={measure.id}
                    onClick={() => toggleMeasure(measure.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleMeasure(measure.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${isSelected ? 'Deselect' : 'Select'} measure ${measure.name}`}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 ${
                      isSelected
                        ? 'border-[#00ff88] bg-[#00ff88]/10'
                        : `${themeClasses.border.default} ${themeClasses.bg.tertiary} hover:border-[#00ff88]/30`
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'border-[#00ff88] bg-[#00ff88]' : themeClasses.border.default
                      }`}>
                        {isSelected && <CheckCircle size={12} className="text-[#0a0a0a]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                          {measure.name.replace(/\s/g, '_')}
                        </p>
                        <p className={`text-[10px] mt-1 font-mono ${themeClasses.text.tertiary}`}>
                          {measure.description?.substring(0, 100)}...
                        </p>
                        <div className="flex items-center space-x-3 mt-2 text-[10px] font-mono">
                          <span className={themeClasses.text.secondary}>COSTO: €{(measure.cost || 0).toLocaleString()}</span>
                          {(() => {
                            const hazardMitigation = measure.hazardMitigation?.find(hm => hm.hazardId === selectedAssessment.hazardTypeId);
                            const reduction = hazardMitigation?.effectiveness.overallRiskReduction || measure.riskReductionPercentage || 0;
                            return <span className={themeClasses.text.secondary}>REDUCCION: {reduction}%</span>;
                          })()}
                        </div>
                        {measure.hazardMitigation?.find(hm => hm.hazardId === selectedAssessment.hazardTypeId)?.mitigationMechanism && (
                          <p className={`text-[9px] mt-1 italic font-mono ${themeClasses.text.tertiary}`}>
                            {measure.hazardMitigation.find(hm => hm.hazardId === selectedAssessment.hazardTypeId)?.mitigationMechanism.substring(0, 120)}...
                          </p>
                        )}
                        {isSelected && (
                          <div className={`mt-2 pt-2 border-t ${themeClasses.border.default}`}>
                            <p className={`text-[9px] font-mono uppercase ${themeClasses.text.tertiary}`}>
                              ✓ MEDIDA_SELECCIONADA
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Info message if no measures needed but still show measures for user to select */}
        {!selectedAssessment.measuresRequired && relevantMeasures.length === 0 && (
          <div className={`bg-[#00ff88]/10 p-4 rounded-lg border border-[#00ff88]/30 flex items-center space-x-3 mt-6`}>
            <CheckCircle size={20} className="text-[#00ff88]" />
            <div>
              <h4 className={`font-bold text-[#00ff88] font-mono uppercase tracking-wider text-xs`}>DNSH_COMPLIANCE_CUMPLIDO</h4>
              <p className={`text-xs font-mono uppercase ${themeClasses.text.primary}`}>
                NO_SE_REQUIEREN_MEDIDAS_ESTRUCTURALES_DE_ADAPTACION
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DnshEvaluationEnhancedPage;
