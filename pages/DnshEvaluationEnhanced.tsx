/**
 * Enhanced DNSH Evaluation Page
 * Comprehensive evaluation with:
 * - Portfolio/Asset granular views
 * - Flexible asset grouping
 * - Integrated questionnaires
 * - Scenario reference comparisons
 * - Modular, collapsible sections
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Droplets, RefreshCw, Leaf, Zap, 
  FileText, MapPin, ChevronDown, ChevronUp, Grid, List, Layers, Filter, 
  ShieldCheck, Database, Eye, EyeOff, BarChart3, TrendingUp, Clock, Info
} from 'lucide-react';
import { Operation, DnshObjective, Asset, EvidenceDocument, AssetDnshEvaluation, AssetDnshAnswer } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
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
import DnshAdaptationPage from './DnshAdaptation';

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
  operation, 
  onBack, 
  onUpdateOperation,
  initialAssetId = null,
  initialObjective = DnshObjective.MITIGATION
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  // View configuration
  const [viewMode, setViewMode] = useState<ViewMode>(initialAssetId ? 'Asset' : 'Portfolio');
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>('ByAssetType');
  const [selectedObjective, setSelectedObjective] = useState<DnshObjective>(initialObjective);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialAssetId);
  
  // Checklist answers state (for asset-level evaluation)
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, AssetDnshAnswer>>({});
  
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
    }
    
    // Update local state to reflect saved evaluation
    setChecklistAnswers({});
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
                    className={`w-full flex items-center justify-between p-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] pointer-events-auto relative z-10 ${
                      value 
                        ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/15 shadow-sm shadow-[#00ff88]/10' 
                        : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default} ${
                            theme === 'dark'
                              ? 'hover:text-white hover:border-[#1a1a1a] hover:bg-[#0a0a0a]'
                              : 'hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                          } active:${themeClasses.bg.secondary}`
                    }`}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <span>{labelMap[key] || key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}</span>
                    {value ? <Eye size={12} /> : <EyeOff size={12} />}
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
          
          {viewMode === 'Asset' && selectedAssetId && (
            <AssetView
              asset={operation.assets.find(a => a.id === selectedAssetId)!}
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
            />
          )}
        </div>
      </div>
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
  onSelectAsset
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [saved, setSaved] = useState(false);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false); // Collapsed by default to save space
  const evaluation = asset.dnshEvaluation;
  
  // Use centralized service for status
  const status = getAssetObjectiveStatus(asset, selectedObjective);
  
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
            <span className={`px-4 py-2 rounded text-sm font-bold font-mono uppercase tracking-wider ${getStatusColor(status)}`}>
              {status.replace(/\s/g, '_')}
            </span>
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
      {showEvidence && evaluation && (
        <div className={`border rounded-xl p-6 transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
          <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-4 transition-colors ${themeClasses.text.primary}`}>EVIDENCE</h4>
          <div className="space-y-2">
            {(() => {
              let evidenceIds: string[] = [];
              switch (selectedObjective) {
                case DnshObjective.MITIGATION:
                  evidenceIds = evaluation.mitigationEvidence || [];
                  break;
                case DnshObjective.WATER:
                  evidenceIds = evaluation.waterEvidence || [];
                  break;
                case DnshObjective.CIRCULAR:
                  evidenceIds = evaluation.circularEvidence || [];
                  break;
                case DnshObjective.POLLUTION:
                  evidenceIds = evaluation.pollutionEvidence || [];
                  break;
                case DnshObjective.BIODIVERSITY:
                  evidenceIds = evaluation.biodiversityEvidence || [];
                  break;
              }
              
              if (evidenceIds.length === 0) {
                return (
                  <div className={`text-xs font-mono italic transition-colors ${themeClasses.text.tertiary}`}>
                    NO_EVIDENCE_LINKED
                  </div>
                );
              }
              
              return evidenceIds.map(id => (
                <div key={id} className={`p-3 rounded-lg border transition-colors ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className={`text-xs font-mono transition-colors ${themeClasses.text.primary}`}>{id}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      
      {/* Materiality Assessment & Adaptation Details - COMPACT GRID LAYOUT */}
      {(showMaterialityAssessment || (showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION)) && (
        <div className={`grid grid-cols-1 ${showMaterialityAssessment && showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION ? 'lg:grid-cols-2' : ''} gap-4`}>
          {/* Materiality Assessment Section - Compact */}
          {showMaterialityAssessment && (
            <div className={`border rounded-xl overflow-hidden transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
              <div className={`p-4 border-b transition-colors ${themeClasses.border.default}`}>
                <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.primary}`}>
                  MATERIALITY_ASSESSMENT
                </h4>
                <p className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>
                  GEOGRAPHIC_CONTEXT_&_SCENARIO_COMPARISON
                </p>
              </div>
              
              {/* Map Section - Reduced height for compact layout */}
              <div className={`h-[350px] relative transition-colors ${themeClasses.bg.secondary}`}>
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
                      className={`w-full text-left p-2 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] border ${
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
          <div className={`p-6 border-t transition-colors ${themeClasses.border.default}`}>
            <h5 className={`text-xs font-bold font-mono uppercase tracking-wider mb-4 transition-colors ${themeClasses.text.primary}`}>
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
          
          {/* Adaptation Details - Compact side-by-side */}
          {showAdaptationDetails && selectedObjective === DnshObjective.ADAPTATION && (
            <div className={`border rounded-xl overflow-hidden transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
              <div className={`p-4 border-b transition-colors ${themeClasses.border.default}`}>
                <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-1 transition-colors ${themeClasses.text.primary}`}>
                  ADAPTATION_DETAILS
                </h4>
                <p className={`text-[10px] font-mono transition-colors ${themeClasses.text.tertiary}`}>
                  CLIMATE_RISK_VULNERABILITY_ASSESSMENT
                </p>
              </div>
              <div className="h-[350px] overflow-y-auto">
                <DnshAdaptationPage
                  operation={operation}
                  onBack={() => {}}
                  embedded={true}
                  selectedAssetId={asset.id}
                  onUpdateOperation={(updatedOp: Operation) => {
                    const updatedAsset = updatedOp.assets.find(a => a.id === asset.id);
                    if (updatedAsset?.dnshEvaluation) {
                      onSaveEvaluation(updatedAsset.dnshEvaluation);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DnshEvaluationEnhancedPage;
