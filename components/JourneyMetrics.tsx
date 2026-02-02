/**
 * Journey Metrics Component
 * Shows analytics and metrics for the user journey
 */

import React, { useMemo } from 'react';
import { TrendingUp, Clock, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';
import { Operation } from '../types';
import { JourneyStage, JOURNEY_STAGES } from '../types/journey';
import { calculateJourneyProgress } from '../services/journeyService';
import { useTheme } from '../context/ThemeContext';

interface JourneyMetricsProps {
  operations: Operation[];
}

export const JourneyMetrics: React.FC<JourneyMetricsProps> = ({ operations }) => {
  const { theme } = useTheme();

  const metrics = useMemo(() => {
    const stageCounts: Record<JourneyStage, number> = {
      [JourneyStage.INPUT_LOADING]: 0,
      [JourneyStage.AUTOMATED_EVALUATION]: 0,
      [JourneyStage.MANUAL_DATA_ENTRY]: 0,
      [JourneyStage.REPORT_GENERATION]: 0,
      [JourneyStage.REVIEW_MANAGEMENT]: 0,
    };

    let totalProgress = 0;
    let completedOperations = 0;
    let blockedOperations = 0;

    operations.forEach(operation => {
      const progress = calculateJourneyProgress(operation);
      stageCounts[progress.stage]++;
      totalProgress += progress.progress;
      
      if (progress.completed) {
        completedOperations++;
      }
      
      // Consider blocked if stuck in same stage for > 7 days
      const lastUpdated = new Date(progress.lastUpdated);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 7 && !progress.completed) {
        blockedOperations++;
      }
    });

    const averageProgress = operations.length > 0 ? totalProgress / operations.length : 0;
    const completionRate = operations.length > 0 ? (completedOperations / operations.length) * 100 : 0;

    return {
      stageCounts,
      averageProgress,
      completionRate,
      completedOperations,
      blockedOperations,
      totalOperations: operations.length,
    };
  }, [operations]);

  const themeClasses = {
    bg: {
      primary: theme === 'dark' ? 'bg-black' : 'bg-white',
      secondary: theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-50',
      card: theme === 'dark' ? 'bg-[#111111]' : 'bg-white',
    },
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-[#666666]' : 'text-gray-600',
      accent: theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]',
    },
    border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200',
  };

  return (
    <div className={`p-6 rounded-lg border ${themeClasses.border} ${themeClasses.bg.card}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
          MÉTRICAS DEL JOURNEY
        </h3>
        <BarChart3 size={20} className={themeClasses.text.accent} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${themeClasses.border} ${themeClasses.bg.secondary}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
              PROGRESO PROMEDIO
            </span>
            <TrendingUp size={16} className={themeClasses.text.accent} />
          </div>
          <div className={`text-2xl font-bold font-mono ${themeClasses.text.primary}`}>
            {metrics.averageProgress.toFixed(0)}%
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${themeClasses.border} ${themeClasses.bg.secondary}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
              TASA COMPLETITUD
            </span>
            <CheckCircle2 size={16} className={themeClasses.text.accent} />
          </div>
          <div className={`text-2xl font-bold font-mono ${themeClasses.text.primary}`}>
            {metrics.completionRate.toFixed(0)}%
          </div>
          <div className={`text-xs mt-1 ${themeClasses.text.secondary} font-mono`}>
            {metrics.completedOperations}/{metrics.totalOperations} completadas
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${themeClasses.border} ${themeClasses.bg.secondary}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>
              BLOQUEADAS
            </span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className={`text-2xl font-bold font-mono ${metrics.blockedOperations > 0 ? 'text-amber-500' : themeClasses.text.primary}`}>
            {metrics.blockedOperations}
          </div>
          <div className={`text-xs mt-1 ${themeClasses.text.secondary} font-mono`}>
            Requieren atención
          </div>
        </div>
      </div>

      {/* Stage Distribution */}
      <div>
        <h4 className={`text-sm font-bold font-mono uppercase tracking-wider mb-4 ${themeClasses.text.primary}`}>
          DISTRIBUCIÓN POR ETAPAS
        </h4>
        <div className="space-y-3">
          {JOURNEY_STAGES.map((stageMeta, index) => {
            const count = metrics.stageCounts[stageMeta.stage];
            const percentage = metrics.totalOperations > 0 
              ? (count / metrics.totalOperations) * 100 
              : 0;

            return (
              <div key={stageMeta.stage} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-mono ${themeClasses.text.secondary}`}>
                      {index + 1}.
                    </span>
                    <span className={`text-sm font-medium font-mono ${themeClasses.text.primary}`}>
                      {stageMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-mono ${themeClasses.text.secondary}`}>
                      {count} ops
                    </span>
                    <span className={`text-xs font-bold font-mono ${themeClasses.text.accent}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${themeClasses.bg.secondary}`}>
                  <div
                    className={`h-full transition-all ${themeClasses.text.accent.replace('text-', 'bg-')}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
