import React, { useState, useMemo } from 'react';
import { Search, Filter, Archive, ArrowRight, CheckCircle, XCircle, AlertTriangle, HelpCircle, Building2, RotateCcw, Calendar } from 'lucide-react';
import { Operation, Client } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { getArchivedOperations, unarchiveOperation, getAllClients } from '../services/dataManagement';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../services/dataManagement';
import { logger } from '../utils/logger';

interface Props {
  onNavigateToOperation?: (id: string) => void;
}

/**
 * Calculate DNSH status at operation level based on asset-level evaluations
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
  
  let overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' | 'Asymmetric';
  
  if (breakdown.notAssessed === totalAssets) {
    overallStatus = 'Not Assessed';
  } else if (breakdown.compliant === totalAssets) {
    overallStatus = 'Compliant';
  } else if (breakdown.nonCompliant > 0) {
    overallStatus = 'Asymmetric';
  } else if (breakdown.conditional > 0) {
    overallStatus = 'Conditional';
  } else {
    overallStatus = breakdown.compliant > 0 ? 'Asymmetric' : 'Not Assessed';
  }

  return {
    overallStatus,
    compliantAssets,
    totalAssets,
    breakdown
  };
};

const HistoricalOperationsPage: React.FC<Props> = ({ onNavigateToOperation }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { user } = useAuth();
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dnshStatusFilter, setDnshStatusFilter] = useState('All');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  // Load archived operations and clients on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [ops, clts] = await Promise.all([
          getArchivedOperations(),
          getAllClients()
        ]);
        setOperations(Array.isArray(ops) ? ops : []);
        setClients(Array.isArray(clts) ? clts : []);
      } catch (error) {
        logger.error('Error loading historical operations:', error);
        setOperations([]);
        setClients([]);
      }
    };
    loadData();
  }, []);

  // Subscribe to data store changes
  React.useEffect(() => {
    const unsubscribe = dataStore.subscribe(async () => {
      try {
        const ops = await getArchivedOperations();
        setOperations(Array.isArray(ops) ? ops : []);
      } catch (error) {
        logger.error('Error loading historical operations:', error);
      }
    });
    return unsubscribe;
  }, []);

  const handleUnarchiveOperation = async (operationId: string) => {
    if (!user) return;
    
    if (!window.confirm('¿Está seguro de que desea restaurar esta operación? Volverá a aparecer en operaciones activas.')) {
      return;
    }
    
    setUnarchivingId(operationId);
    try {
      await unarchiveOperation(operationId);
      // Operations will be updated via subscription
    } catch (error) {
      logger.error('Error unarchiving operation:', error);
      alert('Error al restaurar la operación. Por favor, intente nuevamente.');
    } finally {
      setUnarchivingId(null);
    }
  };

  const filteredOperations = useMemo(() => {
    return Array.isArray(operations) 
      ? operations.filter(op => {
          const matchesText = op.name?.toLowerCase().includes(filterText.toLowerCase()) || 
                            op.sectorNACE?.toLowerCase().includes(filterText.toLowerCase());
          const matchesStatus = statusFilter === 'All' || op.status === statusFilter;
          
          const dnshStatus = calculateOperationDnshStatus(op);
          const matchesDnshStatus = dnshStatusFilter === 'All' || dnshStatus.overallStatus === dnshStatusFilter;
          
          return matchesText && matchesStatus && matchesDnshStatus;
        })
      : [];
  }, [operations, filterText, statusFilter, dnshStatusFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`p-8 space-y-6 max-w-7xl mx-auto transition-colors ${themeClasses.bg.primary}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary} flex items-center`}>
          <Archive size={32} className="mr-3 text-amber-500" />
          OPERACIONES_HISTÓRICAS
        </h1>
        <p className={`font-mono uppercase text-xs tracking-wider transition-colors ${themeClasses.text.tertiary}`}>
          ARCHIVO_DE_OPERACIONES_COMPLETADAS_O_ARCHIVADAS
        </p>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6`}>
        <div className={`p-4 rounded-xl border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
          <div className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.tertiary} mb-1`}>TOTAL_ARCHIVADAS</div>
          <div className={`text-2xl font-bold font-mono ${themeClasses.text.primary}`}>{operations.length}</div>
        </div>
        <div className={`p-4 rounded-xl border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
          <div className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.tertiary} mb-1`}>COMPLIANT</div>
          <div className={`text-2xl font-bold font-mono text-[#00ff88]`}>
            {operations.filter(op => calculateOperationDnshStatus(op).overallStatus === 'Compliant').length}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
          <div className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.tertiary} mb-1`}>NON_COMPLIANT</div>
          <div className={`text-2xl font-bold font-mono text-red-500`}>
            {operations.filter(op => calculateOperationDnshStatus(op).overallStatus === 'Non-Compliant').length}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
          <div className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.tertiary} mb-1`}>CAPEX_TOTAL</div>
          <div className={`text-2xl font-bold font-mono ${themeClasses.text.primary}`}>
            €{(operations.reduce((sum, op) => sum + (op.capex || 0), 0) / 1000000).toFixed(0)}M
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
              <option value="Non-Compliant">NON_COMPLIANT</option>
            </select>
            <select 
              className={`${themeClasses.input.bg} ${themeClasses.input.border} rounded-lg py-2 pl-2 pr-8 text-sm ${themeClasses.input.text} focus:ring-[#00ff88] focus:border-[#00ff88] font-mono uppercase tracking-wider`}
              value={dnshStatusFilter}
              onChange={(e) => setDnshStatusFilter(e.target.value)}
            >
              <option value="All">TODOS_DNSH</option>
              <option value="Compliant">COMPLIANT</option>
              <option value="Non-Compliant">NON_COMPLIANT</option>
              <option value="Conditional">CONDITIONAL</option>
              <option value="Asymmetric">ASYMMETRIC</option>
              <option value="Not Assessed">NOT_ASSESSED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.default} overflow-hidden`}>
        <table className={`min-w-full divide-y ${themeClasses.border.default}`}>
          <thead className={themeClasses.bg.tertiary}>
            <tr>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>NOMBRE_OP</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>CLIENTE</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>SECTOR_NACE</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>PAIS</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>CAPEX</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>ESTADO_DNSH</th>
              <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.text.tertiary} uppercase tracking-wider font-mono`}>ARCHIVADO</th>
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className={`${themeClasses.bg.secondary} divide-y ${themeClasses.border.default}`}>
            {Array.isArray(filteredOperations) ? filteredOperations.map((op) => {
              const dnshStatus = calculateOperationDnshStatus(op);
              const client = clients.find(c => c.id === op.clientId);
              
              return (
                <tr key={op.id} className={`hover:${themeClasses.bg.hover} transition-colors group`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${themeClasses.text.primary} font-mono uppercase tracking-wider`}>{op.name.replace(/\s/g, '_')}</span>
                      <span className={`text-xs ${themeClasses.text.tertiary} font-mono uppercase`}>{op.assets.length} {op.assets.length === 1 ? 'ASSET' : 'ACTIVOS'}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.text.secondary} font-mono`}>
                    {client?.name || 'N/A'}
                  </td>
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
                      <div className={`flex items-center gap-1.5 text-[10px] ${themeClasses.text.tertiary} font-mono uppercase`}>
                        <span className={`font-semibold ${themeClasses.text.primary}`}>{dnshStatus.compliantAssets}/{dnshStatus.totalAssets}</span>
                        <span className={themeClasses.text.tertiary}>COMPLIANT</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className={`text-xs font-mono ${themeClasses.text.secondary} flex items-center`}>
                        <Calendar size={12} className="mr-1" />
                        {formatDate(op.archivedAt)}
                      </div>
                      {op.archivedBy && (
                        <div className={`text-[10px] font-mono ${themeClasses.text.tertiary} mt-1`}>
                          Por: {op.archivedBy}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleUnarchiveOperation(op.id)}
                        disabled={unarchivingId === op.id}
                        className={`px-3 py-1.5 rounded transition-colors flex items-center border font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 ${
                          unarchivingId === op.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-[#00ff88] hover:text-white bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border-[#00ff88]/30 hover:border-[#00ff88]/50'
                        }`}
                        aria-label={`Restore operation ${op.name}`}
                        title="Restaurar operación"
                      >
                        <RotateCcw size={14} className="mr-1" />
                        RESTAURAR
                      </button>
                      {onNavigateToOperation && (
                        <button 
                          onClick={() => onNavigateToOperation(op.id)}
                          className="text-[#00ff88] hover:text-white bg-[#00ff88]/10 hover:bg-[#00ff88]/20 px-3 py-1.5 rounded transition-colors flex items-center border border-[#00ff88]/30 font-mono uppercase tracking-wider text-xs focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50"
                          aria-label={`View details for operation ${op.name}`}
                        >
                          DETALLES <ArrowRight size={16} className="ml-1" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : null}
          </tbody>
        </table>
        {Array.isArray(filteredOperations) && filteredOperations.length === 0 && (
            <div className={`p-8 text-center ${themeClasses.text.tertiary} font-mono uppercase text-xs`}>
                NO_HAY_OPERACIONES_ARCHIVADAS
            </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalOperationsPage;
