import React, { useMemo } from 'react';
import { Briefcase, TrendingUp, AlertTriangle, Clock, ArrowRight, ShieldCheck, Droplets, Leaf, RefreshCw, XCircle, Zap, FileText, MapPin, CheckCircle2, AlertCircle, Building2, DollarSign, Percent, BarChart3, TrendingDown, Activity } from 'lucide-react';
import { DEMO_OPERATIONS, DEMO_CLIENTS } from '../constants';
import { Operation, DnshObjective, Client, RiskBand } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { canDisplayDnshStatus, getSafeDnshStatus } from '../services/dnshValidation';

interface DashboardProps {
  onNavigateToOperation: (id: string) => void;
  onNavigateToOperationsList?: () => void;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToMapViewer?: () => void;
  onNavigateToReports?: () => void;
}

const DashboardPage: React.FC<DashboardProps> = ({ 
  onNavigateToOperation, 
  onNavigateToOperationsList,
  onNavigateToMapViewer,
  onNavigateToReports
}) => {
  // Calculate real metrics from operations
  const metrics = useMemo(() => {
    const totalOperations = DEMO_OPERATIONS.length;
    const totalAssets = DEMO_OPERATIONS.reduce((sum, op) => sum + op.assets.length, 0);
    
    // Calculate compliance by objective
    const objectiveCompliance: Record<DnshObjective, { compliant: number; total: number; percentage: number }> = {
      [DnshObjective.MITIGATION]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.ADAPTATION]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.WATER]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.CIRCULAR]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.POLLUTION]: { compliant: 0, total: 0, percentage: 0 },
      [DnshObjective.BIODIVERSITY]: { compliant: 0, total: 0, percentage: 0 },
    };

    // Calculate overall compliance
    let compliantAssets = 0;
    let nonCompliantAssets = 0;
    let conditionalAssets = 0;
    let notAssessedAssets = 0;
    let totalAAL = 0;
    let operationsWithPendingReviews = 0;

    DEMO_OPERATIONS.forEach(operation => {
      operation.assets.forEach(asset => {
        const evaluation = asset.dnshEvaluation;
        
        if (!evaluation) {
          notAssessedAssets++;
          return;
        }

        // Overall status - use safe status that validates assessment
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

        // Per-objective compliance using centralized function with validation
        Object.values(DnshObjective).forEach(objective => {
          // Use safe status that validates assessment exists
          const status = getSafeDnshStatus(asset, objective);
          if (status === 'Compliant') {
            objectiveCompliance[objective].compliant++;
          }
          if (status !== 'Not Assessed') {
            objectiveCompliance[objective].total++;
          }
        });

        // AAL (if available)
        if (evaluation.adaptationAAL) {
          totalAAL += evaluation.adaptationAAL;
        }
      });

      // Check for pending reviews (operations with conditional or non-compliant assets)
      const hasPendingReview = operation.assets.some(asset => {
        const evaluation = asset.dnshEvaluation;
        return evaluation && (evaluation.overallStatus === 'Conditional' || evaluation.overallStatus === 'Non-Compliant');
      });
      if (hasPendingReview) operationsWithPendingReviews++;
    });

    // Calculate percentages
    Object.keys(objectiveCompliance).forEach(key => {
      const obj = objectiveCompliance[key as DnshObjective];
      obj.percentage = obj.total > 0 ? Math.round((obj.compliant / obj.total) * 100) : 0;
    });

    const totalAssessedAssets = compliantAssets + nonCompliantAssets + conditionalAssets;
    const overallComplianceRate = totalAssessedAssets > 0 
      ? Math.round((compliantAssets / totalAssessedAssets) * 100) 
      : 0;

    // Financial metrics
    const totalDealValue = DEMO_OPERATIONS.reduce((sum, op) => sum + (op.dealPrice || op.capex), 0);
    const totalCapex = DEMO_OPERATIONS.reduce((sum, op) => sum + op.capex, 0);
    const weightedAvgReturn = DEMO_OPERATIONS.reduce((sum, op) => {
      const weight = (op.dealPrice || op.capex) / totalDealValue;
      return sum + (op.expectedReturn || 0) * weight;
    }, 0);
    const totalRiskWeightedCapital = DEMO_OPERATIONS.reduce((sum, op) => sum + (op.riskWeightedCapital || op.capex), 0);
    
    // Calculate RORCE (Return on Risk-Weighted Capital)
    const totalExpectedReturn = DEMO_OPERATIONS.reduce((sum, op) => {
      const capital = op.riskWeightedCapital || op.capex;
      const returnRate = op.expectedReturn || 0;
      return sum + (capital * returnRate / 100);
    }, 0);
    const avgRORCE = totalRiskWeightedCapital > 0 ? (totalExpectedReturn / totalRiskWeightedCapital) * 100 : 0;
    
    // Risk-adjusted metrics
    const totalRiskAdjustment = DEMO_OPERATIONS.reduce((sum, op) => sum + (op.riskAdjustment || 0), 0);
    const avgRiskAdjustment = totalOperations > 0 ? totalRiskAdjustment / totalOperations : 0;
    
    // Sustainability impact
    const totalSustainabilityDiscount = DEMO_OPERATIONS.reduce((sum, op) => sum + (op.sustainabilityDiscount || 0), 0);
    const avgSustainabilityDiscount = totalOperations > 0 ? totalSustainabilityDiscount / totalOperations : 0;
    
    // Risk distribution
    const riskDistribution: Record<RiskBand, number> = {
      'Low': 0,
      'Moderate': 0,
      'High': 0,
      'Very High': 0,
    };
    DEMO_OPERATIONS.forEach(op => {
      if (op.maxRiskBand) {
        riskDistribution[op.maxRiskBand]++;
      }
    });

    return {
      totalOperations,
      totalAssets,
      compliantAssets,
      nonCompliantAssets,
      conditionalAssets,
      notAssessedAssets,
      overallComplianceRate,
      totalAAL: totalAAL / 1000000, // Convert to M€
      operationsWithPendingReviews,
      objectiveCompliance,
      // Financial metrics
      totalDealValue: totalDealValue / 1000000, // M€
      totalCapex: totalCapex / 1000000, // M€
      weightedAvgReturn,
      totalRiskWeightedCapital: totalRiskWeightedCapital / 1000000, // M€
      avgRORCE,
      avgRiskAdjustment,
      avgSustainabilityDiscount,
      riskDistribution,
    };
  }, []);

  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Mitigación',
    [DnshObjective.ADAPTATION]: 'Adaptación',
    [DnshObjective.WATER]: 'Agua',
    [DnshObjective.CIRCULAR]: 'Economía Circular',
    [DnshObjective.POLLUTION]: 'Contaminación',
    [DnshObjective.BIODIVERSITY]: 'Biodiversidad',
  };

  const objectiveColors: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'bg-emerald-500',
    [DnshObjective.ADAPTATION]: 'bg-amber-500',
    [DnshObjective.WATER]: 'bg-blue-500',
    [DnshObjective.CIRCULAR]: 'bg-purple-500',
    [DnshObjective.POLLUTION]: 'bg-red-500',
    [DnshObjective.BIODIVERSITY]: 'bg-green-500',
  };

  const objectiveIcons: Record<DnshObjective, React.ReactNode> = {
    [DnshObjective.MITIGATION]: <Zap size={16} className="text-[#00ff88]" />,
    [DnshObjective.ADAPTATION]: <AlertTriangle size={16} className="text-[#ffb800]" />,
    [DnshObjective.WATER]: <Droplets size={16} className="text-[#00a8ff]" />,
    [DnshObjective.CIRCULAR]: <RefreshCw size={16} className="text-[#00ff88]" />,
    [DnshObjective.POLLUTION]: <XCircle size={16} className="text-red-500" />,
    [DnshObjective.BIODIVERSITY]: <Leaf size={16} className="text-[#00ff88]" />,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-fadeIn bg-black min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-mono uppercase">PANEL_DE_CONTROL_DNSH</h1>
          <p className="text-[#666666] mt-2 text-xs font-mono uppercase tracking-widest">RESUMEN_DE_OPERACIONES_Y_ESTADO_DE_CUMPLIMIENTO_DNSH</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="TOTAL_OPERACIONES" 
          value={metrics.totalOperations} 
          subtext={`${metrics.totalAssets} ACTIVOS_EN_CARTERA`}
          icon={<Briefcase className="text-[#00ff88]" size={24} />} 
          iconBg="bg-[#00ff88]/10"
        />
        <KpiCard 
          title="TASA_CUMPLIMIENTO" 
          value={`${metrics.overallComplianceRate}%`} 
          subtext={`${metrics.compliantAssets}/${metrics.compliantAssets + metrics.nonCompliantAssets + metrics.conditionalAssets} ASSETS_COMPLIANT`}
          icon={<TrendingUp className="text-[#00ff88]" size={24} />} 
          iconBg="bg-[#00ff88]/10"
        />
        <KpiCard 
          title="AAL_TOTAL" 
          value={`${metrics.totalAAL.toFixed(2)} M€`} 
          subtext="PERDIDA_ANUAL_ESPERADA"
          icon={<AlertTriangle className="text-[#ffb800]" size={24} />} 
          iconBg="bg-[#ffb800]/10"
        />
        <KpiCard 
          title="REVISIONES_PENDIENTES" 
          value={metrics.operationsWithPendingReviews} 
          subtext={`${metrics.conditionalAssets + metrics.nonCompliantAssets} ASSETS_REQUIEREN_ATENCION`}
          icon={<Clock className="text-[#666666]" size={24} />} 
          iconBg="bg-[#111111]"
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatusCard
          title="Estado de Assets"
          items={[
            { label: 'Compliant', value: metrics.compliantAssets, color: 'bg-emerald-500', icon: <CheckCircle2 size={16} /> },
            { label: 'Conditional', value: metrics.conditionalAssets, color: 'bg-amber-500', icon: <AlertCircle size={16} /> },
            { label: 'Non-Compliant', value: metrics.nonCompliantAssets, color: 'bg-red-500', icon: <XCircle size={16} /> },
            { label: 'Not Assessed', value: metrics.notAssessedAssets, color: 'bg-slate-400', icon: <Clock size={16} /> },
          ]}
        />
        <div className="bg-[#0a0a0a] p-6 rounded-xl shadow-sm border border-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white mb-4 font-mono uppercase tracking-wider">CUMPLIMIENTO_POR_OBJETIVO_DNSH</h3>
          <div className="space-y-3">
            {(Object.keys(DnshObjective) as Array<keyof typeof DnshObjective>).map(key => {
              const objective = DnshObjective[key];
              const compliance = metrics.objectiveCompliance[objective];
              return (
                <div key={objective} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    {objectiveIcons[objective]}
                    <span className="text-xs font-medium text-white uppercase tracking-wider font-mono">{objectiveLabels[objective].replace(/\s/g, '_')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-[#1a1a1a] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${objectiveColors[objective]}`}
                        style={{ width: `${compliance.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right font-mono">
                      {compliance.percentage}%
                    </span>
           </div>
           </div>
              );
            })}
           </div>
        </div>
        <div className="bg-[#0a0a0a] p-6 rounded-xl shadow-sm border border-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white mb-4 font-mono uppercase tracking-wider">ACCIONES_RAPIDAS</h3>
          <div className="space-y-2">
            <QuickActionButton
              icon={<ShieldCheck size={18} />}
              label="Evaluación DNSH Completa"
              onClick={() => onNavigateToOperation(DEMO_OPERATIONS[0]?.id || '')}
              color="emerald"
            />
            <QuickActionButton
              icon={<MapPin size={18} />}
              label="Visor Global de Mapas"
              onClick={onNavigateToMapViewer || (() => {})}
              color="blue"
            />
            <QuickActionButton
              icon={<FileText size={18} />}
              label="Generar Reportes"
              onClick={onNavigateToReports || (() => {})}
              color="purple"
            />
            <QuickActionButton
              icon={<Briefcase size={18} />}
              label="Ver Todas las Operaciones"
              onClick={onNavigateToOperationsList || (() => onNavigateToOperation(DEMO_OPERATIONS[0]?.id || ''))}
              color="slate"
            />
           </div>
        </div>
      </div>

      {/* Operations Table (Preserved as requested) */}
      <div className="bg-[#0a0a0a] rounded-xl shadow-sm border border-[#1a1a1a] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1a1a1a] flex justify-between items-center bg-[#111111]">
          <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">OPERACIONES_RECIENTES</h3>
          {onNavigateToOperationsList ? (
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigateToOperationsList();
              }}
              className="text-[#00ff88] text-xs font-semibold hover:text-[#00ff88]/80 flex items-center transition-all group font-mono uppercase tracking-wider cursor-pointer active:scale-[0.95]"
            >
              VER_TODAS_LAS_OPERACIONES <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigateToOperation(DEMO_OPERATIONS[0]?.id || '');
              }}
              className="text-[#00ff88] text-xs font-semibold hover:text-[#00ff88]/80 flex items-center transition-all group font-mono uppercase tracking-wider cursor-pointer active:scale-[0.95]"
            >
              VER_TODAS_LAS_OPERACIONES <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
          )}
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-[#111111]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Operación</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sector</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">País</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Inversión</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assets</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado DNSH</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-[#0a0a0a] divide-y divide-[#1a1a1a]">
            {DEMO_OPERATIONS.map((op) => {
              const client = DEMO_CLIENTS.find(c => c.id === op.clientId);
              // Calculate operation DNSH status using safe status (validates assessment)
              const assetStatuses = op.assets.map(a => {
                const evaluation = a.dnshEvaluation;
                return evaluation?.overallStatus || 'Not Assessed';
              });
              const compliantCount = assetStatuses.filter(s => s === 'Compliant').length;
              const nonCompliantCount = assetStatuses.filter(s => s === 'Non-Compliant').length;
              const conditionalCount = assetStatuses.filter(s => s === 'Conditional').length;
              const notAssessedCount = assetStatuses.filter(s => s === 'Not Assessed').length;
              
              let operationStatus: string = 'NOT_ASSESSED';
              let statusColor: string = 'bg-[#111111] text-[#666666] border border-[#1a1a1a]';
              
              if (compliantCount === op.assets.length && op.assets.length > 0) {
                operationStatus = 'COMPLIANT';
                statusColor = 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30';
              } else if (nonCompliantCount > 0) {
                operationStatus = 'NON_COMPLIANT';
                statusColor = 'bg-red-500/10 text-red-500 border border-red-500/30';
              } else if (conditionalCount > 0) {
                operationStatus = 'CONDITIONAL';
                statusColor = 'bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/30';
              } else if (compliantCount > 0 && (nonCompliantCount > 0 || conditionalCount > 0)) {
                operationStatus = 'ASYMMETRIC';
                statusColor = 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
              }

              return (
              <tr 
                key={op.id} 
                className="hover:bg-[#111111] transition-all cursor-pointer group active:scale-[0.99]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigateToOperation(op.id);
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {client && (
                    <div className="flex items-center space-x-2">
                      <Building2 size={16} className="text-blue-500" />
                      <span className="text-sm font-medium text-slate-700">{client.name}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-white group-hover:text-[#00ff88] font-mono uppercase tracking-wider">{op.name.replace(/\s/g, '_')}</div>
                  <div className="text-xs text-[#666666] mt-0.5 font-mono uppercase">{op.assets.length}_ACTIVOS_ASOCIADOS</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#a0a0a0] font-mono">{op.sectorNACE}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#a0a0a0] font-mono">{op.country}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium font-mono">€{(op.capex / 1000000).toFixed(1)}M</td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white font-medium font-mono">{op.assets.length}</div>
                    <div className="text-xs text-[#666666]">
                      {compliantCount > 0 && <span className="text-[#00ff88]">{compliantCount}✓</span>}
                      {conditionalCount > 0 && <span className="text-[#ffb800] ml-1">{conditionalCount}⚠</span>}
                      {nonCompliantCount > 0 && <span className="text-red-500 ml-1">{nonCompliantCount}✗</span>}
                      {notAssessedCount > 0 && <span className="text-[#666666] ml-1">{notAssessedCount}○</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${statusColor}`}>
                      {operationStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <span className="text-[#666666] group-hover:text-[#00ff88] transition-colors font-mono uppercase tracking-wider">EVALUAR →</span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper Components
const KpiCard = ({ title, value, subtext, icon, iconBg }: any) => (
  <div className="bg-[#0a0a0a] p-6 rounded-xl shadow-sm border border-[#1a1a1a] flex flex-col justify-between h-40 relative overflow-hidden group hover:border-[#00ff88]/30 hover:scale-[1.02] transition-all cursor-pointer">
     <div className="flex justify-between items-start z-10">
        <div>
           <p className="text-[10px] font-semibold text-[#666666] uppercase tracking-widest font-mono">{title}</p>
           <h3 className="text-4xl font-bold text-white mt-2 font-mono tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${iconBg} transition-transform group-hover:scale-110`}>
           {icon}
        </div>
     </div>
     <div className="mt-auto z-10">
      <p className="text-[10px] text-[#666666] font-mono uppercase tracking-wider">{subtext}</p>
     </div>
  </div>
);

const StatusCard = ({ title, items }: any) => (
  <div className="bg-[#0a0a0a] p-6 rounded-xl shadow-sm border border-[#1a1a1a]">
    <h3 className="text-lg font-bold text-white mb-4 font-mono uppercase tracking-wider">{title.replace(/\s/g, '_')}</h3>
    <div className="space-y-3">
      {items.map((item: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded ${item.color} bg-opacity-20`}>
              <div className={item.color.replace('bg-', 'text-')}>
                {item.icon}
        </div>
     </div>
            <span className="text-xs font-medium text-white font-mono uppercase tracking-wider">{item.label.replace(/\s/g, '_')}</span>
  </div>
          <span className="text-sm font-bold text-white font-mono">{item.value}</span>
        </div>
      ))}
     </div>
  </div>
);

const QuickActionButton = ({ icon, label, onClick, color }: any) => {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 border-[#00ff88]/30 hover:border-[#00ff88]/50',
    blue: 'bg-[#00a8ff]/10 text-[#00a8ff] hover:bg-[#00a8ff]/20 border-[#00a8ff]/30 hover:border-[#00a8ff]/50',
    purple: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/30 hover:border-purple-500/50',
    slate: 'bg-[#111111] text-[#666666] hover:bg-[#0a0a0a] border-[#1a1a1a] hover:text-white',
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`w-full p-3 rounded-lg border text-left flex items-center space-x-3 transition-all cursor-pointer active:scale-[0.95] ${colorClasses[color] || colorClasses.slate}`}
    >
      {icon}
      <span className="text-sm font-medium font-mono uppercase tracking-wider">{label}</span>
    </button>
  );
};

export default DashboardPage;
