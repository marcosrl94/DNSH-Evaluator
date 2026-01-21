import React, { useState, useMemo } from 'react';
import { ArrowLeft, ShieldCheck, Zap, AlertTriangle, Droplets, RefreshCw, XCircle, Leaf, CheckCircle2, Clock, Building2 } from 'lucide-react';
import { Client, Operation, DnshObjective, Asset } from '../types';
import { calculateObjectiveStats, getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface Props {
  client: Client;
  operations: Operation[];
  onBack: () => void;
}

const ClientDnshEvaluationPage: React.FC<Props> = ({ client, operations, onBack }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [activeObjective, setActiveObjective] = useState<DnshObjective | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Aggregate all assets from all operations
  const allAssets = useMemo(() => {
    return operations.flatMap(op => op.assets);
  }, [operations]);

  // Get objective-specific aggregated data
  const getObjectiveData = (objective: DnshObjective) => {
    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
    
    let compliantCount = 0;
    let totalAssessed = 0;
    const compliantAssets: Array<{ asset: Asset; operation: Operation }> = [];
    const nonCompliantAssets: Array<{ asset: Asset; operation: Operation }> = [];
    const conditionalAssets: Array<{ asset: Asset; operation: Operation }> = [];

    operations.forEach(operation => {
      operation.assets.forEach(asset => {
        const evaluation = asset.dnshEvaluation;
        if (!evaluation) return;

        const status = getObjectiveStatusFromAsset(evaluation, objective);
        if (status === 'Not Assessed') return;

        totalAssessed++;
        
        if (status === 'Compliant') {
          compliantCount++;
          compliantAssets.push({ asset, operation });
        } else if (status === 'Non-Compliant') {
          nonCompliantAssets.push({ asset, operation });
        } else if (status === 'Conditional') {
          conditionalAssets.push({ asset, operation });
        }
      });
    });

    const progress = totalAssessed > 0 ? Math.round((compliantCount / totalAssessed) * 100) : 0;

    return {
      template,
      compliantCount,
      totalAssessed,
      totalAssets: allAssets.length,
      progress,
      compliantAssets,
      nonCompliantAssets,
      conditionalAssets,
    };
  };

  const objectiveLabels: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: 'Mitigación',
    [DnshObjective.ADAPTATION]: 'Adaptación',
    [DnshObjective.WATER]: 'Agua',
    [DnshObjective.CIRCULAR]: 'Economía Circular',
    [DnshObjective.POLLUTION]: 'Contaminación',
    [DnshObjective.BIODIVERSITY]: 'Biodiversidad',
  };

  const objectiveIcons: Record<DnshObjective, React.ReactNode> = {
    [DnshObjective.MITIGATION]: <Zap size={20} className="text-emerald-600" />,
    [DnshObjective.ADAPTATION]: <AlertTriangle size={20} className="text-amber-600" />,
    [DnshObjective.WATER]: <Droplets size={20} className="text-blue-600" />,
    [DnshObjective.CIRCULAR]: <RefreshCw size={20} className="text-purple-600" />,
    [DnshObjective.POLLUTION]: <XCircle size={20} className="text-red-600" />,
    [DnshObjective.BIODIVERSITY]: <Leaf size={20} className="text-green-600" />,
  };

  const objectiveColors: Record<DnshObjective, string> = {
    [DnshObjective.MITIGATION]: theme === 'dark' 
      ? 'border-emerald-500 bg-emerald-500/10' 
      : 'border-emerald-500 bg-emerald-50',
    [DnshObjective.ADAPTATION]: theme === 'dark'
      ? 'border-amber-500 bg-amber-500/10'
      : 'border-amber-500 bg-amber-50',
    [DnshObjective.WATER]: theme === 'dark'
      ? 'border-blue-500 bg-blue-500/10'
      : 'border-blue-500 bg-blue-50',
    [DnshObjective.CIRCULAR]: theme === 'dark'
      ? 'border-purple-500 bg-purple-500/10'
      : 'border-purple-500 bg-purple-50',
    [DnshObjective.POLLUTION]: theme === 'dark'
      ? 'border-red-500 bg-red-500/10'
      : 'border-red-500 bg-red-50',
    [DnshObjective.BIODIVERSITY]: theme === 'dark'
      ? 'border-green-500 bg-green-500/10'
      : 'border-green-500 bg-green-50',
  };

  return (
    <div className={`flex h-full transition-colors ${themeClasses.bg.primary}`}>
      {/* Left Sidebar - Objectives */}
      <div className={`w-80 border-r flex flex-col transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
        <div className={`p-6 border-b transition-colors ${themeClasses.border.default}`}>
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${themeClasses.button.ghost}`}
            >
              <ArrowLeft size={20} className={themeClasses.text.secondary} />
            </button>
            <Building2 size={24} className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} />
            <h2 className={`text-lg font-bold transition-colors ${themeClasses.text.primary}`}>{client.name}</h2>
          </div>
          <p className={`text-sm transition-colors ${themeClasses.text.secondary}`}>Evaluación DNSH Agregada</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.values(DnshObjective).map(objective => {
            const data = getObjectiveData(objective);
            const isActive = activeObjective === objective;
            
            return (
              <button
                key={objective}
                onClick={() => setActiveObjective(objective)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  isActive 
                    ? `${objectiveColors[objective]} shadow-md` 
                    : `${themeClasses.card.bg} ${themeClasses.card.border} ${themeClasses.card.hover}`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {objectiveIcons[objective]}
                    <span className={`font-semibold transition-colors ${themeClasses.text.primary}`}>{objectiveLabels[objective]}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`transition-colors ${themeClasses.text.secondary}`}>
                    {data.compliantCount}/{data.totalAssessed} compliant
                  </span>
                  <span className={`font-bold transition-colors ${themeClasses.text.primary}`}>{data.progress}%</span>
                </div>
                <div className={`mt-2 h-2 rounded-full overflow-hidden transition-colors ${
                  theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-200'
                }`}>
                  <div 
                    className={`h-full ${
                      objective === DnshObjective.MITIGATION ? 'bg-emerald-500' :
                      objective === DnshObjective.ADAPTATION ? 'bg-amber-500' :
                      objective === DnshObjective.WATER ? 'bg-blue-500' :
                      objective === DnshObjective.CIRCULAR ? 'bg-purple-500' :
                      objective === DnshObjective.POLLUTION ? 'bg-red-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${data.progress}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeObjective ? (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className={`p-6 rounded-2xl border-2 transition-colors ${objectiveColors[activeObjective]}`}>
                <div className="flex items-center space-x-3 mb-4">
                  {objectiveIcons[activeObjective]}
                  <h2 className={`text-2xl font-bold transition-colors ${themeClasses.text.primary}`}>
                    {objectiveLabels[activeObjective]}
                  </h2>
                </div>
                <p className={`mb-4 transition-colors ${themeClasses.text.secondary}`}>
                  {getObjectiveData(activeObjective).template?.description}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg transition-colors ${themeClasses.card.bg}`}>
                    <p className={`text-sm transition-colors ${themeClasses.text.secondary}`}>Compliant</p>
                    <p className={`text-2xl font-bold transition-colors ${
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      {getObjectiveData(activeObjective).compliantCount}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${themeClasses.card.bg}`}>
                    <p className={`text-sm transition-colors ${themeClasses.text.secondary}`}>Total Evaluado</p>
                    <p className={`text-2xl font-bold transition-colors ${themeClasses.text.primary}`}>
                      {getObjectiveData(activeObjective).totalAssessed}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${themeClasses.card.bg}`}>
                    <p className={`text-sm transition-colors ${themeClasses.text.secondary}`}>Progreso</p>
                    <p className={`text-2xl font-bold transition-colors ${themeClasses.text.primary}`}>
                      {getObjectiveData(activeObjective).progress}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Assets Breakdown */}
              <div className={`rounded-2xl shadow-sm border p-6 transition-colors ${themeClasses.card.bg} ${themeClasses.card.border}`}>
                <h3 className={`text-lg font-bold mb-4 transition-colors ${themeClasses.text.primary}`}>Assets por Portfolio</h3>
                <div className="space-y-4">
                  {operations.map(operation => {
                    const operationAssets = operation.assets.filter(asset => {
                      const evaluation = asset.dnshEvaluation;
                      if (!evaluation) return false;
                      const status = getObjectiveStatusFromAsset(evaluation, activeObjective);
                      return status !== 'Not Assessed';
                    });

                    if (operationAssets.length === 0) return null;

                    return (
                      <div key={operation.id} className={`border rounded-lg p-4 transition-colors ${themeClasses.card.border} ${themeClasses.card.bg}`}>
                        <h4 className={`font-semibold mb-3 transition-colors ${themeClasses.text.primary}`}>{operation.name}</h4>
                        <div className="space-y-2">
                          {operationAssets.map(asset => {
                            const evaluation = asset.dnshEvaluation;
                            if (!evaluation) return null;
                            const status = getObjectiveStatusFromAsset(evaluation, activeObjective);
                            
                            const statusColor = status === 'Compliant' 
                              ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                              : status === 'Non-Compliant'
                              ? 'text-red-500'
                              : (theme === 'dark' ? 'text-amber-400' : 'text-amber-600');
                            
                            return (
                              <div 
                                key={asset.id}
                                className={`flex items-center justify-between p-2 rounded transition-colors ${themeClasses.card.hover}`}
                              >
                                <span className={`text-sm transition-colors ${themeClasses.text.secondary}`}>{asset.name}</span>
                                <span className={`text-sm font-semibold transition-colors ${statusColor}`}>
                                  {status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShieldCheck size={64} className={`mx-auto mb-4 transition-colors ${themeClasses.text.tertiary}`} />
              <h3 className={`text-xl font-bold mb-2 transition-colors ${themeClasses.text.primary}`}>Selecciona un Objetivo DNSH</h3>
              <p className={`transition-colors ${themeClasses.text.secondary}`}>Elige un objetivo del menú lateral para ver la evaluación agregada</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDnshEvaluationPage;
