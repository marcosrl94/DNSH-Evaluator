/**
 * Unified Dashboard & Geo Viewer
 * Combines dashboard metrics with geographic visualization
 * Supports granular navigation: Company → Portfolio → Asset
 */

import React, { useState, useMemo } from 'react';
import { 
  Briefcase, TrendingUp, AlertTriangle, Clock, ArrowRight, ShieldCheck, Droplets, Leaf, 
  RefreshCw, XCircle, Zap, FileText, MapPin, CheckCircle2, AlertCircle, Building2, 
  DollarSign, Percent, BarChart3, TrendingDown, Activity, Globe, List, ChevronRight,
  Building, Layers, Grid, Filter
} from 'lucide-react';
import { Operation, DnshObjective, Client, Asset } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { canDisplayDnshStatus, getSafeDnshStatus } from '../services/dnshValidation';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import MapViewer from '../components/MapViewer';
import { logger } from '../utils/logger';

type ViewMode = 'map' | 'list';
type GranularityLevel = 'company' | 'portfolio' | 'asset';

interface UnifiedDashboardProps {
  operations: Operation[];
  clients: Client[];
  onNavigateToOperation: (id: string) => void;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToAssetEvaluation?: (assetId: string) => void;
  onNavigateToDnshEvaluation?: (operationId: string, assetId?: string) => void;
}

