
import React, { useMemo, useState } from 'react';
import MapViewer, { ActiveLayer } from '../components/MapViewer';
import { DEMO_OPERATIONS, DEMO_CLIENTS, EU_TAXONOMY_HAZARDS } from '../constants';
import { 
  Layers, MapPin, Search, Filter, Activity, TrendingUp, Maximize2, 
  Crosshair, ChevronDown, AlertTriangle, Zap, Building, Truck, Thermometer, Wind, ChevronLeft, ChevronRight, X, Building2, Users, ShieldCheck, CheckCircle2, XCircle, Clock, ArrowRight
} from 'lucide-react';
import { Asset, HazardType, Client, Operation, DnshObjective } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { logger } from '../utils/logger';

interface GlobalMapViewerPageProps {
  onNavigateToOperation?: (operationId: string) => void;
  onNavigateToAssetEvaluation?: (assetId: string) => void;
  onNavigateToDnshEvaluation?: (operationId: string, objective?: DnshObjective) => void;
}

const GlobalMapViewerPage: React.FC<GlobalMapViewerPageProps> = ({
  onNavigateToOperation,
  onNavigateToAssetEvaluation,
  onNavigateToDnshEvaluation
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'layers' | 'dnsh'>('details');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [dnshFilterObjective, setDnshFilterObjective] = useState<DnshObjective | null>(null);
  const [dnshFilterStatus, setDnshFilterStatus] = useState<'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | null>(null);

  // Filter assets based on selected client/operation and DNSH filters
  const allAssets = useMemo(() => {
    try {
      if (!DEMO_OPERATIONS || !Array.isArray(DEMO_OPERATIONS)) {
        return [];
      }
      
      let operationsToShow: Operation[] = DEMO_OPERATIONS;
      
      if (selectedClientId) {
        operationsToShow = DEMO_OPERATIONS.filter(op => op.clientId === selectedClientId);
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
  }, [selectedClientId, selectedOperationId, dnshFilterObjective, dnshFilterStatus]);
  
  const selectedAsset = allAssets.find(a => a.id === selectedAssetId);
  const selectedClient = selectedClientId ? DEMO_CLIENTS.find(c => c.id === selectedClientId) : null;
  const selectedOperation = selectedOperationId 
    ? DEMO_OPERATIONS.find(op => op.id === selectedOperationId)
    : selectedAsset 
      ? DEMO_OPERATIONS.find(op => op.assets.some(a => a.id === selectedAssetId))
      : null;
  
  // Get DNSH status for selected asset
  const getAssetDnshStatus = (asset: Asset) => {
    return asset.dnshEvaluation?.overallStatus || 'Not Assessed';
  };
  
  const getAssetDnshStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50';
      case 'Non-Compliant': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'Conditional': return 'text-amber-400 bg-amber-500/20 border-amber-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  // Mock Active Hazards for "Layers" tab
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
    const assetOperation = DEMO_OPERATIONS.find(op => op.assets.some(a => a.id === asset.id));
    
    return (
      <button 
        onClick={() => setSelectedAssetId(asset.id)}
        className={`w-full text-left p-3 rounded-lg mb-2 transition-all border ${
           selectedAssetId === asset.id 
             ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
             : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
        }`}
      >
          <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedAssetId === asset.id ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {asset.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70 mt-1 truncate">{asset.assetType}</p>
                  {assetOperation && (
                    <p className="text-[9px] text-slate-500 mt-0.5 truncate">{assetOperation.name}</p>
                  )}
              </div>
              <div className="flex items-center space-x-1 ml-2">
                {(asset.assetType.includes('Solar') || asset.assetType.includes('Wind') || asset.assetType.includes('Hydro')) && <Zap size={14} className={selectedAssetId === asset.id ? 'text-emerald-400' : 'text-amber-500'} />}
                {(asset.assetType.includes('Building') || asset.assetType.includes('Warehouse')) && <Building size={14} className={selectedAssetId === asset.id ? 'text-emerald-400' : 'text-blue-500'} />}
                {(asset.assetType.includes('Port') || asset.assetType.includes('Highway') || asset.assetType.includes('Railway')) && <Building size={14} className={selectedAssetId === asset.id ? 'text-emerald-400' : 'text-purple-500'} />}
              </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] gap-2">
               <span className="font-mono opacity-50">€{(asset.exposedValue/1000000).toFixed(1)}M</span>
               <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${statusColor}`}>
                  {dnshStatus === 'Not Assessed' ? 'N/A' : dnshStatus.charAt(0)}
               </span>
               <span className={`px-1.5 py-0.5 rounded ${asset.attributes.elevationMeters < 10 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                  {asset.attributes.elevationMeters}m
               </span>
          </div>
      </button>
    );
  };

  return (
    <div className="h-full w-full flex flex-col relative bg-black overflow-hidden font-sans text-slate-200" style={{ height: '100%', width: '100%' }}>
      
      {/* 1. MAP CANVAS */}
      <div className="absolute inset-0 z-0" style={{ height: '100%', width: '100%' }}>
        {allAssets.length > 0 ? (
          <MapViewer 
              assets={allAssets} 
              activeLayers={mapActiveLayers} 
              theme={mapTheme} 
              focusedAssetId={selectedAssetId}
              onAssetClick={setSelectedAssetId}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-900 text-slate-400" style={{ height: '100%', width: '100%' }}>
            <div className="text-center">
              <p className="text-lg mb-2">No hay activos disponibles</p>
              <p className="text-sm">Por favor, añade operaciones con activos para visualizarlos en el mapa.</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. HUD: TOP BAR */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
            
            {/* Logo / Status */}
            <div className="flex items-center space-x-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-2 pr-6 shadow-2xl">
                 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                    <Crosshair size={20} className="animate-[spin_10s_linear_infinite]" />
                 </div>
                 <div>
                     <h1 className="text-sm font-bold text-white tracking-widest uppercase">Global Risk Monitor</h1>
                     <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-emerald-500 font-mono">LIVE CONNECTED</span>
                     </div>
                 </div>
            </div>

            {/* Global Stats Ticker */}
            <div className="hidden lg:flex items-center space-x-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 shadow-2xl">
                <StatItem label="Total Exposure" value="€185.4M" color="text-white" />
                <div className="w-px h-8 bg-slate-700 mx-2"></div>
                <StatItem label="Avg Risk Score" value="72/100" color="text-amber-500" icon={<AlertTriangle size={12} />} />
                <div className="w-px h-8 bg-slate-700 mx-2"></div>
                <StatItem label="Active Alerts" value="3" color="text-red-500" />
            </div>

            {/* Search */}
            <div className="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-2 shadow-2xl">
                 <Search size={16} className="text-slate-500 ml-2" />
                 <input 
                    type="text" 
                    placeholder="Search assets..." 
                    className="bg-transparent border-none text-sm text-white placeholder-slate-600 focus:ring-0 w-48"
                 />
                 <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 rounded border border-slate-700 mr-1">/</span>
            </div>
        </div>
      </div>

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
                         {DEMO_CLIENTS.map(client => (
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
                             {DEMO_OPERATIONS
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
         <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assets</h3>
                 <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">{allAssets.length} Units</span>
             </div>
             
             {/* Filter Tabs */}
             <div className="flex p-2 gap-2 border-b border-slate-700/50">
                 <button 
                   onClick={() => { setDnshFilterStatus(null); setDnshFilterObjective(null); }}
                   className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${
                     !dnshFilterStatus && !dnshFilterObjective
                       ? 'text-slate-300 bg-slate-700/50'
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                   All
                 </button>
                 <button 
                   onClick={() => setDnshFilterStatus('Non-Compliant')}
                   className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${
                     dnshFilterStatus === 'Non-Compliant'
                       ? 'text-red-400 bg-red-500/20'
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                   Critical
                 </button>
                 <button 
                   onClick={() => setDnshFilterStatus('Conditional')}
                   className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded transition-colors ${
                     dnshFilterStatus === 'Conditional'
                       ? 'text-amber-400 bg-amber-500/20'
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                 >
                   Watchlist
                 </button>
             </div>
             
             {/* DNSH Quick Filters */}
             <div className="p-2 border-b border-slate-700/50">
               <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2 px-2">Filtros DNSH</div>
               <select
                 value={dnshFilterObjective || ''}
                 onChange={(e) => setDnshFilterObjective(e.target.value as DnshObjective || null)}
                 className="w-full bg-slate-800 border border-slate-700 text-[10px] text-white rounded px-2 py-1.5 mb-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                 className="w-full bg-slate-800 border border-slate-700 text-[10px] text-white rounded px-2 py-1.5 focus:ring-emerald-500 focus:border-emerald-500"
               >
                 <option value="">Todos los Estados</option>
                 <option value="Compliant">Compliant</option>
                 <option value="Non-Compliant">Non-Compliant</option>
                 <option value="Conditional">Conditional</option>
                 <option value="Not Assessed">Not Assessed</option>
               </select>
             </div>

             <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                 {allAssets.length > 0 ? (
                     allAssets.map(asset => {
                         const assetOperation = DEMO_OPERATIONS.find(op => op.assets.some(a => a.id === asset.id));
                         const assetClient = assetOperation ? DEMO_CLIENTS.find(c => c.id === assetOperation.clientId) : null;
                         
                         return (
                             <div key={asset.id}>
                                 {assetOperation && assetClient && (
                                     <div className="text-[9px] text-slate-500 uppercase mb-1 mt-2 px-2">
                                         {assetClient.name} / {assetOperation.name}
                                     </div>
                                 )}
                                 <SidebarItem asset={asset} />
                             </div>
                         );
                     })
                 ) : (
                     <div className="text-center text-slate-500 p-4 text-xs">
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

                            {/* Risk Projection Graph Mock */}
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
const StatItem = ({ label, value, color, icon }: any) => (
    <div className="px-4 py-1">
        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{label}</p>
        <div className={`text-sm font-mono font-bold flex items-center ${color}`}>
            {icon && <span className="mr-1.5">{icon}</span>}
            {value}
        </div>
    </div>
);

const AttributeRow = ({ label, value, icon }: any) => (
    <div className="flex justify-between items-center p-2 bg-slate-800/40 rounded border border-slate-700/30">
        <span className="text-xs text-slate-500 flex items-center">
            <span className="mr-2 opacity-50">{icon}</span> {label}
        </span>
        <span className="text-xs font-mono text-slate-300">{value}</span>
    </div>
);

export default GlobalMapViewerPage;
