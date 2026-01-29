import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, ArrowRight, CheckCircle, XCircle, AlertTriangle, HelpCircle, Building2, Users, Archive, X } from 'lucide-react';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from '../constants';
import { Operation, AssetDnshEvaluation, Client } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { getActiveOperations, dataStore, getClientOperations, archiveOperation, deleteOperation } from '../services/dataManagement';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

interface Props {
  onNavigateToOperation: (id: string) => void;
  selectedClientId?: string | null;
  onNavigateToClient?: (clientId: string) => void;
}

/**
 * Calculate DNSH status at operation level based on asset-level evaluations
 * Returns aggregated status considering asymmetric compliance
 */
const calculateOperationDnshStatus = (operation: Operation): {
  overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | 'Asymmetric';
  compliantAssets: number;
  totalAssets: number;
  breakdown: {
    compliant: number;
    nonCompliant: number;
    conditional: number;
    notAssessed: number;
  };
} => {
  const totalAssets = operation.assets.length;
  
  if (totalAssets === 0) {
    return {
      overallStatus: 'Not Assessed',
      compliantAssets: 0,
      totalAssets: 0,
      breakdown: { compliant: 0, nonCompliant: 0, conditional: 0, notAssessed: 0 }
    };
  }

  const breakdown = {
    compliant: 0,
    nonCompliant: 0,
    conditional: 0,
    notAssessed: 0
  };

  operation.assets.forEach(asset => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) {
      breakdown.notAssessed++;
      return;
    }

    const status = evaluation.overallStatus;
    switch (status) {
      case 'Compliant':
        breakdown.compliant++;
        break;
      case 'Non-Compliant':
        breakdown.nonCompliant++;
        break;
      case 'Conditional':
        breakdown.conditional++;
        break;
      default:
        breakdown.notAssessed++;
    }
  });

  const compliantAssets = breakdown.compliant;
  
  // Determine overall status
  let overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | 'Asymmetric';
  
  if (breakdown.notAssessed === totalAssets) {
    overallStatus = 'Not Assessed';
  } else if (breakdown.compliant === totalAssets) {
    overallStatus = 'Compliant';
  } else if (breakdown.nonCompliant > 0) {
    // If any asset is non-compliant, operation is asymmetric (can apply ISF asymmetrically)
    overallStatus = 'Asymmetric';
  } else if (breakdown.conditional > 0) {
    overallStatus = 'Conditional';
  } else {
    // Mixed compliant and not assessed
    overallStatus = breakdown.compliant > 0 ? 'Asymmetric' : 'Not Assessed';
  }

  return {
    overallStatus,
    compliantAssets,
    totalAssets,
    breakdown
  };
};

