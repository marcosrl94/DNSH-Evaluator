import React, { useMemo, useState, useEffect } from 'react';
import { Briefcase, TrendingUp, AlertTriangle, Clock, ArrowRight, ShieldCheck, Droplets, Leaf, RefreshCw, XCircle, Zap, FileText, MapPin, CheckCircle2, AlertCircle, Building2, DollarSign, Percent, BarChart3, TrendingDown, Activity, Search, Filter, ChevronRight, ChevronLeft, Layers, Grid, Table } from 'lucide-react';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from '../constants';
import { Operation, DnshObjective, Client, RiskBand, Asset } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { canDisplayDnshStatus, getSafeDnshStatus } from '../services/dnshValidation';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { JourneyMetrics } from '../components/JourneyMetrics';
import { calculateJourneyProgress } from '../services/journeyService';
import { getAllOperations } from '../services/dataManagement';
import { logger } from '../utils/logger';
import { getAssetObjectiveStatus } from '../services/dnshEvaluationService';
import MapViewer from '../components/MapViewer';

interface DashboardProps {
  onNavigateToOperation: (id: string) => void;
  onNavigateToOperationsList?: () => void;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToMapViewer?: () => void;
  onNavigateToReports?: () => void;
}

type ViewLevel = 'client' | 'portfolio' | 'asset';
type ViewMode = 'list' | 'map' | 'table';

interface ClientStatus {
  client: Client;
  totalPortfolios: number;
  totalAssets: number;
  compliantAssets: number;
  nonCompliantAssets: number;
  conditionalAssets: number;
  notAssessedAssets: number;
  objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }>;
  totalCapex: number;
  avgComplianceRate: number;
}

interface PortfolioStatus {
  operation: Operation;
  totalAssets: number;
  compliantAssets: number;
  nonCompliantAssets: number;
  conditionalAssets: number;
  notAssessedAssets: number;
  objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }>;
  overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | 'Asymmetric';
  journeyProgress: number;
  journeyStage: string;
  capex: number;
}

interface AssetStatus {
  asset: Asset;
  operation: Operation;
  overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  objectiveStatuses: Record<DnshObjective, 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed'>;
  hasChecklist: boolean;
  lastEvaluationDate?: string;
}