const UnifiedDashboardPage: React.FC<UnifiedDashboardProps> = ({ 
  operations: propsOperations = [],
  clients: propsClients = [],
  onNavigateToOperation,
  onNavigateToClient,
  onNavigateToAssetEvaluation,
  onNavigateToDnshEvaluation
}) => {
  const { theme, toggleTheme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [granularityLevel, setGranularityLevel] = useState<GranularityLevel>('company');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [operations, setOperations] = useState<Operation[]>(propsOperations);
  const [clients, setClients] = useState<Client[]>(propsClients);

  React.useEffect(() => {
    setOperations(Array.isArray(propsOperations) ? propsOperations : []);
  }, [propsOperations]);

  React.useEffect(() => {
    setClients(Array.isArray(propsClients) ? propsClients : []);
  }, [propsClients]);

  // Helper to safely get operations array - must be defined before useMemo
  const safeOperations = Array.isArray(operations) ? operations : [];

  // Calculate metrics using fresh data from store
  const metrics = useMemo(() => {
    // Ensure operations is an array
    if (!Array.isArray(operations)) {
      return {
        totalOperations: 0,
        totalAssets: 0,
        objectiveCompliance: {} as any,
        overallComplianceRate: 0,
        totalDealValue: 0,
        totalCapex: 0,
        weightedAvgReturn: 0,
        totalRiskWeightedCapital: 0,
        avgRORCE: 0,
        totalRiskAdjustment: 0,
        avgRiskAdjustment: 0,
        totalSustainabilityDiscount: 0,
        avgSustainabilityDiscount: 0,
        riskDistribution: { 'Low': 0, 'Moderate': 0, 'High': 0, 'Very High': 0 },
        operationsWithHighRisk: 0
      };
    }
    
    const totalOperations = safeOperations.length;
    const totalAssets = safeOperations.reduce((sum, op) => sum + (op.assets?.length || 0), 0);
    
    const objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }> = {
      [DnshObjective.MITIGATION]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.ADAPTATION]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.WATER]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.CIRCULAR]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.POLLUTION]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.BIODIVERSITY]: { compliant: 0, total: 0, percentage: 0 },
    };

    let compliantAssets = 0;
    let nonCompliantAssets = 0;
    let conditionalAssets = 0;
    let notAssessedAssets = 0;
    let totalAAL = 0;
    let operationsWithPendingReviews = 0;

    const operationsToAnalyze = selectedClientId 
      ? safeOperations.filter(op => op.clientId === selectedClientId)
      : safeOperations;

    operationsToAnalyze.forEach(operation => {
      if (!operation.assets || !Array.isArray(operation.assets)) {
        return;
      }
      operation.assets.forEach(asset => {
        const evaluation = asset.dnshEvaluation;
        
        if (!evaluation) {
          notAssessedAssets++;
          return;
        }

        const safeOverallStatus = evaluation.overallStatus || 'Not Assessed';
        switch (safeOverallStatus) {
          case 'Compliant':
            compliantAssets++;
            break;
          case 'Non-Compliant':
            nonCompliantAssets++;
            break;
          case 'Conditional':
            conditionalAssets++;
            break;
          default:
            notAssessedAssets++;
        }

        Object.values(DnshObjective).forEach(objective => {
          const status = getSafeDnshStatus(asset, objective);
          if (status === 'Compliant') {
            objectiveCompliance[objective].compliant++;
          }
          if (status !== 'Not Assessed') {
            objectiveCompliance[objective].total++;
          }
        });

        if (evaluation.adaptationAAL) {
          totalAAL += evaluation.adaptationAAL;
        }
      });

      const hasPendingReview = operation.assets.some(asset => {
        const evaluation = asset.dnshEvaluation;
        return evaluation && (evaluation.overallStatus === 'Conditional' || evaluation.overallStatus === 'Non-Compliant');
      });
      if (hasPendingReview) operationsWithPendingReviews++;
    });

    Object.keys(objectiveCompliance).forEach(key => {
      const obj = objectiveCompliance[key as DnshObjective];
      obj.percentage = obj.total > 0 ? Math.round((obj.compliant / obj.total) * 100) : 0;
    });

    const totalAssessed = compliantAssets + nonCompliantAssets + conditionalAssets;
    const overallComplianceRate = totalAssessed > 0 
      ? Math.round((compliantAssets / totalAssessed) * 100) 
      : 0;

    return {
      totalOperations: operationsToAnalyze.length,
      totalAssets: operationsToAnalyze.reduce((sum, op) => sum + (op.assets?.length || 0), 0),
      compliantAssets,
      nonCompliantAssets,
      conditionalAssets,
      notAssessedAssets,
      overallComplianceRate,
      totalAAL,
      operationsWithPendingReviews,
      objectiveCompliance
    };
  }, [selectedClientId]);

  // Get items to display based on granularity level
  const displayItems = useMemo(() => {
    if (granularityLevel === 'company') {
      return clients.map(client => ({
        id: client.id,
        name: client.name,
        type: 'company' as const,
        operations: safeOperations.filter(op => op.clientId === client.id).length,
        assets: safeOperations.filter(op => op.clientId === client.id).reduce((sum, op) => sum + (op.assets?.length || 0), 0)
      }));
    } else if (granularityLevel === 'portfolio') {
      // Show all operations, optionally filtered by selected client
      const opsToShow = selectedClientId 
        ? safeOperations.filter(op => op.clientId === selectedClientId)
        : safeOperations;
      return opsToShow.map(op => ({
        id: op.id,
        name: op.name,
        type: 'portfolio' as const,
        assets: (op.assets?.length || 0),
        clientId: op.clientId
      }));
    } else {
      // Asset level: show assets from selected operation, or from selected client, or all
      const opsToShow = selectedOperationId
        ? safeOperations.filter(op => op.id === selectedOperationId)
        : selectedClientId
          ? safeOperations.filter(op => op.clientId === selectedClientId)
          : safeOperations;
      return opsToShow.flatMap(op => op.assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: 'asset' as const,
        assetType: asset.assetType,
        operationId: op.id,
        clientId: op.clientId,
        lat: asset.lat,
        lng: asset.lng,
        status: asset.dnshEvaluation?.overallStatus || 'Not Assessed'
      })));
    }
  }, [granularityLevel, selectedClientId, selectedOperationId, safeOperations, clients]);

  // Get assets for map view - show all assets based on granularity level
  // The map shows all assets at the current granularity level, optionally filtered by selections
  const mapAssets = useMemo(() => {
    if (granularityLevel === 'asset') {
      // Asset level: show assets from selected operation, or from selected client, or all
      const opsToShow = selectedOperationId
        ? safeOperations.filter(op => op.id === selectedOperationId)
        : selectedClientId
          ? safeOperations.filter(op => op.clientId === selectedClientId)
          : safeOperations;
      return opsToShow.flatMap(op => (op.assets || []));
    } else if (granularityLevel === 'portfolio') {
      // Portfolio level: show all assets from selected client's operations, or all if no client selected
      const opsToShow = selectedClientId
        ? safeOperations.filter(op => op.clientId === selectedClientId)
        : safeOperations;
      return opsToShow.flatMap(op => (op.assets || []));
    } else {
      // Company level - show all assets from all operations
      return safeOperations.flatMap(op => (op.assets || []));
    }
  }, [granularityLevel, selectedClientId, selectedOperationId, safeOperations]);

  const handleItemClick = (item: any) => {
    if (granularityLevel === 'company') {
      // Click on company: select it and move to portfolio level
      setSelectedClientId(item.id);
      setGranularityLevel('portfolio');
      setSelectedOperationId(null);
      setSelectedAssetId(null);
    } else if (granularityLevel === 'portfolio') {
      // Click on portfolio: select it and move to asset level
      setSelectedOperationId(item.id);
      setSelectedClientId(item.clientId); // Also set client for context
      setGranularityLevel('asset');
      setSelectedAssetId(null);
    } else {
      // Click on asset: navigate to evaluation
      setSelectedAssetId(item.id);
      if (onNavigateToAssetEvaluation) {
        onNavigateToAssetEvaluation(item.id);
      } else if (onNavigateToDnshEvaluation && item.operationId) {
        onNavigateToDnshEvaluation(item.operationId, item.id);
      }
    }
  };

  const handleBreadcrumbClick = (level: GranularityLevel) => {
    setGranularityLevel(level);
    if (level === 'company') {
      // Reset all selections when going back to company level
      setSelectedClientId(null);
      setSelectedOperationId(null);
      setSelectedAssetId(null);
    } else if (level === 'portfolio') {
      // Keep client selection, reset operation and asset
      setSelectedOperationId(null);
      setSelectedAssetId(null);
    } else {
      // Asset level: keep client and operation selections, reset asset
      setSelectedAssetId(null);
    }
  };

  // Handle granularity level change from cards - just change level without auto-selecting
  const handleGranularityLevelChange = (level: GranularityLevel) => {
    setGranularityLevel(level);
    // Only reset selections if going to a higher level
    if (level === 'company') {
      setSelectedClientId(null);
      setSelectedOperationId(null);
      setSelectedAssetId(null);
    } else if (level === 'portfolio') {
      // Keep client if selected, but don't require it
      setSelectedOperationId(null);
      setSelectedAssetId(null);
    } else {
      // Asset level: keep existing selections, but don't require them
      setSelectedAssetId(null);
    }
  };

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
  const selectedOperation = selectedOperationId ? safeOperations.find(op => op.id === selectedOperationId) : null;

  return (
    <div className={`h-full flex flex-col transition-colors ${themeClasses.bg.primary} ${themeClasses.text.primary}`}>
      {/* Header with View Toggle */}
      <div className={`border-b px-6 py-4 transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight font-mono uppercase transition-colors ${themeClasses.text.primary}`}>CMD_DASHBOARD</h1>
            <p className={`mt-1 text-xs font-mono uppercase tracking-widest transition-colors ${themeClasses.text.tertiary}`}>
              {granularityLevel === 'company' ? 'VISTA_COMPAÑIA' :
               granularityLevel === 'portfolio' ? 'VISTA_PORTFOLIO' :
               'VISTA_ASSET'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all cursor-pointer active:scale-[0.90] border ${themeClasses.button.secondary}`}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            
            {/* View Mode Toggle */}
            <div className={`flex items-center space-x-2 rounded-lg p-1 border transition-colors relative z-10 ${themeClasses.bg.tertiary} ${themeClasses.border.default}`} style={{ pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setViewMode('list');
                }}
                className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] relative z-10 ${
                  viewMode === 'list'
                    ? themeClasses.button.primary
                    : themeClasses.button.ghost
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <List size={14} className="inline mr-2" />
                LIST
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setViewMode('map');
                }}
                className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] relative z-10 ${
                  viewMode === 'map'
                    ? themeClasses.button.primary
                    : themeClasses.button.ghost
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <Globe size={14} className="inline mr-2" />
                MAP
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className={`flex items-center space-x-2 text-xs font-mono uppercase tracking-wider transition-colors ${
          theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
        }`}>
          <button
            type="button"
            onClick={() => handleBreadcrumbClick('company')}
            className={`transition-colors cursor-pointer ${
              granularityLevel === 'company' 
                ? theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
                : theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'
            }`}
          >
            COMPAÑIA
          </button>
          {selectedClient && (
            <>
              <ChevronRight size={12} />
              <button
                type="button"
                onClick={() => handleBreadcrumbClick('portfolio')}
                className={`transition-colors cursor-pointer ${
                  granularityLevel === 'portfolio' 
                    ? theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
                    : theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'
                }`}
              >
                {selectedClient.name.toUpperCase().replace(/\s/g, '_')}
              </button>
            </>
          )}
          {selectedOperation && (
            <>
              <ChevronRight size={12} />
              <button
                type="button"
                onClick={() => handleBreadcrumbClick('asset')}
                className={`transition-colors cursor-pointer ${
                  granularityLevel === 'asset' 
                    ? theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
                    : theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'
                }`}
              >
                {selectedOperation.name.toUpperCase().replace(/\s/g, '_')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Granularity Level Selector */}
      <div className={`px-6 py-4 border-b transition-colors ${
        theme === 'dark' ? 'border-[#1a1a1a] bg-[#0a0a0a]' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold font-mono uppercase tracking-wider transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              SELECCIONAR_NIVEL_DE_VISUALIZACION
            </h2>
            <div className={`text-xs font-mono uppercase tracking-wider transition-colors ${
              theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
            }`}>
              {granularityLevel === 'company' && `${clients.length} COMPAÑIAS`}
              {granularityLevel === 'portfolio' && `${selectedClientId ? safeOperations.filter(op => op.clientId === selectedClientId).length : safeOperations.length} PORTFOLIOS`}
              {granularityLevel === 'asset' && `${displayItems.length} ASSETS`}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GranularityLevelCard
              level="company"
              label="COMPAÑIA"
              description="Vista agregada por compañía"
              icon={<Building size={20} />}
              count={clients.length}
              isActive={granularityLevel === 'company'}
              onClick={() => handleGranularityLevelChange('company')}
              theme={theme}
            />
            <GranularityLevelCard
              level="portfolio"
              label="PORTFOLIO"
              description="Vista por operación/portfolio"
              icon={<Briefcase size={20} />}
              count={selectedClientId ? safeOperations.filter(op => op.clientId === selectedClientId).length : safeOperations.length}
              isActive={granularityLevel === 'portfolio'}
              onClick={() => handleGranularityLevelChange('portfolio')}
              theme={theme}
            />
            <GranularityLevelCard
              level="asset"
              label="ASSET"
              description="Vista individual por asset"
              icon={<Grid size={20} />}
              count={displayItems.length}
              isActive={granularityLevel === 'asset'}
              onClick={() => handleGranularityLevelChange('asset')}
              theme={theme}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          <div className="h-full relative">
            <MapViewer 
              assets={mapAssets}
              activeLayers={[]}
              theme={theme}
              onAssetClick={(assetId) => {
                const asset = mapAssets.find(a => a.id === assetId);
                if (!asset) return;

                const operation = safeOperations.find(op => 
                  op.assets.some(a => a.id === assetId)
                );
                if (!operation) return;

                // Navigate based on granularity level - allow drilling down in the hierarchy
                if (granularityLevel === 'company') {
                  // Company level: select the client and move to portfolio level
                  setSelectedClientId(operation.clientId);
                  setGranularityLevel('portfolio');
                  setSelectedOperationId(null);
                  setSelectedAssetId(assetId);
                } else if (granularityLevel === 'portfolio') {
                  // Portfolio level: select the operation and move to asset level
                  setSelectedOperationId(operation.id);
                  setSelectedClientId(operation.clientId);
                  setGranularityLevel('asset');
                  setSelectedAssetId(assetId);
                } else {
                  // Asset level: navigate to evaluation
                  setSelectedAssetId(assetId);
                  if (onNavigateToAssetEvaluation) {
                    onNavigateToAssetEvaluation(assetId);
                  } else if (onNavigateToDnshEvaluation) {
                    onNavigateToDnshEvaluation(operation.id, assetId);
                  }
                }
              }}
              focusedAssetId={selectedAssetId}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            {displayItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    granularityLevel={granularityLevel}
                    theme={theme}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            ) : (
              <div className={`flex items-center justify-center h-full ${
                theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
              }`}>
                <p className="font-mono uppercase text-sm">NO_ITEMS_TO_DISPLAY</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Granularity Level Card Component
const GranularityLevelCard = ({ 
  level, 
  label, 
  description, 
  icon, 
  count, 
  isActive, 
  onClick, 
  theme,
}: {
  level: GranularityLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  isActive: boolean;
  onClick: () => void;
  theme: 'dark' | 'light';
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-4 rounded-xl border flex flex-col items-start justify-between h-32 relative overflow-hidden group transition-all cursor-pointer ${
      isActive
        ? theme === 'dark'
          ? 'bg-[#00ff88]/10 border-[#00ff88]/30 shadow-lg shadow-[#00ff88]/10 hover:bg-[#00ff88]/15'
          : 'bg-[#0066cc]/10 border-[#0066cc]/30 shadow-lg shadow-[#0066cc]/10 hover:bg-[#0066cc]/15'
        : theme === 'dark'
          ? 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#00ff88]/20 hover:bg-[#111111] active:scale-[0.98]'
          : 'bg-white border-gray-200 hover:border-[#0066cc]/20 hover:bg-gray-50 active:scale-[0.98]'
    }`}
  >
    <div className="flex justify-between items-start w-full z-10">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <div className={`p-2 rounded-lg transition-colors ${
            isActive
              ? theme === 'dark'
                ? 'bg-[#00ff88]/20 text-[#00ff88]'
                : 'bg-[#0066cc]/20 text-[#0066cc]'
              : theme === 'dark'
                ? 'bg-[#111111] text-[#666666]'
                : 'bg-gray-100 text-gray-500'
          }`}>
            {icon}
          </div>
          <h3 className={`text-sm font-bold font-mono uppercase tracking-wider truncate ${
            isActive
              ? theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
              : theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {label}
          </h3>
        </div>
        <p className={`text-[10px] font-mono uppercase tracking-wider ${
          theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
        }`}>
          {description}
        </p>
      </div>
      <div className={`ml-2 px-3 py-1 rounded-lg font-bold font-mono text-lg transition-colors ${
        isActive
          ? theme === 'dark'
            ? 'bg-[#00ff88] text-[#0a0a0a]'
            : 'bg-[#0066cc] text-white'
          : theme === 'dark'
            ? 'bg-[#111111] text-[#666666]'
            : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </div>
    </div>
    {isActive && (
      <div className={`mt-auto w-full h-1 rounded-full ${
        theme === 'dark' ? 'bg-[#00ff88]' : 'bg-[#0066cc]'
      }`} />
    )}
  </button>
);

// Item Card Component
const ItemCard = ({ item, granularityLevel, theme, onClick }: any) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Compliant':
        return <span className={`px-2 py-0.5 rounded text-[8px] font-bold border font-mono uppercase ${
          theme === 'dark' 
            ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30' 
            : 'bg-green-50 text-green-600 border-green-200'
        }`}>C</span>;
      case 'Non-Compliant':
        return <span className={`px-2 py-0.5 rounded text-[8px] font-bold border font-mono uppercase ${
          theme === 'dark' 
            ? 'bg-red-500/20 text-red-400 border-red-500/30' 
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>NC</span>;
      case 'Conditional':
        return <span className={`px-2 py-0.5 rounded text-[8px] font-bold border font-mono uppercase ${
          theme === 'dark' 
            ? 'bg-[#ffb800]/20 text-[#ffb800] border-[#ffb800]/30' 
            : 'bg-amber-50 text-amber-600 border-amber-200'
        }`}>COND</span>;
      default:
        return <span className={`px-2 py-0.5 rounded text-[8px] font-bold border font-mono uppercase ${
          theme === 'dark' 
            ? 'bg-[#1a1a1a] text-[#666666] border-[#1a1a1a]' 
            : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>NA</span>;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] ${
        theme === 'dark' 
          ? 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#00ff88]/30 hover:bg-[#111111]' 
          : 'bg-white border-gray-200 hover:border-[#0066cc]/30 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-bold font-mono uppercase tracking-wider truncate ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {item.name.replace(/\s/g, '_')}
          </h3>
          {granularityLevel === 'company' && (
            <p className={`text-xs font-mono mt-1 ${
              theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
            }`}>
              {item.operations} PORTFOLIOS • {item.assets} ASSETS
            </p>
          )}
          {granularityLevel === 'portfolio' && (
            <p className={`text-xs font-mono mt-1 ${
              theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
            }`}>
              {item.assets} ASSETS
            </p>
          )}
          {granularityLevel === 'asset' && (
            <p className={`text-xs font-mono mt-1 ${
              theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
            }`}>
              {item.assetType}
            </p>
          )}
        </div>
        {granularityLevel === 'asset' && item.status && getStatusBadge(item.status)}
      </div>
      <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
        theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200'
      }`}>
        <span className={`text-[10px] font-mono uppercase tracking-wider ${
          theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'
        }`}>
          {granularityLevel === 'company' ? 'CLICK_PARA_VER_PORTFOLIOS' :
           granularityLevel === 'portfolio' ? 'CLICK_PARA_VER_ASSETS' :
           'CLICK_PARA_EVALUAR'}
        </span>
        <ArrowRight size={14} className={theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'} />
      </div>
    </div>
  );
};

export default UnifiedDashboardPage;
