import React, { useMemo } from 'react';
import { ArrowLeft, Building2, Briefcase, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock, ArrowRight, DollarSign, Percent, BarChart3, TrendingDown, Activity } from 'lucide-react';
import { Client, Operation, DnshObjective, RiskBand } from '../types';
import { calculateObjectiveStats, getOperationDnshSummary } from '../utils/dnshCalculations';

interface Props {
  client: Client;
  operations: Operation[];
  onNavigateToOperation: (id: string) => void;
  onNavigateToDnshEvaluation: (clientId: string) => void;
  onBack: () => void;
}

const ClientDetailPage: React.FC<Props> = ({ 
  client, 
  operations,
  onNavigateToOperation,
  onNavigateToDnshEvaluation,
  onBack 
}) => {
  // Calculate aggregated DNSH metrics, financial metrics, and risk metrics for the client
  const clientMetrics = useMemo(() => {
    let totalAssets = 0;
    let compliantAssets = 0;
    let nonCompliantAssets = 0;
    let conditionalAssets = 0;
    let notAssessedAssets = 0;
    
    // Financial metrics
    let totalCapex = 0;
    let totalDealValue = 0;
    let totalRiskWeightedCapital = 0;
    let totalExpectedReturn = 0;
    let totalRiskAdjustment = 0;
    let totalSustainabilityDiscount = 0;
    
    // Risk metrics
    let operationsWithHighRisk = 0;
    const riskDistribution: Record<RiskBand, number> = {
      'Low': 0,
      'Moderate': 0,
      'High': 0,
      'Very High': 0,
    };

    const objectiveCompliance: Record<DnshObjective, { compliant: number; total: number }> = {
      [DnshObjective.MITIGATION]: { compliant: 0, total: 0 },
      [DnshObjective.ADAPTATION]: { compliant: 0, total: 0 },
      [DnshObjective.WATER]: { compliant: 0, total: 0 },
      [DnshObjective.CIRCULAR]: { compliant: 0, total: 0 },
      [DnshObjective.POLLUTION]: { compliant: 0, total: 0 },
      [DnshObjective.BIODIVERSITY]: { compliant: 0, total: 0 },
    };

    operations.forEach(operation => {
      // Financial metrics aggregation
      totalCapex += operation.capex;
      totalDealValue += operation.dealPrice || operation.capex;
      totalRiskWeightedCapital += operation.riskWeightedCapital || operation.capex;
      
      // Calculate expected return contribution (weighted by capital)
      const capital = operation.riskWeightedCapital || operation.capex;
      const returnRate = operation.expectedReturn || 0;
      totalExpectedReturn += capital * returnRate / 100;
      
      // Risk adjustments
      if (operation.riskAdjustment) totalRiskAdjustment += operation.riskAdjustment;
      if (operation.sustainabilityDiscount) totalSustainabilityDiscount += operation.sustainabilityDiscount;
      
      // Risk distribution
      if (operation.maxRiskBand) {
        riskDistribution[operation.maxRiskBand]++;
        if (operation.maxRiskBand === 'High' || operation.maxRiskBand === 'Very High') {
          operationsWithHighRisk++;
        }
      }

      operation.assets.forEach(asset => {
        totalAssets++;
        const evaluation = asset.dnshEvaluation;
        
        if (!evaluation) {
          notAssessedAssets++;
          return;
        }

        switch (evaluation.overallStatus) {
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

        // Per-objective compliance
        Object.values(DnshObjective).forEach(objective => {
          const stats = calculateObjectiveStats(operation, objective);
          if (stats.compliant > 0) objectiveCompliance[objective].compliant += stats.compliant;
          if (stats.totalAssessed > 0) objectiveCompliance[objective].total += stats.totalAssessed;
        });
      });
    });

    const totalAssessed = compliantAssets + nonCompliantAssets + conditionalAssets;
    const overallComplianceRate = totalAssessed > 0 
      ? Math.round((compliantAssets / totalAssessed) * 100) 
      : 0;

    // Calculate weighted average return
    const weightedAvgReturn = totalDealValue > 0
      ? operations.reduce((sum, op) => {
          const weight = (op.dealPrice || op.capex) / totalDealValue;
          return sum + (op.expectedReturn || 0) * weight;
        }, 0)
      : 0;

    // Calculate RORCE (Return on Risk-Weighted Capital)
    const avgRORCE = totalRiskWeightedCapital > 0 
      ? (totalExpectedReturn / totalRiskWeightedCapital) * 100 
      : 0;

    // Average risk adjustments
    const avgRiskAdjustment = operations.length > 0 
      ? totalRiskAdjustment / operations.length 
      : 0;
    
    const avgSustainabilityDiscount = operations.length > 0 
      ? totalSustainabilityDiscount / operations.length 
      : 0;

    return {
      totalAssets,
      compliantAssets,
      nonCompliantAssets,
      conditionalAssets,
      notAssessedAssets,
      overallComplianceRate,
      // Financial metrics
      totalCapex,
      totalDealValue,
      weightedAvgReturn,
      totalRiskWeightedCapital,
      avgRORCE,
      // Risk metrics
      operationsWithHighRisk,
      riskDistribution,
      avgRiskAdjustment,
      avgSustainabilityDiscount,
      objectiveCompliance,
    };
  }, [operations]);

  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Mitigación',
    [DnshObjective.ADAPTATION]: 'Adaptación',
    [DnshObjective.WATER]: 'Agua',
    [DnshObjective.CIRCULAR]: 'Economía Circular',
    [DnshObjective.POLLUTION]: 'Contaminación',
    [DnshObjective.BIODIVERSITY]: 'Biodiversidad',
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto bg-black">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#111111] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-[#666666]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <Building2 size={32} className="text-[#00ff88]" />
            <h1 className="text-3xl font-bold text-white font-mono uppercase tracking-tight">{client.name.replace(/\s/g, '_')}</h1>
          </div>
          {client.description && (
            <p className="text-[#666666] font-mono uppercase text-xs tracking-wider">{client.description}</p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Inversión Total"
          value={`€${(clientMetrics.totalDealValue / 1000000).toFixed(1)}M`}
          subtext={`${operations.length} portfolios`}
          icon={<DollarSign className="text-blue-600" size={24} />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="Retorno Esperado"
          value={`${clientMetrics.weightedAvgReturn.toFixed(1)}%`}
          subtext={`RORCE: ${clientMetrics.avgRORCE.toFixed(1)}%`}
          icon={<TrendingUp className="text-emerald-600" size={24} />}
          iconBg="bg-emerald-100"
        />
        <KPICard
          title="Riesgo Alto/Muy Alto"
          value={clientMetrics.operationsWithHighRisk}
          subtext={`de ${operations.length} operaciones`}
          icon={<AlertTriangle className="text-amber-600" size={24} />}
          iconBg="bg-amber-100"
        />
        <KPICard
          title="Capital Ponderado"
          value={`€${(clientMetrics.totalRiskWeightedCapital / 1000000).toFixed(1)}M`}
          subtext={`Ajuste riesgo: ${clientMetrics.avgRiskAdjustment.toFixed(1)}%`}
          icon={<BarChart3 className="text-purple-600" size={24} />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Financial & Risk Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Metrics */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] p-6">
          <h2 className="text-xl font-bold text-white flex items-center mb-6 font-mono uppercase tracking-wider">
            <DollarSign size={24} className="mr-2 text-[#00a8ff]" />
            METRICAS_FINANCIERAS
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">CAPEX_TOTAL</span>
              <span className="text-lg font-bold text-white font-mono">€{(clientMetrics.totalCapex / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">DEAL_VALUE_TOTAL</span>
              <span className="text-lg font-bold text-white font-mono">€{(clientMetrics.totalDealValue / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">RETORNO_ESPERADO</span>
              <span className="text-lg font-bold text-[#00ff88] font-mono">{clientMetrics.weightedAvgReturn.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">RORCE</span>
              <span className="text-lg font-bold text-[#00ff88] font-mono">{clientMetrics.avgRORCE.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">CAPITAL_PONDERADO</span>
              <span className="text-lg font-bold text-white font-mono">€{(clientMetrics.totalRiskWeightedCapital / 1000000).toFixed(1)}M</span>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] p-6">
          <h2 className="text-xl font-bold text-white flex items-center mb-6 font-mono uppercase tracking-wider">
            <Activity size={24} className="mr-2 text-[#ffb800]" />
            DISTRIBUCION_RIESGOS
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#00ff88]"></div>
                <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">BAJO</span>
              </div>
              <span className="text-lg font-bold text-white font-mono">{clientMetrics.riskDistribution.Low}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#00a8ff]"></div>
                <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">MODERADO</span>
              </div>
              <span className="text-lg font-bold text-white font-mono">{clientMetrics.riskDistribution.Moderate}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#ffb800]"></div>
                <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">ALTO</span>
              </div>
              <span className="text-lg font-bold text-white font-mono">{clientMetrics.riskDistribution.High}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-[#666666] font-mono uppercase tracking-wider">MUY_ALTO</span>
              </div>
              <span className="text-lg font-bold text-white font-mono">{clientMetrics.riskDistribution['Very High']}</span>
            </div>
            <div className="flex justify-between items-center py-2 pt-4 border-t border-[#1a1a1a]">
              <span className="text-sm font-semibold text-[#a0a0a0] font-mono uppercase tracking-wider">AJUSTE_RIESGO_PROM</span>
              <span className={`text-lg font-bold font-mono ${clientMetrics.avgRiskAdjustment < 0 ? 'text-red-400' : 'text-white'}`}>
                {clientMetrics.avgRiskAdjustment >= 0 ? '+' : ''}{clientMetrics.avgRiskAdjustment.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-semibold text-[#a0a0a0] font-mono uppercase tracking-wider">DESCUENTO_SOST</span>
              <span className="text-lg font-bold text-[#00ff88] font-mono">{clientMetrics.avgSustainabilityDiscount.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* DNSH Summary */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center font-mono uppercase tracking-wider">
            <ShieldCheck size={24} className="mr-2 text-[#00ff88]" />
            RESUMEN_DNSH_COMPANIA
          </h2>
          <button
            onClick={() => onNavigateToDnshEvaluation(client.id)}
            className="px-4 py-2 bg-[#00ff88] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#00ff88]/80 transition-colors flex items-center font-mono uppercase tracking-wider text-xs"
          >
            EVAL_COMPLETA_DNSH
            <ArrowRight size={16} className="ml-2" />
          </button>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatusBadge
            label="Compliant"
            value={clientMetrics.compliantAssets}
            color="emerald"
            icon={<CheckCircle2 size={16} />}
          />
          <StatusBadge
            label="Conditional"
            value={clientMetrics.conditionalAssets}
            color="amber"
            icon={<AlertTriangle size={16} />}
          />
          <StatusBadge
            label="Non-Compliant"
            value={clientMetrics.nonCompliantAssets}
            color="red"
            icon={<XCircle size={16} />}
          />
          <StatusBadge
            label="Not Assessed"
            value={clientMetrics.notAssessedAssets}
            color="slate"
            icon={<Clock size={16} />}
          />
        </div>

        {/* Objective Compliance */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 font-mono uppercase tracking-wider">CUMPLIMIENTO_POR_OBJETIVO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(DnshObjective).map(objective => {
              const compliance = clientMetrics.objectiveCompliance[objective];
              const percentage = compliance.total > 0 
                ? Math.round((compliance.compliant / compliance.total) * 100) 
                : 0;
              
              return (
                <div key={objective} className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#1a1a1a]">
                  <span className="text-sm font-medium text-[#a0a0a0] font-mono uppercase tracking-wider">{objectiveLabels[objective].replace(/\s/g, '_')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-[#1a1a1a] rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-[#00ff88]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right font-mono">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operations List */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1a1a1a] bg-[#111111]">
          <h2 className="text-xl font-bold text-white font-mono uppercase tracking-wider">OPERACIONES_COMPANIA</h2>
          <p className="text-xs text-[#666666] mt-1 font-mono uppercase tracking-wider">{operations.length} OPERACIONES • {clientMetrics.totalAssets} ACTIVOS_TOTALES</p>
        </div>
        <div className="divide-y divide-[#1a1a1a]">
          {operations.map(operation => {
            const dnshSummary = getOperationDnshSummary(operation);
            
            return (
              <div
                key={operation.id}
                onClick={() => onNavigateToOperation(operation.id)}
                className="p-6 hover:bg-[#111111] transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#00ff88] transition-colors mb-2 font-mono uppercase tracking-wider">
                      {operation.name.replace(/\s/g, '_')}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-[#666666] font-mono uppercase tracking-wider">
                      <span>SECTOR: {operation.sectorNACE}</span>
                      <span>•</span>
                      <span>{operation.country}</span>
                      <span>•</span>
                      <span>{operation.assets.length} ASSETS</span>
                      <span>•</span>
                      <span className="font-medium text-white">€{(operation.capex / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                        dnshSummary.compliant === dnshSummary.totalAssets ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                        dnshSummary.nonCompliant > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
                      }`}>
                        {dnshSummary.compliant}/{dnshSummary.totalAssets} COMPLIANT
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-[#666666] group-hover:text-[#00ff88] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subtext, icon, iconBg }: any) => (
  <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-[#1a1a1a] flex flex-col justify-between h-32">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold text-[#666666] font-mono uppercase tracking-wider">{title.replace(/\s/g, '_')}</p>
        <h3 className="text-3xl font-bold text-white mt-2 font-mono">{value}</h3>
        {subtext && <p className="text-xs text-[#666666] mt-1 font-mono uppercase tracking-wider">{subtext.replace(/\s/g, '_')}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-[#111111]`}>
        {icon}
      </div>
    </div>
  </div>
);

const StatusBadge = ({ label, value, color, icon }: any) => {
  const colorClasses = {
    emerald: 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30',
    amber: 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    slate: 'bg-[#1a1a1a] text-[#666666] border border-[#1a1a1a]',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center space-x-2 mb-1">
        {icon}
        <span className="text-sm font-semibold font-mono uppercase tracking-wider">{label.replace(/\s/g, '_')}</span>
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </div>
  );
};

export default ClientDetailPage;