const DashboardPage: React.FC<DashboardProps> = ({ 
  operations: propsOperations,
  onNavigateToOperation, 
  onNavigateToOperationsList,
  onNavigateToClient,
  onNavigateToMapViewer,
  onNavigateToReports
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [operations, setOperations] = useState<Operation[]>(propsOperations || DEMO_OPERATIONS);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('client');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | 'Asymmetric'>('All');
  
  // Load operations if not provided
  useEffect(() => {
    if (!propsOperations) {
      const loadOperations = async () => {
        try {
          const ops = await getAllOperations();
          setOperations(Array.isArray(ops) ? ops : DEMO_OPERATIONS);
        } catch (error) {
          logger.error('Error loading operations:', error);
          setOperations(DEMO_OPERATIONS);
        }
      };
      loadOperations();
    }
  }, [propsOperations]);

  // Calculate Client-level statuses
  const clientStatuses = useMemo<ClientStatus[]>(() => {
    const clientMap = new Map<string, ClientStatus>();

    DEMO_CLIENTS.forEach(client => {
      const clientOps = operations.filter(op => op.clientId === client.id);
      if (clientOps.length === 0) return;

      const allAssets = clientOps.flatMap(op => op.assets);
      let compliantAssets = 0;
      let nonCompliantAssets = 0;
      let conditionalAssets = 0;
      let notAssessedAssets = 0;
      let totalCapex = 0;

      const objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }> = {
        [DnshObjective.MITIGATION]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.ADAPTATION]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.WATER]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.CIRCULAR]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.POLLUTION]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.BIODIVERSITY]: { compliant: 0, total: 0, percentage: 0 },
      };

      allAssets.forEach(asset => {
        const evaluation = asset.dnshEvaluation;
        if (!evaluation) {
          notAssessedAssets++;
          return;
        }

        const status = evaluation.overallStatus || 'Not Assessed';
        switch (status) {
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
          const objStatus = getSafeDnshStatus(asset, objective);
          if (objStatus !== 'Not Assessed') {
            objectiveCompliance[objective].total++;
            if (objStatus === 'Compliant') {
              objectiveCompliance[objective].compliant++;
            }
          }
        });
      });

      clientOps.forEach(op => {
        totalCapex += op.capex || 0;
      });

      Object.keys(objectiveCompliance).forEach(key => {
        const obj = objectiveCompliance[key as DnshObjective];
        obj.percentage = obj.total > 0 ? Math.round((obj.compliant / obj.total) * 100) : 0;
      });

      const totalAssessed = compliantAssets + nonCompliantAssets + conditionalAssets;
      const avgComplianceRate = totalAssessed > 0 
        ? Math.round((compliantAssets / totalAssessed) * 100) 
        : 0;

      clientMap.set(client.id, {
        client,
        totalPortfolios: clientOps.length,
        totalAssets: allAssets.length,
        compliantAssets,
        nonCompliantAssets,
        conditionalAssets,
        notAssessedAssets,
        objectiveCompliance,
        totalCapex: totalCapex / 1000000, // M€
        avgComplianceRate,
      });
    });

    return Array.from(clientMap.values());
  }, [operations]);

  // Calculate Portfolio-level statuses
  const portfolioStatuses = useMemo<PortfolioStatus[]>(() => {
    if (!selectedClientId) return [];

    const clientOps = operations.filter(op => op.clientId === selectedClientId);
    
    return clientOps.map(operation => {
      let compliantAssets = 0;
      let nonCompliantAssets = 0;
      let conditionalAssets = 0;
      let notAssessedAssets = 0;

      const objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }> = {
        [DnshObjective.MITIGATION]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.ADAPTATION]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.WATER]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.CIRCULAR]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.POLLUTION]: { compliant: 0, total: 0, percentage: 0 },
        [DnshObjective.BIODIVERSITY]: { compliant: 0, total: 0, percentage: 0 },
      };

      operation.assets.forEach(asset => {
        const evaluation = asset.dnshEvaluation;
        if (!evaluation) {
          notAssessedAssets++;
          return;
        }

        const status = evaluation.overallStatus || 'Not Assessed';
        switch (status) {
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
          const objStatus = getSafeDnshStatus(asset, objective);
          if (objStatus !== 'Not Assessed') {
            objectiveCompliance[objective].total++;
            if (objStatus === 'Compliant') {
              objectiveCompliance[objective].compliant++;
            }
          }
        });
      });

      Object.keys(objectiveCompliance).forEach(key => {
        const obj = objectiveCompliance[key as DnshObjective];
        obj.percentage = obj.total > 0 ? Math.round((obj.compliant / obj.total) * 100) : 0;
      });

      const assetStatuses = operation.assets.map(a => a.dnshEvaluation?.overallStatus || 'Not Assessed');
      let overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | 'Asymmetric' = 'Not Assessed';
      
      if (compliantAssets === operation.assets.length && operation.assets.length > 0) {
        overallStatus = 'Compliant';
      } else if (nonCompliantAssets > 0) {
        overallStatus = 'Asymmetric';
      } else if (conditionalAssets > 0) {
        overallStatus = 'Conditional';
      } else if (compliantAssets > 0 && (nonCompliantAssets > 0 || conditionalAssets > 0)) {
        overallStatus = 'Asymmetric';
      }

      const journeyProgress = calculateJourneyProgress(operation);

      return {
        operation,
        totalAssets: operation.assets.length,
        compliantAssets,
        nonCompliantAssets,
        conditionalAssets,
        notAssessedAssets,
        objectiveCompliance,
        overallStatus,
        journeyProgress: journeyProgress.progress,
        journeyStage: journeyProgress.stage,
        capex: (operation.capex || 0) / 1000000, // M€
      };
    });
  }, [operations, selectedClientId]);

  // Calculate Asset-level statuses
  const assetStatuses = useMemo<AssetStatus[]>(() => {
    if (!selectedOperationId) return [];

    const operation = operations.find(op => op.id === selectedOperationId);
    if (!operation) return [];

    return operation.assets.map(asset => {
      const evaluation = asset.dnshEvaluation;
      const overallStatus = evaluation?.overallStatus || 'Not Assessed';
      
      const objectiveStatuses: Record<DnshObjective, 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed'> = {
        [DnshObjective.MITIGATION]: 'Not Assessed',
        [DnshObjective.ADAPTATION]: 'Not Assessed',
        [DnshObjective.WATER]: 'Not Assessed',
        [DnshObjective.CIRCULAR]: 'Not Assessed',
        [DnshObjective.POLLUTION]: 'Not Assessed',
        [DnshObjective.BIODIVERSITY]: 'Not Assessed',
      };

      Object.values(DnshObjective).forEach(objective => {
        objectiveStatuses[objective] = getAssetObjectiveStatus(asset, objective);
      });

      const hasChecklist = evaluation?.checklistAnswers && 
        Object.keys(evaluation.checklistAnswers).length > 0;

      return {
        asset,
        operation,
        overallStatus: overallStatus as 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed',
        objectiveStatuses,
        hasChecklist,
        lastEvaluationDate: evaluation?.evaluationDate,
      };
    });
  }, [operations, selectedOperationId]);

  // Filter functions
  const filteredClientStatuses = useMemo(() => {
    return clientStatuses.filter(clientStatus => {
      const matchesSearch = !searchTerm || 
        clientStatus.client.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter !== 'All') {
        const totalAssessed = clientStatus.compliantAssets + clientStatus.nonCompliantAssets + clientStatus.conditionalAssets;
        if (statusFilter === 'Compliant' && clientStatus.compliantAssets !== totalAssessed) return false;
        if (statusFilter === 'Non-Compliant' && clientStatus.nonCompliantAssets === 0) return false;
        if (statusFilter === 'Conditional' && clientStatus.conditionalAssets === 0) return false;
        if (statusFilter === 'Not Assessed' && clientStatus.notAssessedAssets === 0) return false;
      }

      return true;
    });
  }, [clientStatuses, searchTerm, statusFilter]);

  const filteredPortfolioStatuses = useMemo(() => {
    return portfolioStatuses.filter(portfolioStatus => {
      const matchesSearch = !searchTerm || 
        portfolioStatus.operation.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter !== 'All' && portfolioStatus.overallStatus !== statusFilter) return false;

      return true;
    });
  }, [portfolioStatuses, searchTerm, statusFilter]);

  const filteredAssetStatuses = useMemo(() => {
    return assetStatuses.filter(assetStatus => {
      const matchesSearch = !searchTerm || 
        assetStatus.asset.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (statusFilter !== 'All' && assetStatus.overallStatus !== statusFilter) return false;

      return true;
    });
  }, [assetStatuses, searchTerm, statusFilter]);

  // Navigation handlers
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedOperationId(null);
    setViewLevel('portfolio');
  };

  const handleSelectPortfolio = (operationId: string) => {
    setSelectedOperationId(operationId);
    setViewLevel('asset');
  };

  const handleBackToClients = () => {
    setSelectedClientId(null);
    setSelectedOperationId(null);
    setViewLevel('client');
  };

  const handleBackToPortfolios = () => {
    setSelectedOperationId(null);
    setViewLevel('portfolio');
  };

  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'MITIGATION',
    [DnshObjective.ADAPTATION]: 'ADAPTATION',
    [DnshObjective.WATER]: 'WATER',
    [DnshObjective.CIRCULAR]: 'CIRCULAR',
    [DnshObjective.POLLUTION]: 'POLLUTION',
    [DnshObjective.BIODIVERSITY]: 'BIODIVERSITY',
  };

  const objectiveColors: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'bg-emerald-500',
    [DnshObjective.ADAPTATION]: 'bg-amber-500',
    [DnshObjective.WATER]: 'bg-blue-500',
    [DnshObjective.CIRCULAR]: 'bg-purple-500',
    [DnshObjective.POLLUTION]: 'bg-red-500',
    [DnshObjective.BIODIVERSITY]: 'bg-green-500',
  };

  const statusColors: Record<string, string> = {
    'Compliant': theme === 'dark' ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30' : 'bg-green-100 text-green-700 border-green-200',
    'Non-Compliant': theme === 'dark' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200',
    'Conditional': theme === 'dark' ? 'bg-[#ffb800]/20 text-[#ffb800] border-[#ffb800]/30' : 'bg-amber-100 text-amber-700 border-amber-200',
    'Not Assessed': theme === 'dark' ? 'bg-[#111111] text-[#666666] border-[#1a1a1a]' : 'bg-gray-100 text-gray-600 border-gray-200',
    'Asymmetric': theme === 'dark' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn bg-black min-h-full">
      {/* Header with Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {viewLevel !== 'client' && (
              <button
                onClick={viewLevel === 'asset' ? handleBackToPortfolios : handleBackToClients}
                className={`p-2 rounded-lg ${themeClasses.bg.tertiary} ${themeClasses.border.default} border hover:border-[#00ff88]/30 transition-all`}
              >
                <ChevronLeft size={16} className={themeClasses.text.primary} />
              </button>
            )}
            <h1 className="text-3xl font-bold text-white tracking-tight font-mono uppercase">
              {viewLevel === 'client' ? 'PANEL_DE_CONTROL_DNSH' : 
               viewLevel === 'portfolio' ? 'PORTFOLIOS' : 'ASSETS'}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#666666]">
            {viewLevel === 'client' && <span>NIVEL_CLIENTE</span>}
            {viewLevel === 'portfolio' && selectedClientId && (
              <>
                <span>{DEMO_CLIENTS.find(c => c.id === selectedClientId)?.name}</span>
                <ChevronRight size={12} />
                <span>NIVEL_PORTFOLIO</span>
              </>
            )}
            {viewLevel === 'asset' && selectedOperationId && (
              <>
                <span>{DEMO_CLIENTS.find(c => c.id === selectedClientId)?.name}</span>
                <ChevronRight size={12} />
                <span>{operations.find(op => op.id === selectedOperationId)?.name}</span>
                <ChevronRight size={12} />
                <span>NIVEL_ASSET</span>
              </>
            )}
          </div>
        </div>
        
        {/* View Mode Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg border transition-all ${
              viewMode === 'list'
                ? theme === 'dark'
                  ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]'
                  : 'bg-green-100 text-green-700 border-green-500'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.border.default} hover:border-[#00ff88]/30`
            }`}
            title="Vista Lista"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-lg border transition-all ${
              viewMode === 'map'
                ? theme === 'dark'
                  ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]'
                  : 'bg-green-100 text-green-700 border-green-500'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.border.default} hover:border-[#00ff88]/30`
            }`}
            title="Vista Mapa"
          >
            <MapPin size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg border transition-all ${
              viewMode === 'table'
                ? theme === 'dark'
                  ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]'
                  : 'bg-green-100 text-green-700 border-green-500'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.border.default} hover:border-[#00ff88]/30`
            }`}
            title="Vista Tabla"
          >
            <Table size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`${themeClasses.bg.secondary} rounded-xl shadow-sm border ${themeClasses.border.default} p-4`}>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.text.tertiary}`} size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 ${themeClasses.bg.tertiary} ${themeClasses.border.default} border rounded-lg ${themeClasses.text.primary} placeholder:${themeClasses.text.tertiary} font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-4 py-2 ${themeClasses.bg.tertiary} ${themeClasses.border.default} border rounded-lg ${themeClasses.text.primary} font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50`}
          >
            <option value="All">TODOS_LOS_ESTADOS</option>
            <option value="Compliant">COMPLIANT</option>
            <option value="Non-Compliant">NON_COMPLIANT</option>
            <option value="Conditional">CONDITIONAL</option>
            <option value="Not Assessed">NOT_ASSESSED</option>
            <option value="Asymmetric">ASYMMETRIC</option>
          </select>
        </div>
      </div>

      {/* Client Level View */}
      {viewLevel === 'client' && (
        <>
          {viewMode === 'list' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClientStatuses.map(clientStatus => (
                  <ClientCard
                    key={clientStatus.client.id}
                    clientStatus={clientStatus}
                    onClick={() => handleSelectClient(clientStatus.client.id)}
                    themeClasses={themeClasses}
                    theme={theme}
                    objectiveLabels={objectiveLabels}
                    objectiveColors={objectiveColors}
                    statusColors={statusColors}
                  />
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'map' && (
            <div className="h-[600px] rounded-xl overflow-hidden border border-[#1a1a1a]">
              <MapViewer
                assets={operations.flatMap(op => op.assets)}
                theme={theme}
                onAssetClick={(assetId) => {
                  const asset = operations.flatMap(op => op.assets).find(a => a.id === assetId);
                  if (asset) {
                    const operation = operations.find(op => op.assets.some(a => a.id === assetId));
                    if (operation) {
                      handleSelectClient(operation.clientId);
                      setTimeout(() => handleSelectPortfolio(operation.id), 100);
                    }
                  }
                }}
              />
            </div>
          )}
          
          {viewMode === 'table' && (
            <ClientTableView
              clientStatuses={filteredClientStatuses}
              onSelectClient={handleSelectClient}
              themeClasses={themeClasses}
              theme={theme}
              objectiveLabels={objectiveLabels}
              statusColors={statusColors}
            />
          )}
        </>
      )}

      {/* Portfolio Level View */}
      {viewLevel === 'portfolio' && (
        <>
          {viewMode === 'list' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPortfolioStatuses.map(portfolioStatus => (
                  <PortfolioCard
                    key={portfolioStatus.operation.id}
                    portfolioStatus={portfolioStatus}
                    onClick={() => handleSelectPortfolio(portfolioStatus.operation.id)}
                    themeClasses={themeClasses}
                    theme={theme}
                    objectiveLabels={objectiveLabels}
                    objectiveColors={objectiveColors}
                    statusColors={statusColors}
                    onNavigateToOperation={onNavigateToOperation}
                  />
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'map' && (
            <div className="h-[600px] rounded-xl overflow-hidden border border-[#1a1a1a]">
              <MapViewer
                assets={portfolioStatuses.flatMap(ps => ps.operation.assets)}
                theme={theme}
                onAssetClick={(assetId) => {
                  const portfolioStatus = portfolioStatuses.find(ps => 
                    ps.operation.assets.some(a => a.id === assetId)
                  );
                  if (portfolioStatus) {
                    handleSelectPortfolio(portfolioStatus.operation.id);
                  }
                }}
              />
            </div>
          )}
          
          {viewMode === 'table' && (
            <PortfolioTableView
              portfolioStatuses={filteredPortfolioStatuses}
              onSelectPortfolio={handleSelectPortfolio}
              onNavigateToOperation={onNavigateToOperation}
              themeClasses={themeClasses}
              theme={theme}
              objectiveLabels={objectiveLabels}
              objectiveColors={objectiveColors}
              statusColors={statusColors}
            />
          )}
        </>
      )}

      {/* Asset Level View */}
      {viewLevel === 'asset' && (
        <>
          {viewMode === 'list' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredAssetStatuses.map(assetStatus => (
                  <AssetCard
                    key={assetStatus.asset.id}
                    assetStatus={assetStatus}
                    themeClasses={themeClasses}
                    theme={theme}
                    objectiveLabels={objectiveLabels}
                    objectiveColors={objectiveColors}
                    statusColors={statusColors}
                    onNavigateToOperation={onNavigateToOperation}
                  />
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'map' && (
            <div className="h-[600px] rounded-xl overflow-hidden border border-[#1a1a1a]">
              <MapViewer
                assets={assetStatuses.map(as => as.asset)}
                theme={theme}
                focusedAssetId={assetStatuses[0]?.asset.id || null}
              />
            </div>
          )}
          
          {viewMode === 'table' && (
            <AssetTableView
              assetStatuses={filteredAssetStatuses}
              onNavigateToOperation={onNavigateToOperation}
              themeClasses={themeClasses}
              theme={theme}
              objectiveLabels={objectiveLabels}
              statusColors={statusColors}
            />
          )}
        </>
      )}
    </div>
  );
};

// Client Card Component
const ClientCard: React.FC<{
  clientStatus: ClientStatus;
  onClick: () => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  objectiveLabels: Record<DnshObjective, string>;
  objectiveColors: Record<DnshObjective, string>;
  statusColors: Record<string, string>;
}> = ({ clientStatus, onClick, themeClasses, theme, objectiveLabels, objectiveColors, statusColors }) => {
  const totalAssessed = clientStatus.compliantAssets + clientStatus.nonCompliantAssets + clientStatus.conditionalAssets;
  
  return (
    <div
      onClick={onClick}
      className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.default} p-6 cursor-pointer transition-all hover:scale-[1.02] hover:border-[#00ff88]/30 group`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={20} className="text-blue-500" />
            <h3 className={`text-lg font-bold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>
              {clientStatus.client.name}
            </h3>
          </div>
          <p className={`text-xs ${themeClasses.text.tertiary} font-mono`}>
            {clientStatus.totalPortfolios} PORTFOLIOS • {clientStatus.totalAssets} ASSETS
          </p>
        </div>
        <div className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono uppercase ${statusColors[clientStatus.avgComplianceRate >= 80 ? 'Compliant' : clientStatus.avgComplianceRate >= 50 ? 'Conditional' : 'Non-Compliant']}`}>
          {clientStatus.avgComplianceRate}%
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className={`p-2 rounded-lg border text-center ${statusColors['Compliant']}`}>
          <div className="text-lg font-bold font-mono">{clientStatus.compliantAssets}</div>
          <div className="text-[9px] font-mono uppercase">COMPLIANT</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${statusColors['Conditional']}`}>
          <div className="text-lg font-bold font-mono">{clientStatus.conditionalAssets}</div>
          <div className="text-[9px] font-mono uppercase">CONDITIONAL</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${statusColors['Non-Compliant']}`}>
          <div className="text-lg font-bold font-mono">{clientStatus.nonCompliantAssets}</div>
          <div className="text-[9px] font-mono uppercase">NON_COMPLIANT</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${statusColors['Not Assessed']}`}>
          <div className="text-lg font-bold font-mono">{clientStatus.notAssessedAssets}</div>
          <div className="text-[9px] font-mono uppercase">NOT_ASSESSED</div>
        </div>
      </div>

      {/* Objective Compliance */}
      <div className="space-y-2 mb-4">
        <p className={`text-[10px] font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>
          CUMPLIMIENTO_POR_OBJETIVO
        </p>
        {Object.values(DnshObjective).slice(0, 3).map(objective => {
          const compliance = clientStatus.objectiveCompliance[objective];
          return (
            <div key={objective} className="flex items-center gap-2">
              <span className={`text-[10px] font-mono w-20 ${themeClasses.text.secondary} truncate`}>
                {objectiveLabels[objective].substring(0, 8)}
              </span>
              <div className={`flex-1 h-1.5 ${themeClasses.bg.tertiary} rounded-full overflow-hidden`}>
                <div
                  className={`h-full ${objectiveColors[objective]}`}
                  style={{ width: `${compliance.percentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono w-8 text-right ${themeClasses.text.secondary}`}>
                {compliance.percentage}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-[#1a1a1a]">
        <div>
          <p className={`text-xs font-bold font-mono ${themeClasses.text.primary}`}>
            €{clientStatus.totalCapex.toFixed(1)}M
          </p>
          <p className={`text-[10px] font-mono ${themeClasses.text.tertiary}`}>TOTAL_CAPEX</p>
        </div>
        <div className="flex items-center gap-1 text-[#00ff88] group-hover:gap-2 transition-all">
          <span className="text-xs font-mono uppercase tracking-wider">VER_PORTFOLIOS</span>
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

// Portfolio Card Component
const PortfolioCard: React.FC<{
  portfolioStatus: PortfolioStatus;
  onClick: () => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  objectiveLabels: Record<DnshObjective, string>;
  objectiveColors: Record<DnshObjective, string>;
  statusColors: Record<string, string>;
  onNavigateToOperation: (id: string) => void;
}> = ({ portfolioStatus, onClick, themeClasses, theme, objectiveLabels, objectiveColors, statusColors, onNavigateToOperation }) => {
  return (
    <div
      className={`${themeClasses.bg.secondary} rounded-xl border ${statusColors[portfolioStatus.overallStatus]} p-6 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={18} className="text-[#00ff88]" />
            <h3 className={`text-base font-bold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>
              {portfolioStatus.operation.name.replace(/\s/g, '_')}
            </h3>
          </div>
          <p className={`text-xs ${themeClasses.text.tertiary} font-mono`}>
            {portfolioStatus.operation.sectorNACE} • {portfolioStatus.operation.country}
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold font-mono uppercase border ${statusColors[portfolioStatus.overallStatus]}`}>
          {portfolioStatus.overallStatus.replace(/\s/g, '_')}
        </div>
      </div>

      {/* Journey Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>
            ETAPA: {portfolioStatus.journeyStage.replace(/_/g, ' ')}
          </span>
          <span className={`text-xs font-bold font-mono ${themeClasses.text.primary}`}>
            {portfolioStatus.journeyProgress}%
          </span>
        </div>
        <div className={`h-2 ${themeClasses.bg.tertiary} rounded-full overflow-hidden`}>
          <div
            className="h-full bg-[#00ff88] transition-all"
            style={{ width: `${portfolioStatus.journeyProgress}%` }}
          />
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className={`p-2 rounded-lg border text-center ${statusColors['Compliant']}`}>
          <div className="text-sm font-bold font-mono">{portfolioStatus.compliantAssets}</div>
          <div className="text-[9px] font-mono uppercase">COMPLIANT</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${statusColors['Conditional']}`}>
          <div className="text-sm font-bold font-mono">{portfolioStatus.conditionalAssets}</div>
          <div className="text-[9px] font-mono uppercase">CONDITIONAL</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${statusColors['Non-Compliant']}`}>
          <div className="text-sm font-bold font-mono">{portfolioStatus.nonCompliantAssets}</div>
          <div className="text-[9px] font-mono uppercase">NON_COMPLIANT</div>
        </div>
        <div className={`p-2 rounded-lg border text-center ${statusColors['Not Assessed']}`}>
          <div className="text-sm font-bold font-mono">{portfolioStatus.notAssessedAssets}</div>
          <div className="text-[9px] font-mono uppercase">NOT_ASSESSED</div>
        </div>
      </div>

      {/* Objective Compliance */}
      <div className="space-y-1.5 mb-4">
        <p className={`text-[10px] font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>
          CUMPLIMIENTO_POR_OBJETIVO
        </p>
        {Object.values(DnshObjective).slice(0, 3).map(objective => {
          const compliance = portfolioStatus.objectiveCompliance[objective];
          return (
            <div key={objective} className="flex items-center gap-2">
              <span className={`text-[10px] font-mono w-20 ${themeClasses.text.secondary} truncate`}>
                {objectiveLabels[objective].substring(0, 8)}
              </span>
              <div className={`flex-1 h-1.5 ${themeClasses.bg.tertiary} rounded-full overflow-hidden`}>
                <div
                  className={`h-full ${objectiveColors[objective]}`}
                  style={{ width: `${compliance.percentage}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono w-8 text-right ${themeClasses.text.secondary}`}>
                {compliance.percentage}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-[#1a1a1a]">
        <div>
          <p className={`text-xs font-bold font-mono ${themeClasses.text.primary}`}>
            €{portfolioStatus.capex.toFixed(1)}M
          </p>
          <p className={`text-[10px] font-mono ${themeClasses.text.tertiary}`}>CAPEX</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToOperation(portfolioStatus.operation.id);
            }}
            className={`text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default} hover:border-[#00ff88]/30 transition-all`}
          >
            EVALUAR
          </button>
          <div className="flex items-center gap-1 text-[#00ff88] group-hover:gap-2 transition-all">
            <span className="text-xs font-mono uppercase tracking-wider">VER_ASSETS</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Asset Card Component
const AssetCard: React.FC<{
  assetStatus: AssetStatus;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  objectiveLabels: Record<DnshObjective, string>;
  objectiveColors: Record<DnshObjective, string>;
  statusColors: Record<string, string>;
  onNavigateToOperation: (id: string) => void;
}> = ({ assetStatus, themeClasses, theme, objectiveLabels, objectiveColors, statusColors, onNavigateToOperation }) => {
  return (
    <div
      className={`${themeClasses.bg.secondary} rounded-xl border ${statusColors[assetStatus.overallStatus]} p-6 transition-all hover:shadow-lg`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-[#00a8ff]" />
            <h3 className={`text-base font-bold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>
              {assetStatus.asset.name.replace(/\s/g, '_')}
            </h3>
          </div>
          <p className={`text-xs ${themeClasses.text.tertiary} font-mono`}>
            {assetStatus.asset.assetType} • {assetStatus.asset.country}
            {assetStatus.asset.lat && assetStatus.asset.lng && (
              <> • {assetStatus.asset.lat.toFixed(2)}°, {assetStatus.asset.lng.toFixed(2)}°</>
            )}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono uppercase ${statusColors[assetStatus.overallStatus]}`}>
          {assetStatus.overallStatus.replace(/\s/g, '_')}
        </div>
      </div>

      {/* Objective Statuses */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {Object.values(DnshObjective).map(objective => {
          const status = assetStatus.objectiveStatuses[objective];
          return (
            <div
              key={objective}
              className={`p-3 rounded-lg border ${statusColors[status]} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${status === 'Compliant' ? 'bg-[#00ff88]' : status === 'Non-Compliant' ? 'bg-red-500' : status === 'Conditional' ? 'bg-[#ffb800]' : 'bg-[#666666]'}`}></div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                  {objectiveLabels[objective]}
                </span>
              </div>
              <div className={`text-xs font-bold font-mono ${themeClasses.text.secondary}`}>
                {status.replace(/\s/g, '_')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metadata */}
      <div className="flex justify-between items-center pt-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-4">
          {assetStatus.hasChecklist && (
            <div className="flex items-center gap-1">
              <CheckCircle2 size={14} className="text-[#00ff88]" />
              <span className={`text-[10px] font-mono uppercase ${themeClasses.text.tertiary}`}>
                CHECKLIST_COMPLETO
              </span>
            </div>
          )}
          {assetStatus.lastEvaluationDate && (
            <div className={`text-[10px] font-mono ${themeClasses.text.tertiary}`}>
              EVAL: {new Date(assetStatus.lastEvaluationDate).toLocaleDateString()}
            </div>
          )}
        </div>
        <button
          onClick={() => onNavigateToOperation(assetStatus.operation.id)}
          className={`text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default} hover:border-[#00ff88]/30 transition-all`}
        >
          VER_DETALLE
        </button>
      </div>
    </div>
  );
};

// Table View Components
const ClientTableView: React.FC<{
  clientStatuses: ClientStatus[];
  onSelectClient: (clientId: string) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  objectiveLabels: Record<DnshObjective, string>;
  objectiveColors: Record<DnshObjective, string>;
  statusColors: Record<string, string>;
}> = ({ clientStatuses, onSelectClient, themeClasses, theme, objectiveLabels, objectiveColors, statusColors }) => {
  return (
    <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.default} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${themeClasses.bg.tertiary} border-b ${themeClasses.border.default}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                CLIENTE
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                PORTFOLIOS
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                ASSETS
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                COMPLIANT
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                CONDITIONAL
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                NON_COMPLIANT
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                NOT_ASSESSED
              </th>
              {Object.values(DnshObjective).map(objective => (
                <th key={objective} className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  {objectiveLabels[objective].substring(0, 6)}
                </th>
              ))}
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                CAPEX (M€)
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                COMPLIANCE_RATE
              </th>
            </tr>
          </thead>
          <tbody>
            {clientStatuses.map((clientStatus, idx) => (
              <tr
                key={clientStatus.client.id}
                onClick={() => onSelectClient(clientStatus.client.id)}
                className={`border-b ${themeClasses.border.default} cursor-pointer hover:${themeClasses.bg.tertiary} transition-colors ${
                  idx % 2 === 0 ? themeClasses.bg.secondary : themeClasses.bg.tertiary
                }`}
              >
                <td className={`px-4 py-3 font-mono text-sm ${themeClasses.text.primary}`}>
                  {clientStatus.client.name}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.primary}`}>
                  {clientStatus.totalPortfolios}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.primary}`}>
                  {clientStatus.totalAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm text-[#00ff88]`}>
                  {clientStatus.compliantAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm text-[#ffb800]`}>
                  {clientStatus.conditionalAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm text-red-400`}>
                  {clientStatus.nonCompliantAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.tertiary}`}>
                  {clientStatus.notAssessedAssets}
                </td>
                {Object.values(DnshObjective).map(objective => {
                  const compliance = clientStatus.objectiveCompliance[objective];
                  return (
                    <td key={objective} className={`px-4 py-3 text-center font-mono text-xs`}>
                      <div className="flex items-center justify-center gap-1">
                        <div className={`w-16 h-2 ${themeClasses.bg.tertiary} rounded-full overflow-hidden`}>
                          <div
                            className={`h-full ${objectiveColors[objective]}`}
                            style={{ width: `${compliance.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs ${themeClasses.text.secondary}`}>
                          {compliance.percentage}%
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.primary}`}>
                  €{clientStatus.totalCapex.toFixed(1)}M
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm font-bold ${
                  clientStatus.avgComplianceRate >= 80 ? 'text-[#00ff88]' :
                  clientStatus.avgComplianceRate >= 50 ? 'text-[#ffb800]' :
                  'text-red-400'
                }`}>
                  {clientStatus.avgComplianceRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PortfolioTableView: React.FC<{
  portfolioStatuses: PortfolioStatus[];
  onSelectPortfolio: (operationId: string) => void;
  onNavigateToOperation: (id: string) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  objectiveLabels: Record<DnshObjective, string>;
  objectiveColors: Record<DnshObjective, string>;
  statusColors: Record<string, string>;
}> = ({ portfolioStatuses, onSelectPortfolio, onNavigateToOperation, themeClasses, theme, objectiveLabels, objectiveColors, statusColors }) => {
  return (
    <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.default} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${themeClasses.bg.tertiary} border-b ${themeClasses.border.default}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                PORTFOLIO
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                STATUS
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                ASSETS
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                COMPLIANT
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                CONDITIONAL
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                NON_COMPLIANT
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                NOT_ASSESSED
              </th>
              {Object.values(DnshObjective).map(objective => (
                <th key={objective} className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  {objectiveLabels[objective].substring(0, 6)}
                </th>
              ))}
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                JOURNEY
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                CAPEX (M€)
              </th>
            </tr>
          </thead>
          <tbody>
            {portfolioStatuses.map((portfolioStatus, idx) => (
              <tr
                key={portfolioStatus.operation.id}
                className={`border-b ${themeClasses.border.default} cursor-pointer hover:${themeClasses.bg.tertiary} transition-colors ${
                  idx % 2 === 0 ? themeClasses.bg.secondary : themeClasses.bg.tertiary
                }`}
              >
                <td className={`px-4 py-3 font-mono text-sm ${themeClasses.text.primary}`}>
                  <div className="flex items-center gap-2">
                    <span>{portfolioStatus.operation.name.replace(/\s/g, '_')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToOperation(portfolioStatus.operation.id);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-mono uppercase border ${themeClasses.bg.tertiary} ${themeClasses.border.default} hover:border-[#00ff88]/30 transition-all`}
                    >
                      EVAL
                    </button>
                  </div>
                </td>
                <td className={`px-4 py-3 text-center`}>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono uppercase border ${statusColors[portfolioStatus.overallStatus]}`}>
                    {portfolioStatus.overallStatus.replace(/\s/g, '_')}
                  </span>
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.primary}`}>
                  {portfolioStatus.totalAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm text-[#00ff88]`}>
                  {portfolioStatus.compliantAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm text-[#ffb800]`}>
                  {portfolioStatus.conditionalAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm text-red-400`}>
                  {portfolioStatus.nonCompliantAssets}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.tertiary}`}>
                  {portfolioStatus.notAssessedAssets}
                </td>
                {Object.values(DnshObjective).map(objective => {
                  const compliance = portfolioStatus.objectiveCompliance[objective];
                  return (
                    <td key={objective} className={`px-4 py-3 text-center font-mono text-xs`}>
                      <div className="flex items-center justify-center gap-1">
                        <div className={`w-16 h-2 ${themeClasses.bg.tertiary} rounded-full overflow-hidden`}>
                          <div
                            className={`h-full ${objectiveColors[objective]}`}
                            style={{ width: `${compliance.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs ${themeClasses.text.secondary}`}>
                          {compliance.percentage}%
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className={`px-4 py-3 text-center font-mono text-xs ${themeClasses.text.secondary}`}>
                  {portfolioStatus.journeyProgress}%
                </td>
                <td className={`px-4 py-3 text-center font-mono text-sm ${themeClasses.text.primary}`}>
                  €{portfolioStatus.capex.toFixed(1)}M
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AssetTableView: React.FC<{
  assetStatuses: AssetStatus[];
  onNavigateToOperation: (id: string) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  theme: 'dark' | 'light';
  objectiveLabels: Record<DnshObjective, string>;
  statusColors: Record<string, string>;
}> = ({ assetStatuses, onNavigateToOperation, themeClasses, theme, objectiveLabels, statusColors }) => {
  return (
    <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.default} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${themeClasses.bg.tertiary} border-b ${themeClasses.border.default}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                ASSET
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                TYPE
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                STATUS
              </th>
              {Object.values(DnshObjective).map(objective => (
                <th key={objective} className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                  {objectiveLabels[objective]}
                </th>
              ))}
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                CHECKLIST
              </th>
              <th className={`px-4 py-3 text-center text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
                EVAL_DATE
              </th>
            </tr>
          </thead>
          <tbody>
            {assetStatuses.map((assetStatus, idx) => (
              <tr
                key={assetStatus.asset.id}
                onClick={() => onNavigateToOperation(assetStatus.operation.id)}
                className={`border-b ${themeClasses.border.default} cursor-pointer hover:${themeClasses.bg.tertiary} transition-colors ${
                  idx % 2 === 0 ? themeClasses.bg.secondary : themeClasses.bg.tertiary
                }`}
              >
                <td className={`px-4 py-3 font-mono text-sm ${themeClasses.text.primary}`}>
                  {assetStatus.asset.name.replace(/\s/g, '_')}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-xs ${themeClasses.text.secondary}`}>
                  {assetStatus.asset.assetType}
                </td>
                <td className={`px-4 py-3 text-center`}>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono uppercase border ${statusColors[assetStatus.overallStatus]}`}>
                    {assetStatus.overallStatus.replace(/\s/g, '_')}
                  </span>
                </td>
                {Object.values(DnshObjective).map(objective => {
                  const status = assetStatus.objectiveStatuses[objective];
                  return (
                    <td key={objective} className={`px-4 py-3 text-center`}>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase border ${statusColors[status]}`}>
                        {status.charAt(0)}
                      </span>
                    </td>
                  );
                })}
                <td className={`px-4 py-3 text-center`}>
                  {assetStatus.hasChecklist ? (
                    <CheckCircle2 size={16} className="text-[#00ff88] mx-auto" />
                  ) : (
                    <Clock size={16} className={`${themeClasses.text.tertiary} mx-auto`} />
                  )}
                </td>
                <td className={`px-4 py-3 text-center font-mono text-xs ${themeClasses.text.tertiary}`}>
                  {assetStatus.lastEvaluationDate 
                    ? new Date(assetStatus.lastEvaluationDate).toLocaleDateString()
                    : '-'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
