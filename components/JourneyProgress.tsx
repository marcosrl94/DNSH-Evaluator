/**
 * Journey Progress Component
 * Shows the progress through the 5-stage user journey
 */

import React from 'react';
import { CheckCircle2, Circle, Zap, Upload, Edit, FileText, Archive } from 'lucide-react';
import { JourneyStage, JourneyProgress, JOURNEY_STAGES } from '../types/journey';
import { useTheme } from '../context/ThemeContext';

interface JourneyProgressProps {
  progress: JourneyProgress;
  showLabels?: boolean;
  compact?: boolean;
}

export const JourneyProgressIndicator: React.FC<JourneyProgressProps> = ({
  progress,
  showLabels = true,
  compact = false,
}) => {
  const { theme } = useTheme();
  
  // Ensure progress is valid and all properties are primitives
  if (!progress || typeof progress !== 'object') {
    return null;
  }
  
  const safeProgress = {
    operationId: String(progress.operationId || ''),
    stage: progress.stage,
    completed: Boolean(progress.completed),
    progress: Number(progress.progress || 0),
    lastUpdated: String(progress.lastUpdated || ''),
    updatedBy: String(progress.updatedBy || 'system')
  };
  
  const getStageIcon = (stage: JourneyStage) => {
    const stageMeta = JOURNEY_STAGES.find(s => s.stage === stage);
    switch (stage) {
      case JourneyStage.INPUT_LOADING:
        return <Upload size={compact ? 14 : 16} />;
      case JourneyStage.AUTOMATED_EVALUATION:
        return <Zap size={compact ? 14 : 16} />;
      case JourneyStage.MANUAL_DATA_ENTRY:
        return <Edit size={compact ? 14 : 16} />;
      case JourneyStage.REPORT_GENERATION:
        return <FileText size={compact ? 14 : 16} />;
      case JourneyStage.REVIEW_MANAGEMENT:
        return <Archive size={compact ? 14 : 16} />;
      default:
        return <Circle size={compact ? 14 : 16} />;
    }
  };

  const getStageStatus = (stage: JourneyStage) => {
    const currentIndex = JOURNEY_STAGES.findIndex(s => s.stage === safeProgress.stage);
    const stageIndex = JOURNEY_STAGES.findIndex(s => s.stage === stage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const themeClasses = {
    completed: {
      icon: theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600',
      bg: theme === 'dark' ? 'bg-[#00ff88]/10' : 'bg-green-50',
      border: theme === 'dark' ? 'border-[#00ff88]' : 'border-green-600',
    },
    current: {
      icon: theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]',
      bg: theme === 'dark' ? 'bg-[#00ff88]/20' : 'bg-blue-100',
      border: theme === 'dark' ? 'border-[#00ff88]' : 'border-[#0066cc]',
    },
    pending: {
      icon: theme === 'dark' ? 'text-[#666666]' : 'text-gray-400',
      bg: theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-50',
      border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-300',
    },
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        {JOURNEY_STAGES.map((stageMeta, index) => {
          const status = getStageStatus(stageMeta.stage);
          const isLast = index === JOURNEY_STAGES.length - 1;
          
          return (
            <React.Fragment key={String(stageMeta.stage)}>
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${themeClasses[status].border} ${themeClasses[status].bg} transition-all`}
                title={String(stageMeta.label || '')}
              >
                {status === 'completed' ? (
                  <CheckCircle2 size={12} className={themeClasses[status].icon} />
                ) : (
                  getStageIcon(stageMeta.stage)
                )}
              </div>
              {!isLast && (
                <div className={`h-0.5 w-4 ${status === 'completed' ? themeClasses.completed.bg : themeClasses.pending.bg}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-[#1a1a1a] bg-[#111111]' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-bold font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          PROGRESO_JOURNEY
        </h3>
        <span className={`text-xs font-bold font-mono ${theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'}`}>
          {`${Number(safeProgress.progress || 0)}%`}
        </span>
      </div>
      
      <div className="space-y-2">
        {(() => {
          // Unified stages for display - combine AUTOMATED_EVALUATION and MANUAL_DATA_ENTRY into EVAL_DNSH
          const unifiedStages = [
            JOURNEY_STAGES.find(s => s.stage === JourneyStage.INPUT_LOADING)!,
            {
              stage: JourneyStage.AUTOMATED_EVALUATION, // Use AUTOMATED_EVALUATION as representative
              label: 'EVAL_DNSH',
              description: 'Evaluación DNSH automatizada y datos manuales',
              icon: 'Zap',
              order: 2
            },
            JOURNEY_STAGES.find(s => s.stage === JourneyStage.REPORT_GENERATION)!,
            JOURNEY_STAGES.find(s => s.stage === JourneyStage.REVIEW_MANAGEMENT)!
          ].filter(Boolean);

          return unifiedStages.map((stageMeta, index) => {
            // Determine status: if current stage is AUTOMATED_EVALUATION or MANUAL_DATA_ENTRY, show as current
            const isEvalStage = safeProgress.stage === JourneyStage.AUTOMATED_EVALUATION || 
                              safeProgress.stage === JourneyStage.MANUAL_DATA_ENTRY;
            const isCurrentEval = stageMeta.stage === JourneyStage.AUTOMATED_EVALUATION && isEvalStage;
            
            const currentIndex = unifiedStages.findIndex(s => 
              s.stage === safeProgress.stage || 
              (safeProgress.stage === JourneyStage.MANUAL_DATA_ENTRY && s.stage === JourneyStage.AUTOMATED_EVALUATION)
            );
            const stageIndex = unifiedStages.findIndex(s => s.stage === stageMeta.stage);
            
            let status: 'completed' | 'current' | 'pending';
            if (stageIndex < currentIndex) {
              status = 'completed';
            } else if (stageIndex === currentIndex || isCurrentEval) {
              status = 'current';
            } else {
              status = 'pending';
            }
            
            const isCurrent = status === 'current';
            
            return (
              <div
                key={String(stageMeta.stage)}
                className={`flex items-center space-x-3 p-2 rounded-lg transition-all ${
                  isCurrent ? themeClasses.current.bg : ''
                }`}
              >
                <div className={`flex-shrink-0 ${themeClasses[status].icon}`}>
                  {status === 'completed' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    getStageIcon(stageMeta.stage)
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {String(stageMeta.label || '')}
                  </div>
                  {showLabels && (
                    <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-[#666666]' : 'text-gray-500'}`}>
                      {String(stageMeta.description || '')}
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};
