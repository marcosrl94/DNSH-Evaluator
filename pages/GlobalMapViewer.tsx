
import React, { useMemo, useState, useEffect } from 'react';
import MapViewer, { ActiveLayer } from '../components/MapViewer';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { 
  Layers, MapPin, Search, Filter, Activity, TrendingUp, Maximize2, 
  Crosshair, ChevronDown, AlertTriangle, Zap, Building, Truck, Thermometer, Wind, ChevronLeft, ChevronRight, X, Building2, Users, ShieldCheck, CheckCircle2, XCircle, Clock, ArrowRight, Briefcase
} from 'lucide-react';
import { Asset, HazardType, Client, Operation, DnshObjective } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { getAssetObjectiveStatus } from '../services/dnshEvaluationService';
import { formatLargeNumber } from '../utils/common';
import { logger } from '../utils/logger';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface GlobalMapViewerPageProps {
  operations?: Operation[];
  clients?: Client[];
  onNavigateToOperation?: (operationId: string) => void;
  onNavigateToAssetEvaluation?: (assetId: string) => void;
  onNavigateToDnshEvaluation?: (operationId: string, objective?: DnshObjective) => void;
}

const operationsDefault: Operation[] = [];
const clientsDefault: Client[] = [];

const GlobalMapViewerPage: React.FC<GlobalMapViewerPageProps> = ({
  operations = operationsDefault,
  clients = clientsDefault,
  onNavigateToOperation,
  onNavigateToAssetEvaluation,
  onNavigateToDnshEvaluation
}) => {
  const ops = Array.isArray(operations) ? operations : [];
  const cl = Array.isArray(clients) ? clients : [];
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'layers' | 'dnsh'>('details');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>(theme);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [dnshFilterObjective, setDnshFilterObjective] = useState<DnshObjective | null>(null);
  const [dnshFilterStatus, setDnshFilterStatus] = useState<'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [clickedAssetId, setClickedAssetId] = useState<string | null>(null);
  
  // Sync mapTheme with global theme
  useEffect(() => {
    setMapTheme(theme);
  }, [theme]);

  // Filter assets based on selected client/operation and DNSH filters
  const allAssets = useMemo(() => {
    try {
      if (!ops.length) {
        return [];
      }
      
      let operationsToShow: Operation[] = ops;
      
      if (selectedClientId) {
        operationsToShow = ops.filter(op => op.clientId === selectedClientId);
      }
      
      if (selectedOperationId) {
        operationsToShow = operationsToShow.filter(op => op.id === selectedOperationId);
      }
      
      let assets = operationsToShow.flatMap(op => op.assets || []);
      
      // Apply DNSH filters
      if (dnshFilterObjective || dnshFilterStatus) {
        assets = assets.filter(asset => {
          const evaluation = asset.dnshEvaluation;
          if (!evaluation) {
            return dnshFilterStatus === 'Not Assessed';
          }
          
          if (dnshFilterObjective) {
            const status = getObjectiveStatusFromAsset(evaluation, dnshFilterObjective);
            if (dnshFilterStatus) {
              return status === dnshFilterStatus;
            }
            return status !== 'Not Assessed';
          }
          
          if (dnshFilterStatus) {
            return evaluation.overallStatus === dnshFilterStatus;
          }
          
          return true;
        });
      }
      
      return assets;
    } catch (error) {
      logger.error('Error loading assets:', error);
      return [];
    }
  }, [ops, selectedClientId, selectedOperationId, dnshFilterObjective, dnshFilterStatus]);
  
  const selectedAsset = allAssets.find(a => a.id === selectedAssetId);
  const selectedClient = selectedClientId ? cl.find(c => c.id === selectedClientId) : null;

  // Métricas globales calculadas desde los assets visibles (no valores hardcodeados)
  const globalStats = useMemo(() => {
    const totalExposure = allAssets.reduce((sum, a) => sum + (a.exposedValue ?? 0), 0);
    const riskScores: number[] = [];
    allAssets.forEach(a => {
      const band = a.dnshEvaluation?.adaptationRiskBand;
      if (band) {
        const v = { Low: 20, Moderate: 45, High: 70, 'Very High': 95 }[band];
        if (v != null) riskScores.push(v);
      }
    });
    const avgRisk = riskScores.length > 0
      ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length)
      : null;
    const activeAlerts = allAssets.filter(
      a => a.dnshEvaluation?.overallStatus === 'Non-Compliant'
    ).length;
    return {
      totalExposure: totalExposure > 0 ? formatLargeNumber(totalExposure) : '€0',
      avgRiskScore: avgRisk != null ? `${avgRisk}/100` : 'N/A',
      activeAlerts,
    };
  }, [allAssets]);
  const selectedOperation = selectedOperationId 
    ? ops.find(op => op.id === selectedOperationId)
    : selectedAsset 
      ? ops.find(op => op.assets.some(a => a.id === selectedAssetId))
      : null;
  
  // Get DNSH status for selected asset
  // Calculate from individual objectives to ensure consistency
  // This ensures that if all objectives are "Not Assessed", the overall status is also "Not Assessed"
  const getAssetDnshStatus = (asset: Asset): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
    if (!asset.dnshEvaluation) return 'Not Assessed';

    // Get status for each objective using centralized function
    const objectiveStatuses = Object.values(DnshObjective).map(objective => 
      getAssetObjectiveStatus(asset, objective)
    );

    // Check if all objectives are Not Assessed
    const allNotAssessed = objectiveStatuses.every(status => status === 'Not Assessed');
    if (allNotAssessed) return 'Not Assessed';

    // Check for Non-Compliant (highest priority)
    if (objectiveStatuses.some(status => status === 'Non-Compliant')) return 'Non-Compliant';

    // Check if all assessed objectives are Compliant
    const assessedStatuses = objectiveStatuses.filter(status => status !== 'Not Assessed');
    if (assessedStatuses.length > 0 && assessedStatuses.every(status => status === 'Compliant')) {
      return 'Compliant';
    }

    // Check for Conditional
    if (objectiveStatuses.some(status => status === 'Conditional')) return 'Conditional';

    // Default: if we have some assessed but mixed results, return Conditional
    return assessedStatuses.length > 0 ? 'Conditional' : 'Not Assessed';
  };
  
  const getAssetDnshStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50';
      case 'Non-Compliant': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'Conditional': return 'text-amber-400 bg-amber-500/20 border-amber-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  // Capas de peligros activas (pestaña Layers)
  const [activeHazards, setActiveHazards] = useState<Record<string, number>>({});

  const toggleHazard = (id: string) => {
      setActiveHazards(prev => {
          const next = {...prev};
          if (next[id]) delete next[id];
          else next[id] = 0.5;
          return next;
      });
  }

  const mapActiveLayers: ActiveLayer[] = Object.entries(activeHazards)
    .map(([id, opacity]) => {
      const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === id);
      return hazard ? { hazard, opacity } : null;
    })
    .filter((l): l is ActiveLayer => l !== null);


  // --- UI COMPONENTS ---

  const SidebarItem = ({ asset }: { asset: Asset }) => {
    const dnshStatus = getAssetDnshStatus(asset);
    const statusColor = getAssetDnshStatusColor(dnshStatus);
    const assetOperation = ops.find(op => op.assets.some(a => a.id === asset.id));
    
    return (
      <button 
        onClick={() => setSelectedAssetId(asset.id)}
        className={`w-full text-left p-3 rounded-lg mb-2 transition-all border ${
           selectedAssetId === asset.id 
             ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
             : `${themeClasses.bg.tertiary} ${themeClasses.border.default} ${themeClasses.text.tertiary} hover:${themeClasses.bg.secondary}`
        }`}
      >
          <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedAssetId === asset.id ? 'text-emerald-400' : themeClasses.text.primary}`}>
                      {asset.name}
                  </p>
                  <p className={`text-[10px] uppercase tracking-wider opacity-70 mt-1 truncate ${themeClasses.text.tertiary}`}>{asset.assetType}</p>
                  {assetOperation && (
                    <p className={`text-[9px] mt-0.5 truncate ${themeClasses.text.tertiary}`}>{assetOperation.name}</p>
                  )}
              </div>
              <div className="flex items-center space-x-1 ml-2">
                {(asset.assetType.includes('Solar') || asset.assetType.includes('Wind') || asset.assetType.includes('Hydro')) && <Zap size={14} className={selectedAssetId === asset.id ? 'text-emerald-400' : 'text-amber-500'} />}
                {(asset.assetType.includes('Building') || asset.assetType.includes('Warehouse')) && <Building size={14} className={selectedAssetId === asset.id ? 'text-emerald-400' : 'text-blue-500'} />}
                {(asset.assetType.includes('Port') || asset.assetType.includes('Highway') || asset.assetType.includes('Railway')) && <Building size={14} className={selectedAssetId === asset.id ? 'text-emerald-400' : 'text-purple-500'} />}
              </div>
          </div>
          <div className={`mt-2 flex items-center justify-between text-[10px] gap-2 ${themeClasses.text.secondary}`}>
               <span className="font-mono opacity-50">€{(asset.exposedValue/1000000).toFixed(1)}M</span>
               <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${statusColor}`}>
                  {dnshStatus === 'Not Assessed' ? 'N/A' : dnshStatus.charAt(0)}
               </span>
               <span className={`px-1.5 py-0.5 rounded ${asset.attributes.elevationMeters < 10 ? 'bg-red-500/20 text-red-400' : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary}`}`}>
                  {asset.attributes.elevationMeters}m
               </span>
          </div>
      </button>
    );
  };

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden font-sans ${themeClasses.bg.primary} ${themeClasses.text.primary}`} style={{ height: '100%', width: '100%' }}>
      
      {/* 1. MAP CANVAS */}
      <div className="absolute inset-0 z-0" style={{ height: '100%', width: '100%' }}>
        {allAssets.length > 0 ? (
          <MapViewer 
              assets={allAssets} 
              activeLayers={mapActiveLayers} 
              theme={mapTheme} 
              focusedAssetId={selectedAssetId}
              onAssetClick={(assetId) => {
                setSelectedAssetId(assetId);
                setClickedAssetId(assetId);
                // Show context menu at center of screen initially
                setContextMenuPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
              }}
          />
        ) : (
          <div className={`flex items-center justify-center h-full ${themeClasses.bg.secondary} ${themeClasses.text.tertiary}`} style={{ height: '100%', width: '100%' }}>
            <div className="text-center">
              <p className={`text-lg mb-2 ${themeClasses.text.secondary}`}>No hay activos disponibles</p>
              <p className={`text-sm ${themeClasses.text.tertiary}`}>Por favor, añade operaciones con activos para visualizarlos en el mapa.</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. HUD: TOP BAR */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
            
            {/* Logo / Status */}
            <div className={`flex items-center space-x-4 backdrop-blur-md border rounded-xl p-2 pr-6 shadow-2xl ${themeClasses.bg.card} ${themeClasses.border.default}`}>
                 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                    <Crosshair size={20} className="animate-[spin_10s_linear_infinite]" />
                 </div>
                 <div>
                     <h1 className={`text-sm font-bold tracking-widest uppercase ${themeClasses.text.primary}`}>Global Risk Monitor</h1>
                     <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-emerald-500 font-mono">LIVE CONNECTED</span>
                     </div>
                 </div>
            </div>

            {/* Global Stats Ticker - calculados desde assets visibles */}
            <div className={`hidden lg:flex items-center space-x-1 backdrop-blur-md border rounded-xl p-1 shadow-2xl ${themeClasses.bg.card} ${themeClasses.border.default}`}>
                <StatItem label="Total Exposure" value={globalStats.totalExposure} color={themeClasses.text.primary} />
                <div className={`w-px h-8 mx-2 ${themeClasses.border.default}`}></div>
                <StatItem label="Avg Risk Score" value={globalStats.avgRiskScore} color="text-amber-500" icon={<AlertTriangle size={12} />} />
                <div className={`w-px h-8 mx-2 ${themeClasses.border.default}`}></div>
                <StatItem label="Active Alerts" value={String(globalStats.activeAlerts)} color="text-red-500" />
            </div>

            {/* Search */}
            <div className={`flex items-center backdrop-blur-md border rounded-xl p-2 shadow-2xl ${themeClasses.bg.card} ${themeClasses.border.default}`}>
                 <Search size={16} className={`ml-2 ${themeClasses.text.tertiary}`} />
                 <input 
                    type="text" 
                    placeholder="Search assets..." 
                    className={`bg-transparent border-none text-sm ${themeClasses.text.primary} ${themeClasses.inputClass} focus:ring-0 w-48`}
                 />
                 <span className={`text-[10px] px-1.5 rounded border mr-1 ${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default}`}>/</span>
            </div>
        </div>
      </div>

      {/* Context Menu - Appears when clicking on asset */}
      {contextMenuPosition && clickedAssetId && (
        <>
          {/* Backdrop to close menu on outside click */}
          <div 
            className="fixed inset-0 z-40 pointer-events-auto"
            onClick={() => {
              setContextMenuPosition(null);
              setClickedAssetId(null);
            }}
          />
          <ContextMenu
            position={contextMenuPosition}
            assetId={clickedAssetId}
            selectedClientId={selectedClientId}
            selectedOperationId={selectedOperationId}
            onClose={() => {
              setContextMenuPosition(null);
              setClickedAssetId(null);
            }}
            onNavigateToOperation={onNavigateToOperation}
            onNavigateToAssetEvaluation={onNavigateToAssetEvaluation}
            onNavigateToDnshEvaluation={onNavigateToDnshEvaluation}
          />
        </>
      )}

      {/* 3. HUD: LEFT SIDEBAR (Hierarchy Filters + Assets) */}
      <div className="absolute top-24 bottom-6 left-6 w-80 z-10 flex flex-col pointer-events-none gap-4">
         {/* Hierarchy Filters */}
         <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">
             <div className="p-4 border-b border-slate-700/50">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                     <Users size={14} className="mr-2" />
                     Filtros de Jerarquía
                 </h3>
                 
                 {/* Client Filter */}
                 <div className="mb-3">
                     <label className="text-[10px] text-slate-500 uppercase mb-1 block">Cliente</label>
                     <select
                         value={selectedClientId || ''}
                         onChange={(e) => {
                             setSelectedClientId(e.target.value || null);
                             setSelectedOperationId(null);
                         }}
                         className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                     >
                         <option value="">Todos los Clientes</option>
                         {cl.map(client => (
                             <option key={client.id} value={client.id}>{client.name}</option>
                         ))}
                     </select>
                 </div>

                 {/* Operation Filter */}
                 {selectedClientId && (
                     <div>
                         <label className="text-[10px] text-slate-500 uppercase mb-1 block">Operación</label>
                         <select
                             value={selectedOperationId || ''}
                             onChange={(e) => setSelectedOperationId(e.target.value || null)}
                             className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                         >
                             <option value="">Todas las Operaciones</option>
                             {ops
                                 .filter(op => op.clientId === selectedClientId)
                                 .map(op => (
                                     <option key={op.id} value={op.id}>{op.name}</option>
                                 ))}
                         </select>
                     </div>
                 )}

                 {/* Clear Filters */}
                 {(selectedClientId || selectedOperationId) && (
                     <button
                         onClick={() => {
                             setSelectedClientId(null);
                             setSelectedOperationId(null);
                         }}
                         className="mt-3 w-full text-xs text-slate-400 hover:text-white py-1.5 px-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                     >
                         Limpiar Filtros
                     </button>
                 )}
             </div>
         </div>

         {/* Assets List */}
         <div className={`flex-1 backdrop-blur-xl border rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col ${themeClasses.bg.card} ${themeClasses.border.default}`}>
             <div className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${themeClasses.border.default}`}>
                 <h3 className={`text-xs font-bold uppercase tracking-wider ${themeClasses.text.tertiary}`}>Assets</h3>
                 <span className={`text-[10px] px-2 py-0.5 rounded-full ${themeClasses.bg.tertiary} ${themeClasses.text.tertiary}`}>{allAssets.length} Units</span>
             </div>
             
             {/* Filter Tabs */}
             <div className={`flex p-2 gap-2 border-b flex-shrink-0 ${themeClasses.border.default}`}>
                 <button 
                   onClick={() => { setDnshFilterStatus(null); setDnshFilterObjective(null); }}
                   className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${
                     !dnshFilterStatus && !dnshFilterObjective
                       ? `${themeClasses.text.secondary} ${themeClasses.bg.tertiary}`
                       : `${themeClasses.text.tertiary} hover:${themeClasses.text.secondary}`
                   }`}
                 >
                   All
                 </button>
                 <button 
                   onClick={() => setDnshFilterStatus('Non-Compliant')}
                   className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${
                     dnshFilterStatus === 'Non-Compliant'
                       ? 'text-red-400 bg-red-500/20'
                       : `${themeClasses.text.tertiary} hover:${themeClasses.text.secondary}`
                   }`}
                 >
                   Critical
                 </button>
                 <button 
                   onClick={() => setDnshFilterStatus('Conditional')}
                   className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${
                     dnshFilterStatus === 'Conditional'
                       ? 'text-amber-400 bg-amber-500/20'
                       : `${themeClasses.text.tertiary} hover:${themeClasses.text.secondary}`
                   }`}
                 >
                   Watchlist
                 </button>
             </div>
             
             {/* DNSH Quick Filters */}
             <div className={`p-2 border-b flex-shrink-0 ${themeClasses.border.default}`}>
               <div className={`text-[9px] uppercase tracking-wider mb-2 px-2 ${themeClasses.text.tertiary}`}>Filtros DNSH</div>
               <select
                 value={dnshFilterObjective || ''}
                 onChange={(e) => setDnshFilterObjective(e.target.value as DnshObjective || null)}
                 className={`w-full text-[10px] rounded px-2 py-1.5 mb-2 ${themeClasses.inputClass}`}
               >
                 <option value="">Todos los Objetivos</option>
                 <option value={DnshObjective.MITIGATION}>Mitigación</option>
                 <option value={DnshObjective.ADAPTATION}>Adaptación</option>
                 <option value={DnshObjective.WATER}>Agua</option>
                 <option value={DnshObjective.CIRCULAR}>Economía Circular</option>
                 <option value={DnshObjective.POLLUTION}>Contaminación</option>
                 <option value={DnshObjective.BIODIVERSITY}>Biodiversidad</option>
               </select>
               <select
                 value={dnshFilterStatus || ''}
                 onChange={(e) => setDnshFilterStatus(e.target.value as typeof dnshFilterStatus || null)}
                 className={`w-full text-[10px] rounded px-2 py-1.5 ${themeClasses.inputClass}`}
               >
                 <option value="">Todos los Estados</option>
                 <option value="Compliant">Compliant</option>
                 <option value="Non-Compliant">Non-Compliant</option>
                 <option value="Conditional">Conditional</option>
                 <option value="Not Assessed">Not Assessed</option>
               </select>
             </div>

             <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0">
                 {allAssets.length > 0 ? (
                     allAssets.map(asset => {
                         const assetOperation = ops.find(op => op.assets.some(a => a.id === asset.id));
                         const assetClient = assetOperation ? cl.find(c => c.id === assetOperation.clientId) : null;
                         
                         return (
                             <div key={asset.id}>
                                 {assetOperation && assetClient && (
                                     <div className={`text-[9px] uppercase mb-1 mt-2 px-2 ${themeClasses.text.tertiary}`}>
                                         {assetClient.name} / {assetOperation.name}
                                     </div>
                                 )}
                                 <SidebarItem asset={asset} />
                             </div>
                         );
                     })
                 ) : (
                     <div className={`text-center p-4 text-xs ${themeClasses.text.tertiary}`}>
                         No hay assets con los filtros seleccionados
                     </div>
                 )}
             </div>
         </div>
      </div>

      {/* 4. HUD: RIGHT SIDEBAR (Inspector) - Collapsible */}
      <div className={`absolute top-24 bottom-6 right-6 z-10 pointer-events-none flex flex-col gap-4 transition-all duration-300 ${
        isInspectorCollapsed ? 'w-auto' : 'w-96'
      }`}>
         
         {/* Collapse/Expand Button */}
         <div className="pointer-events-auto flex gap-2 self-end items-center">
             {!isInspectorCollapsed && (
               <>
                 <button 
                    onClick={() => setActiveTab('details')}
                    className={`px-3 py-1.5 rounded-lg backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        activeTab === 'details' 
                        ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                 >
                    Inspector
                 </button>
                 <button 
                    onClick={() => setActiveTab('dnsh')}
                    className={`px-3 py-1.5 rounded-lg backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        activeTab === 'dnsh' 
                        ? 'bg-purple-500/90 border-purple-400 text-white shadow-lg shadow-purple-500/20' 
                        : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                 >
                    DNSH
                 </button>
                 <button 
                    onClick={() => setActiveTab('layers')}
                    className={`px-3 py-1.5 rounded-lg backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider transition-all ${
                        activeTab === 'layers' 
                        ? 'bg-blue-500/90 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                 >
                    Layers
                 </button>
               </>
             )}
             <button
                onClick={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
                className={`px-2 py-1.5 rounded-lg backdrop-blur-md border border-slate-700/50 bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${
                  isInspectorCollapsed ? 'shadow-lg' : ''
                }`}
                title={isInspectorCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
             >
                {isInspectorCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
             </button>
         </div>

         {!isInspectorCollapsed && (
           <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col relative">
            
            {activeTab === 'details' ? (
                selectedAsset ? (
                    <div className="flex-1 overflow-y-auto p-0">
                        {/* Header Image / Gradient */}
                        <div className="h-32 bg-gradient-to-b from-slate-800 to-slate-900 relative p-6 flex flex-col justify-end border-b border-slate-700/50">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                 {(selectedAsset.assetType.includes('Solar') || selectedAsset.assetType.includes('Wind')) ? <Zap size={100} /> : <Building size={100} />}
                             </div>
                             <h2 className="text-xl font-bold text-white relative z-10">{selectedAsset.name}</h2>
                             <div className="flex items-center justify-between mt-2 relative z-10">
                               <p className="text-xs text-emerald-400 font-mono flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                  OPERATIONAL
                               </p>
                               {selectedOperation && onNavigateToOperation && (
                                 <button
                                   onClick={() => onNavigateToOperation(selectedOperation.id)}
                                   className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center"
                                 >
                                   {selectedOperation.name}
                                   <ArrowRight size={12} className="ml-1" />
                                 </button>
                               )}
                             </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="p-6 space-y-6">
                            
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <p className="text-[10px] text-slate-500 uppercase">Exposed Value</p>
                                    <p className="text-lg font-mono text-white">€{(selectedAsset.exposedValue/1000000).toFixed(1)}M</p>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <p className="text-[10px] text-slate-500 uppercase">Built Year</p>
                                    <p className="text-lg font-mono text-white">{selectedAsset.attributes.yearBuilt}</p>
                                </div>
                            </div>

                            {/* Proyección de riesgo climático */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center">
                                    <TrendingUp size={14} className="mr-2 text-blue-500" />
                                    Climate Risk Projection (RCP 4.5)
                                </h4>
                                <div className="h-40 w-full bg-slate-800/30 rounded-lg border border-slate-700/50 relative overflow-hidden">
                                     <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                         <path d="M0,100 C50,90 150,80 300,40 L300,160 L0,160 Z" fill="rgba(239, 68, 68, 0.1)" />
                                         <path d="M0,100 C50,90 150,80 300,40" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" />
                                     </svg>
                                     <div className="absolute bottom-2 left-4 text-[10px] text-slate-500">2024</div>
                                     <div className="absolute bottom-2 right-4 text-[10px] text-slate-500">2050</div>
                                </div>
                            </div>

                            {/* Physical Attributes */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Physical Attributes</h4>
                                <div className="space-y-2">
                                    <AttributeRow label="Elevation" value={`${selectedAsset.attributes.elevationMeters}m AMSL`} icon={<Activity size={12}/>} />
                                    <AttributeRow label="Dist. to Coast" value={`${selectedAsset.attributes.distanceToCoastKm}km`} icon={<Activity size={12}/>} />
                                    <AttributeRow label="Max Temp Tol." value={`${selectedAsset.attributes.temperatureToleranceC}°C`} icon={<Thermometer size={12}/>} />
                                </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="pt-4 border-t border-slate-700/50">
                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Acciones Rápidas</h4>
                              <div className="space-y-2">
                                {onNavigateToAssetEvaluation && (
                                  <button
                                    onClick={() => onNavigateToAssetEvaluation(selectedAsset.id)}
                                    className="w-full px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex items-center justify-center"
                                  >
                                    <ShieldCheck size={14} className="mr-2" />
                                    Evaluar DNSH
                                  </button>
                                )}
                                {selectedOperation && onNavigateToDnshEvaluation && (
                                  <button
                                    onClick={() => onNavigateToDnshEvaluation(selectedOperation.id)}
                                    className="w-full px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition-colors flex items-center justify-center"
                                  >
                                    <ShieldCheck size={14} className="mr-2" />
                                    Ver Evaluación Completa
                                  </button>
                                )}
                              </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                        <MapPin size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium text-slate-500">No Asset Selected</p>
                        <p className="text-xs mt-2 opacity-50">Select an asset from the map or list to view telemetry.</p>
                    </div>
                )
            ) : activeTab === 'dnsh' ? (
                selectedAsset ? (
                    <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 px-2 flex items-center">
                            <ShieldCheck size={14} className="mr-2" />
                            Estado DNSH
                        </h3>
                        <div className="space-y-3">
                            {/* Overall Status */}
                            <div className={`p-3 rounded-lg border ${getAssetDnshStatusColor(getAssetDnshStatus(selectedAsset))}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-white">Estado General</span>
                                    <span className="text-xs font-bold">{getAssetDnshStatus(selectedAsset)}</span>
                                </div>
                            </div>
                            
                            {/* Per-Objective Status */}
                            {Object.values(DnshObjective).map(objective => {
                                const evaluation = selectedAsset.dnshEvaluation;
                                const status = evaluation 
                                  ? getObjectiveStatusFromAsset(evaluation, objective)
                                  : 'Not Assessed';
                                
                                const objectiveLabels: Record<DnshObjective, string> = {
                                    [DnshObjective.MITIGATION]: 'Mitigación',
                                    [DnshObjective.ADAPTATION]: 'Adaptación',
                                    [DnshObjective.WATER]: 'Agua',
                                    [DnshObjective.CIRCULAR]: 'Economía Circular',
                                    [DnshObjective.POLLUTION]: 'Contaminación',
                                    [DnshObjective.BIODIVERSITY]: 'Biodiversidad',
                                };
                                
                                // Show "Not Assessed" status clearly
                                if (status === 'Not Assessed') {
                                  return (
                                    <div
                                      key={objective}
                                      className="w-full flex items-center justify-between p-2 rounded border bg-slate-800/30 border-slate-700/30 opacity-60"
                                    >
                                      <span className="text-xs text-slate-400">
                                        {objectiveLabels[objective] || objective}
                                      </span>
                                      <span className="text-xs text-slate-500 italic">Not Assessed</span>
                                    </div>
                                  );
                                }
                                
                                const getStatusIcon = () => {
                                    switch (status) {
                                        case 'Compliant': return <CheckCircle2 size={14} className="text-emerald-400" />;
                                        case 'Non-Compliant': return <XCircle size={14} className="text-red-400" />;
                                        case 'Conditional': return <AlertTriangle size={14} className="text-amber-400" />;
                                        default: return <Clock size={14} className="text-slate-400" />;
                                    }
                                };
                                
                                return (
                                    <button
                                        key={objective}
                                        onClick={() => {
                                            if (selectedOperation && onNavigateToDnshEvaluation) {
                                                onNavigateToDnshEvaluation(selectedOperation.id, objective);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded border transition-all ${
                                            status === 'Compliant' ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' :
                                            status === 'Non-Compliant' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' :
                                            status === 'Conditional' ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' :
                                            'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon()}
                                            <span className="text-xs text-slate-300">{objectiveLabels[objective]}</span>
                                        </div>
                                        <span className={`text-xs font-semibold ${
                                            status === 'Compliant' ? 'text-emerald-400' :
                                            status === 'Non-Compliant' ? 'text-red-400' :
                                            status === 'Conditional' ? 'text-amber-400' :
                                            'text-slate-400'
                                        }`}>
                                            {status}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                        <ShieldCheck size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium text-slate-500">No Asset Selected</p>
                        <p className="text-xs mt-2 opacity-50">Select an asset to view DNSH status.</p>
                    </div>
                )
            ) : (
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 px-2">Hazard Layers</h3>
                    <div className="space-y-2">
                        {EU_TAXONOMY_HAZARDS.slice(0, 8).map(hazard => {
                             const isActive = !!activeHazards[hazard.id];
                             return (
                                <button 
                                    key={hazard.id}
                                    onClick={() => toggleHazard(hazard.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        isActive 
                                        ? 'bg-blue-500/10 border-blue-500/50 text-white' 
                                        : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:bg-slate-800/60'
                                    }`}
                                >
                                    <span className="text-xs font-medium truncate pr-4">{hazard.name}</span>
                                    <div className={`w-3 h-3 rounded-full border ${isActive ? 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'border-slate-600'}`}></div>
                                </button>
                             );
                        })}
                    </div>
                </div>
            )}
           </div>
         )}
      </div>

    </div>
  );
};

// Sub-components
interface StatItemProps {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}

const StatItem = ({ label, value, color, icon }: StatItemProps) => (
    <div className="px-4 py-1">
        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{label}</p>
        <div className={`text-sm font-mono font-bold flex items-center ${color || ''}`}>
            {icon && <span className="mr-1.5">{icon}</span>}
            {value}
        </div>
    </div>
);

interface AttributeRowProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

const AttributeRow = ({ label, value, icon }: AttributeRowProps) => (
    <div className="flex justify-between items-center p-2 bg-slate-800/40 rounded border border-slate-700/30">
        <span className="text-xs text-slate-500 flex items-center">
            <span className="mr-2 opacity-50">{icon}</span> {label}
        </span>
        <span className="text-xs font-mono text-slate-300">{value}</span>
    </div>
);

// Context Menu Component - Shows info based on granularity level
interface ContextMenuProps {
  position: { x: number; y: number };
  assetId: string;
  selectedClientId: string | null;
  selectedOperationId: string | null;
  onClose: () => void;
  onNavigateToOperation?: (operationId: string) => void;
  onNavigateToAssetEvaluation?: (assetId: string) => void;
  onNavigateToDnshEvaluation?: (operationId: string, objective?: DnshObjective) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  assetId,
  selectedClientId,
  selectedOperationId,
  onClose,
  onNavigateToOperation,
  onNavigateToAssetEvaluation,
  onNavigateToDnshEvaluation
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  const clickedAsset = ops
    .flatMap(op => op.assets)
    .find(a => a.id === assetId);
  
  const clickedOperation = clickedAsset 
    ? ops.find(op => op.assets.some(a => a.id === assetId))
    : null;
  
  const clickedClient = clickedOperation 
    ? cl.find(c => c.id === clickedOperation.clientId)
    : null;

  // Determine granularity level based on current filters and clicked asset
  // Priority: Operation > Client > Asset > General
  const granularityLevel = useMemo(() => {
    if (selectedOperationId) {
      return 'operation';
    } else if (selectedClientId) {
      return 'client';
    } else if (clickedAsset) {
      return 'asset';
    }
    return 'general';
  }, [selectedOperationId, selectedClientId, clickedAsset]);

  // Calculate aggregated data based on level
  const contextData = useMemo(() => {
    // If operation is selected, show operation-level aggregation
    if (granularityLevel === 'operation') {
      // Use selected operation if available, otherwise use clicked asset's operation
      const operation = selectedOperationId 
        ? ops.find(op => op.id === selectedOperationId)
        : clickedOperation;
      
      if (!operation) {
        return {
          title: 'OPERATION_NOT_FOUND',
          subtitle: '',
          level: 'OPERATION',
          metrics: { totalValue: 0, assetCount: 0, compliantAssets: 0, complianceRate: 0 },
        };
      }
      
      const assets = operation.assets;
      const totalValue = assets.reduce((sum, a) => sum + a.exposedValue, 0);
      const statuses = assets.map(a => a.dnshEvaluation?.overallStatus || 'Not Assessed');
      const compliantCount = statuses.filter(s => s === 'Compliant').length;
      
      return {
        title: operation.name,
        subtitle: `${assets.length} ASSETS`,
        level: 'OPERATION',
        metrics: {
          totalValue,
          assetCount: assets.length,
          compliantAssets: compliantCount,
          complianceRate: assets.length > 0 ? Math.round((compliantCount / assets.length) * 100) : 0,
        },
        operation: operation,
        client: cl.find(c => c.id === operation.clientId) || null,
      };
    }
    // If client is selected, show client-level aggregation
    else if (granularityLevel === 'client') {
      const client = selectedClientId 
        ? cl.find(c => c.id === selectedClientId)
        : clickedClient;
      
      if (!client) {
        return {
          title: 'CLIENT_NOT_FOUND',
          subtitle: '',
          level: 'CLIENT',
          metrics: { totalValue: 0, operationCount: 0, assetCount: 0, compliantAssets: 0, complianceRate: 0 },
        };
      }
      
      const clientOperations = ops.filter(op => op.clientId === client.id);
      const clientAssets = clientOperations.flatMap(op => op.assets);
      const totalValue = clientAssets.reduce((sum, a) => sum + a.exposedValue, 0);
      const statuses = clientAssets.map(a => a.dnshEvaluation?.overallStatus || 'Not Assessed');
      const compliantCount = statuses.filter(s => s === 'Compliant').length;
      
      return {
        title: client.name,
        subtitle: `${clientOperations.length} OPERATIONS • ${clientAssets.length} ASSETS`,
        level: 'CLIENT',
        metrics: {
          totalValue,
          operationCount: clientOperations.length,
          assetCount: clientAssets.length,
          compliantAssets: compliantCount,
          complianceRate: clientAssets.length > 0 ? Math.round((compliantCount / clientAssets.length) * 100) : 0,
        },
        client: client,
      };
    }
    // If asset is clicked, show asset-specific info
    else if (granularityLevel === 'asset' && clickedAsset) {
      // Asset level - show specific asset info
      const evaluation = clickedAsset.dnshEvaluation;
      const status = evaluation?.overallStatus || 'Not Assessed';
      
      return {
        title: clickedAsset.name,
        subtitle: clickedAsset.assetType,
        level: 'ASSET',
        metrics: {
          exposedValue: clickedAsset.exposedValue,
          elevation: clickedAsset.attributes.elevationMeters,
          distanceToCoast: clickedAsset.attributes.distanceToCoastKm,
          dnshStatus: status,
        },
        operation: clickedOperation,
        client: clickedClient,
      };
    } 
    // General/Portfolio level - show portfolio overview
    else {
      // General level - show portfolio overview
      const allAssets = ops.flatMap(op => op.assets);
      const totalValue = allAssets.reduce((sum, a) => sum + a.exposedValue, 0);
      const statuses = allAssets.map(a => a.dnshEvaluation?.overallStatus || 'Not Assessed');
      const compliantCount = statuses.filter(s => s === 'Compliant').length;
      
      return {
        title: 'PORTFOLIO_OVERVIEW',
        subtitle: `${ops.length} OPERATIONS • ${allAssets.length} ASSETS`,
        level: 'PORTFOLIO',
        metrics: {
          totalValue,
          operationCount: ops.length,
          assetCount: allAssets.length,
          compliantAssets: compliantCount,
          complianceRate: allAssets.length > 0 ? Math.round((compliantCount / allAssets.length) * 100) : 0,
        },
      };
    }
  }, [granularityLevel, clickedAsset, clickedOperation, clickedClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'Non-Compliant': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'Conditional': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <div 
      className="fixed z-50 pointer-events-auto"
      style={{ 
        left: `${Math.min(position.x - 200, window.innerWidth - 420)}px`,
        top: `${Math.min(position.y - 150, window.innerHeight - 400)}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`backdrop-blur-xl border rounded-xl shadow-2xl w-80 animate-fadeIn ${themeClasses.bg.card} ${themeClasses.border.default}`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-start justify-between flex-shrink-0 ${themeClasses.border.default}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                {contextData.level}
              </span>
            </div>
            <h3 className={`text-lg font-bold truncate font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
              {contextData.title}
            </h3>
            <p className={`text-xs mt-1 font-mono uppercase ${themeClasses.text.tertiary}`}>
              {contextData.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`ml-2 p-1 rounded transition-colors ${themeClasses.bg.tertiary} hover:${themeClasses.bg.secondary} ${themeClasses.text.tertiary} hover:${themeClasses.text.primary}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className={`p-4 space-y-4 max-h-96 overflow-y-auto min-h-0 ${themeClasses.text.primary}`}>
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
              <p className={`text-[10px] uppercase mb-1 font-mono ${themeClasses.text.tertiary}`}>EXPOSED_VALUE</p>
              <p className={`text-lg font-mono ${themeClasses.text.primary}`}>€{(contextData.metrics.totalValue / 1000000).toFixed(1)}M</p>
            </div>
            {granularityLevel === 'asset' ? (
              <div className={`p-3 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                <p className={`text-[10px] uppercase mb-1 font-mono ${themeClasses.text.tertiary}`}>ELEVATION</p>
                <p className={`text-lg font-mono ${themeClasses.text.primary}`}>{contextData.metrics.elevation}m</p>
              </div>
            ) : (
              <div className={`p-3 rounded-lg border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                <p className={`text-[10px] uppercase mb-1 font-mono ${themeClasses.text.tertiary}`}>COMPLIANCE</p>
                <p className={`text-lg font-mono ${themeClasses.text.primary}`}>{contextData.metrics.complianceRate}%</p>
              </div>
            )}
          </div>

          {/* DNSH Status */}
          {granularityLevel === 'asset' && clickedAsset && (
            <div className={`p-3 rounded-lg border ${getStatusColor(contextData.metrics.dnshStatus)}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase font-mono ${themeClasses.text.primary}`}>DNSH_STATUS</span>
                <span className={`text-xs font-bold ${themeClasses.text.primary}`}>{contextData.metrics.dnshStatus}</span>
              </div>
            </div>
          )}

          {/* Hierarchy Info */}
          {(contextData.operation || contextData.client) && (
            <div className={`space-y-2 pt-2 border-t ${themeClasses.border.default}`}>
              {contextData.client && (
                <div className={`flex items-center justify-between p-2 rounded border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className="flex items-center space-x-2">
                    <Building2 size={14} className="text-blue-400" />
                    <span className={`text-xs font-mono uppercase ${themeClasses.text.tertiary}`}>CLIENT</span>
                  </div>
                  <span className={`text-xs font-mono truncate ml-2 ${themeClasses.text.primary}`}>{contextData.client.name}</span>
                </div>
              )}
              {contextData.operation && (
                <div className={`flex items-center justify-between p-2 rounded border ${themeClasses.bg.tertiary} ${themeClasses.border.default}`}>
                  <div className="flex items-center space-x-2">
                    <Briefcase size={14} className="text-emerald-400" />
                    <span className={`text-xs font-mono uppercase ${themeClasses.text.tertiary}`}>OPERATION</span>
                  </div>
                  <span className={`text-xs font-mono truncate ml-2 ${themeClasses.text.primary}`}>{contextData.operation.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={`pt-2 border-t space-y-2 ${themeClasses.border.default}`}>
            {granularityLevel === 'asset' && clickedAsset && (
              <>
                {onNavigateToAssetEvaluation && (
                  <button
                    onClick={() => {
                      onNavigateToAssetEvaluation(clickedAsset.id);
                      onClose();
                    }}
                    className="w-full px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex items-center justify-center font-mono uppercase"
                  >
                    <ShieldCheck size={14} className="mr-2" />
                    EVALUAR_ASSET
                  </button>
                )}
                {clickedOperation && onNavigateToDnshEvaluation && (
                  <button
                    onClick={() => {
                      onNavigateToDnshEvaluation(clickedOperation.id);
                      onClose();
                    }}
                    className="w-full px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition-colors flex items-center justify-center font-mono uppercase"
                  >
                    <ShieldCheck size={14} className="mr-2" />
                    VER_EVALUACION_COMPLETA
                  </button>
                )}
              </>
            )}
            {granularityLevel === 'operation' && clickedOperation && onNavigateToOperation && (
              <button
                onClick={() => {
                  onNavigateToOperation(clickedOperation.id);
                  onClose();
                }}
                className="w-full px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex items-center justify-center font-mono uppercase"
              >
                <ArrowRight size={14} className="mr-2" />
                VER_OPERACION
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMapViewerPage;