const OperationsListPage: React.FC<Props> = ({ onNavigateToOperation, selectedClientId, onNavigateToClient }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { user } = useAuth();
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showClients, setShowClients] = useState(!selectedClientId); // Show clients if none selected
  const [operations, setOperations] = useState<Operation[]>([]);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load active operations on mount (exclude archived)
  useEffect(() => {
    const loadOperations = async () => {
      try {
        const ops = await getActiveOperations();
        setOperations(Array.isArray(ops) ? ops : []);
      } catch (error) {
        logger.error('Error loading operations:', error);
        setOperations([]);
      }
    };
    loadOperations();
  }, []);

  // Subscribe to data store changes
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(async () => {
      try {
        const ops = await getActiveOperations();
        setOperations(Array.isArray(ops) ? ops : []);
      } catch (error) {
        logger.error('Error loading operations:', error);
      }
    });
    return unsubscribe;
  }, []);

  const handleArchiveOperation = async (operationId: string) => {
    if (!user) {
      alert('Debe estar autenticado para archivar operaciones');
      return;
    }
    
    if (!window.confirm('¿Está seguro de que desea archivar esta operación? Se moverá al historial.')) {
      return;
    }
    
    setArchivingId(operationId);
    try {
      await archiveOperation(operationId, user.name || user.email || 'System');
      // Force refresh operations
      const ops = await getActiveOperations();
      setOperations(Array.isArray(ops) ? ops : []);
    } catch (error: any) {
      logger.error('Error archiving operation:', error);
      alert(`Error al archivar la operación: ${error.message || 'Por favor, intente nuevamente.'}`);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDeleteOperation = async (operationId: string) => {
    if (!user) {
      alert('Debe estar autenticado para eliminar operaciones');
      return;
    }

    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    if (!window.confirm(`¿Está seguro de que desea eliminar la operación "${operation.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(operationId);
    try {
      await deleteOperation(operationId);
      // Force refresh operations
      const ops = await getActiveOperations();
      setOperations(Array.isArray(ops) ? ops : []);
    } catch (error: any) {
      logger.error('Error deleting operation:', error);
      alert(`Error al eliminar la operación: ${error.message || 'Por favor, intente nuevamente.'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter operations by selected client
  const operationsToShow = useMemo(() => {
    // Ensure operations is an array
    const safeOps = Array.isArray(operations) ? operations : [];
    
    if (selectedClientId) {
      return safeOps.filter(op => op.clientId === selectedClientId);
    }
    return safeOps;
  }, [selectedClientId, operations]);

  const filteredOperations = Array.isArray(operationsToShow) 
    ? operationsToShow.filter(op => {
        const matchesText = op.name?.toLowerCase().includes(filterText.toLowerCase()) || 
                            op.sectorNACE?.toLowerCase().includes(filterText.toLowerCase());
        const matchesStatus = statusFilter === 'All' || op.status === statusFilter;
        return matchesText && matchesStatus;
      })
    : [];

  const selectedClient = selectedClientId ? DEMO_CLIENTS.find(c => c.id === selectedClientId) : null;

  // Show clients list if no client selected
  if (!selectedClientId) {
    return (
      <div className={`p-8 space-y-6 max-w-7xl mx-auto transition-colors ${themeClasses.bg.primary}`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>CLIENTES</h1>
          <p className={`font-mono uppercase text-xs tracking-wider transition-colors ${themeClasses.text.tertiary}`}>SELECCIONA_CLIENTE_PARA_VER_OPERACIONES</p>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEMO_CLIENTS.map(client => {
            // Get operations for this client from loaded operations
            const safeOps = Array.isArray(operations) ? operations : [];
            const clientOperations = safeOps.filter(op => op.clientId === client.id);
            const totalAssets = clientOperations.reduce((sum, op) => sum + (op.assets?.length || 0), 0);
            const totalCapex = clientOperations.reduce((sum, op) => sum + (op.capex || 0), 0);
            
            return (
              <button
                key={client.id}
                onClick={() => onNavigateToClient && onNavigateToClient(client.id)}
                className={`p-6 rounded-xl border transition-all text-left group ${themeClasses.card.bg} ${themeClasses.card.border} ${
                  theme === 'dark' ? 'hover:border-[#00ff88]/30' : 'hover:border-[#0066cc]/30'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building2 size={24} className="text-emerald-600" />
                      <h3 className={`text-lg font-bold transition-colors font-mono uppercase tracking-wider ${themeClasses.text.primary} ${
                        theme === 'dark' ? 'group-hover:text-[#00ff88]' : 'group-hover:text-[#0066cc]'
                      }`}>
                        {client.name.replace(/\s/g, '_')}
                      </h3>
                    </div>
                    {client.description && (
                      <p className={`text-xs mb-3 font-mono transition-colors ${themeClasses.text.tertiary}`}>{client.description}</p>
                    )}
                  </div>
                  <ArrowRight size={20} className={`transition-all ${themeClasses.text.tertiary} ${
                    theme === 'dark' ? 'group-hover:text-[#00ff88]' : 'group-hover:text-[#0066cc]'
                  } group-hover:translate-x-1`} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[#666666] font-mono uppercase text-xs tracking-wider">OPERACIONES</span>
                    <p className="font-bold text-white font-mono">{clientOperations.length}</p>
                  </div>
                  <div>
                    <span className="text-[#666666] font-mono uppercase text-xs tracking-wider">ASSETS</span>
                    <p className="font-bold text-white font-mono">{totalAssets}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#666666] font-mono uppercase text-xs tracking-wider">CAPEX_TOTAL</span>
                    <p className="font-bold text-white font-mono">€{(totalCapex / 1000000).toFixed(1)}M</p>
                  </div>
                </div>
                {client.country && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                    <span className={`text-xs font-mono uppercase transition-colors ${themeClasses.text.tertiary}`}>{client.country}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-8 space-y-6 max-w-7xl mx-auto transition-colors ${themeClasses.bg.primary}`}>
      {/* Header with Client Info */}
      <div className="mb-6">
        <button 
          onClick={() => onNavigateToClient && onNavigateToClient('')}
          className={`text-xs mb-4 flex items-center transition-colors font-mono uppercase tracking-wider ${themeClasses.text.tertiary} ${
            theme === 'dark' ? 'hover:text-[#00ff88]' : 'hover:text-[#0066cc]'
          }`}
        >
          <ArrowRight size={14} className="mr-1 rotate-180" />
          VOLVER_CLIENTES
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 flex items-center font-mono uppercase tracking-tight transition-colors ${themeClasses.text.primary}`}>
              <Building2 size={28} className="mr-3 text-[#00ff88]" />
              {selectedClient?.name.replace(/\s/g, '_')}
            </h1>
            <p className={`font-mono uppercase text-xs tracking-wider transition-colors ${themeClasses.text.tertiary}`}>{selectedClient?.description || `${Array.isArray(operationsToShow) ? operationsToShow.length : 0} OPERACIONES`}</p>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.text.tertiary}`} size={20} />
            <input 
              type="text" 
              placeholder="BUSCAR_POR_NOMBRE_SECTOR..." 
              className={`w-full pl-10 pr-4 py-2 ${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg focus:ring-[#00ff88] focus:border-[#00ff88] text-sm ${themeClasses.input.text} ${themeClasses.input.placeholder} font-mono uppercase tracking-wider`}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={20} className={themeClasses.text.tertiary} />
            <select 
              className={`${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg py-2 pl-2 pr-8 text-sm ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono uppercase tracking-wider`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">TODOS_ESTADOS</option>
              <option value="Draft">DRAFT</option>
              <option value="Review">REVIEW</option>
              <option value="Compliant">COMPLIANT</option>
            </select>
          </div>
        </div>
        <button className={`flex items-center px-4 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-colors font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50`}>
          <Plus size={20} className="mr-2" />
          NUEVA_OP
        </button>
      </div>

      {/* Table */}
      <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.default} overflow-hidden`}>
        <table className={`min-w-full divide-y ${themeClasses.border.default}`}>
          <thead className={themeClasses.bg.tertiary}>
            <tr>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>NOMBRE_OP</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>ID</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>SECTOR_NACE</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>PAIS</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>CAPEX_TOTAL</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>ESTADO_DNSH</th>
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className={`${themeClasses.bg.secondary} divide-y ${themeClasses.border.default}`}>
            {Array.isArray(filteredOperations) ? filteredOperations.map((op) => {
              const dnshStatus = calculateOperationDnshStatus(op);
              
              return (
                <tr key={op.id} className={`hover:${themeClasses.bg.hover} transition-colors group`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>{op.name.replace(/\s/g, '_')}</span>
                      <span className={`text-xs ${themeClasses.text.tertiary} font-mono uppercase`}>{op.assets.length} {op.assets.length === 1 ? 'ASSET' : 'ACTIVOS'}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.text.tertiary} font-mono`}>{op.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${themeClasses.bg.tertiary} text-[#00a8ff] px-2 py-1 rounded text-xs font-medium border border-[#00a8ff]/30 font-mono uppercase`}>
                          {op.sectorNACE}
                      </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.text.secondary} font-mono uppercase`}>{op.country}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${themeClasses.text.primary} font-mono`}>
                    €{(op.capex / 1000000).toFixed(1)}M
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      {/* Overall Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center font-mono uppercase tracking-wider ${
                          dnshStatus.overallStatus === 'Compliant' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                          dnshStatus.overallStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          dnshStatus.overallStatus === 'Conditional' ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' :
                          dnshStatus.overallStatus === 'Asymmetric' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-[#1a1a1a] text-[#666666] border border-[#1a1a1a]'
                        }`}>
                          {dnshStatus.overallStatus === 'Asymmetric' ? (
                            <>
                              <AlertTriangle size={12} className="mr-1" />
                              Asimétrico
                            </>
                          ) : (
                            <>
                              <span className={`w-2 h-2 rounded-full mr-2 ${
                                dnshStatus.overallStatus === 'Compliant' ? 'bg-emerald-500' :
                                dnshStatus.overallStatus === 'Non-Compliant' ? 'bg-red-500' :
                                dnshStatus.overallStatus === 'Conditional' ? 'bg-amber-500' :
                                'bg-slate-500'
                              }`}></span>
                              {dnshStatus.overallStatus}
                            </>
                          )}
                        </span>
                      </div>
                      
                      {/* Asset-level breakdown */}
                      {dnshStatus.totalAssets > 0 && (
                        <div className={`flex items-center gap-1.5 text-[10px] ${themeClasses.text.tertiary} font-mono uppercase`}>
                          <span className={`font-semibold ${themeClasses.text.primary}`}>{dnshStatus.compliantAssets}/{dnshStatus.totalAssets}</span>
                          <span className={themeClasses.text.tertiary}>COMPLIANT</span>
                          {dnshStatus.breakdown.nonCompliant > 0 && (
                            <>
                              <span className={themeClasses.text.tertiary}>•</span>
                              <span className="text-red-400 font-semibold">{dnshStatus.breakdown.nonCompliant}</span>
                              <span className="text-red-400">NON_COMPLIANT</span>
                            </>
                          )}
                          {dnshStatus.breakdown.conditional > 0 && (
                            <>
                              <span className={themeClasses.text.tertiary}>•</span>
                              <span className="text-[#ffb800] font-semibold">{dnshStatus.breakdown.conditional}</span>
                              <span className="text-[#ffb800]">CONDITIONAL</span>
                            </>
                          )}
                          {dnshStatus.breakdown.notAssessed > 0 && (
                            <>
                              <span className={themeClasses.text.tertiary}>•</span>
                              <span className={`${themeClasses.text.tertiary} font-semibold`}>{dnshStatus.breakdown.notAssessed}</span>
                              <span className={themeClasses.text.tertiary}>NOT_ASSESSED</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* ISF Asymmetric Indicator */}
                      {dnshStatus.overallStatus === 'Asymmetric' && (
                        <div className="text-[10px] text-purple-400 font-medium flex items-center gap-1 font-mono uppercase">
                          <HelpCircle size={10} />
                          <span>ISF_APLICABLE_ASIMETRICAMENTE</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleArchiveOperation(op.id)}
                        disabled={archivingId === op.id || deletingId === op.id}
                        className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                          archivingId === op.id || deletingId === op.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/50'
                        }`}
                        aria-label={`Archive operation ${op.name}`}
                        title="Archivar operación"
                      >
                        {archivingId === op.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-500 mr-1"></div>
                            ARCHIVANDO...
                          </>
                        ) : (
                          <>
                            <Archive size={14} className="mr-1" />
                            ARCHIVAR
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => handleDeleteOperation(op.id)}
                        disabled={archivingId === op.id || deletingId === op.id}
                        className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                          archivingId === op.id || deletingId === op.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50'
                        }`}
                        aria-label={`Delete operation ${op.name}`}
                        title="Eliminar operación"
                      >
                        {deletingId === op.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500 mr-1"></div>
                            ELIMINANDO...
                          </>
                        ) : (
                          <>
                            <X size={14} className="mr-1" />
                            ELIMINAR
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => onNavigateToOperation(op.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigateToOperation(op.id);
                          }
                        }}
                        className="text-[#00ff88] hover:text-white bg-[#00ff88]/10 hover:bg-[#00ff88]/20 px-3 py-1.5 rounded transition-colors flex items-center border border-[#00ff88]/30 font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50"
                        aria-label={`View details for operation ${op.name}`}
                      >
                        DETALLES <ArrowRight size={16} className="ml-1" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : null}
          </tbody>
        </table>
        {Array.isArray(filteredOperations) && filteredOperations.length === 0 && (
            <div className={`p-8 text-center ${themeClasses.text.tertiary} font-mono uppercase text-xs`}>
                NO_SE_ENCONTRARON_OPERACIONES
            </div>
        )}
      </div>
    </div>
  );
};

export default OperationsListPage;