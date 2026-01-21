

import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Circle, AlertCircle, Save, FileText, Link as LinkIcon, HelpCircle, ShieldCheck } from 'lucide-react';
import { Operation, DnshObjective } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';

interface Props {
  operation: Operation;
  onBack: () => void;
}

interface AnswerState {
  [key: string]: {
    response: 'Yes' | 'No' | 'N/A' | null;
    evidence: string;
  };
}

const DnshChecklistPage: React.FC<Props> = ({ operation, onBack }) => {
  const [activeObjective, setActiveObjective] = useState<DnshObjective>(DnshObjective.MITIGATION);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [saved, setSaved] = useState(false);

  const activeTemplate = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === activeObjective);
  
  // Check if current objective is the substantial contribution
  const isExempt = operation.substantialContributionId === activeObjective;

  const handleResponseChange = (questionId: string, val: 'Yes' | 'No' | 'N/A') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], response: val }
    }));
    setSaved(false);
  };

  const handleEvidenceChange = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], evidence: text }
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const objectiveStatus = useMemo(() => {
    const result: Record<DnshObjective, { completion: number; status: 'OK' | 'RISK' | 'FAIL' | 'EXEMPT' }> = {} as any;
    DNSH_CHECKLIST_TEMPLATES.forEach(t => {
      // Exempt if this is the substantial contribution objective
      if (operation.substantialContributionId === t.objective) {
        result[t.objective] = { completion: 100, status: 'EXEMPT' };
        return;
      }
      const total = t.questions.length;
      let answered = 0;
      let hasNo = false;
      t.questions.forEach(q => {
        const a = answers[q.id];
        if (a?.response) {
          answered++;
          if (a.response === 'No') hasNo = true;
        }
      });
      const completion = total === 0 ? 0 : Math.round((answered / total) * 100);
      let status: 'OK' | 'RISK' | 'FAIL' = 'RISK';
      if (completion === 0) {
        status = 'RISK';
      } else if (completion === 100 && !hasNo) {
        status = 'OK';
      } else if (hasNo) {
        status = 'FAIL';
      } else {
        status = 'RISK';
      }
      result[t.objective] = { completion, status };
    });
    return result;
  }, [answers, operation.substantialContributionId]);

  const calculateProgress = (objective: DnshObjective) => {
    // If exempt, we treat it as 100% complete for visual purposes
    if (operation.substantialContributionId === objective) return 100;

    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
    if (!template) return 0;
    
    let answeredCount = 0;
    template.questions.forEach(q => {
      if (answers[q.id]?.response) answeredCount++;
    });
    return Math.round((answeredCount / template.questions.length) * 100);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Environmental Objectives Checklist</h2>
            <p className="text-sm text-slate-500">Evaluate DNSH compliance for objectives 1, 3, 4, 5, 6</p>
          </div>
        </div>
        {!isExempt && (
            <button 
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
            {saved ? <CheckCircle size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
            {saved ? 'Saved' : 'Save Changes'}
            </button>
        )}
      </div>

      {/* Global DNSH status strip */}
      <div className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">DNSH Summary by Objective</p>
          <p className="text-sm text-slate-200">
            Estado preliminar basado en las respuestas del checklist para cada objetivo ambiental.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DNSH_CHECKLIST_TEMPLATES.map(t => {
            const st = objectiveStatus[t.objective];
            if (!st) return null;
            let label = 'En evaluación';
            let badgeClass = 'bg-amber-500/10 text-amber-700 border border-amber-500/40';
            if (st.status === 'OK') {
              label = 'DNSH cumplido';
              badgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/40';
            } else if (st.status === 'FAIL') {
              label = 'DNSH no cumplido';
              badgeClass = 'bg-red-500/10 text-red-500 border border-red-500/40';
            } else if (st.status === 'EXEMPT') {
              label = 'Objetivo de contribución sustancial';
              badgeClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/40';
            }
            return (
              <div
                key={t.objective}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-xs"
              >
                <span className="truncate max-w-[140px] font-medium">{t.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
                  {label}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">{st.completion}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Sidebar: Objectives Navigation */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Objectives</h3>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {DNSH_CHECKLIST_TEMPLATES.map((template) => {
              const isActive = activeObjective === template.objective;
              const progress = calculateProgress(template.objective);
              const isSubstantial = operation.substantialContributionId === template.objective;
              
              return (
                <button
                  key={template.objective}
                  onClick={() => setActiveObjective(template.objective)}
                  className={`w-full text-left px-4 py-4 border-l-4 transition-all hover:bg-slate-50 flex justify-between items-center group ${
                    isActive 
                      ? 'border-emerald-500 bg-emerald-50/50' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                        <p className={`text-sm font-medium ${isActive ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {template.title}
                        </p>
                        {isSubstantial && (
                            <span title="Primary Contribution Objective">
                                <ShieldCheck size={14} className="ml-2 text-blue-500" />
                            </span>
                        )}
                    </div>
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  {progress === 100 && <CheckCircle size={16} className="text-emerald-500 ml-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content: Questionnaire */}
        <div className="col-span-12 lg:col-span-9 flex flex-col min-h-0">
          {activeTemplate && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{activeTemplate.title}</h3>
                    <p className="text-slate-500 mt-1">{activeTemplate.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                      EU Taxonomy
                    </div>
                    {objectiveStatus[activeObjective] && (
                      <ObjectiveStatusPill status={objectiveStatus[activeObjective].status} />
                    )}
                  </div>
                </div>
              </div>

              {isExempt ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-lg">
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <ShieldCheck size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Primary Contribution Objective</h3>
                          <p className="text-slate-600 mb-6">
                              This operation makes a <span className="font-semibold">Substantial Contribution</span> to {activeTemplate.title}. 
                              Therefore, the DNSH (Do No Significant Harm) assessment is implicitly met or not applicable for this specific objective.
                          </p>
                          <div className="inline-flex items-center text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                              <CheckCircle size={18} className="mr-2" /> Assessment Passed Automatically
                          </div>
                      </div>
                  </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Methodology Header for standard DNSH */}
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg">
                        <h4 className="font-bold text-amber-800 text-sm flex items-center">
                            <ShieldCheck size={16} className="mr-2" />
                            EP4-Aligned DNSH Assessment Methodology
                        </h4>
                        <p className="text-xs text-amber-700 mt-2">
                            <strong>Step 1: Initial Screening</strong> - Identify if environmental risks exist based on location, sector, and asset characteristics. 
                            If no plausible risks exist, provide concise justification ("No"). If risks exist ("Yes"), a substantive assessment (Step 2) is required.
                        </p>
                        <p className="text-xs text-amber-700 mt-2">
                            <strong>Step 2: Substantive Assessment</strong> - For identified risks, conduct comprehensive evaluation following Equator Principles IV (EP4) 
                            methodology, including Physical Climate Risk Assessment, adaptation planning, and residual risk evaluation.
                        </p>
                        <p className="text-xs text-amber-600 mt-2 font-semibold">
                            All responses must be supported by evidence documents or automated assessments.
                        </p>
                    </div>

                    {activeTemplate.questions.map((q, index) => {
                    const answer = answers[q.id];
                    
                    return (
                        <div key={q.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-slate-300 transition-colors">
                        <div className="flex items-start space-x-3 mb-4">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {index + 1}
                            </div>
                            <div className="flex-1">
                            <p className="font-medium text-slate-900">{q.text}</p>
                            <div className="flex items-center text-xs text-slate-500 mt-1">
                                <HelpCircle size={12} className="mr-1" />
                                {q.guidance}
                            </div>
                            </div>
                        </div>

                        <div className="ml-9 space-y-4">
                            {/* Radio Options */}
                            <div className="flex space-x-4">
                            {['Yes', 'No', 'N/A'].map((opt) => (
                                <label key={opt} className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name={`q-${q.id}`} 
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                    checked={answer?.response === opt}
                                    onChange={() => handleResponseChange(q.id, opt as any)}
                                />
                                <span className="ml-2 text-sm text-slate-700 font-medium">{opt}</span>
                                </label>
                            ))}
                            </div>

                            {/* Evidence Input */}
                            <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                                <LinkIcon size={12} className="mr-1" /> Evidence / Supporting Documentation
                            </label>
                            <textarea 
                                className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 min-h-[60px] p-2 border"
                                placeholder="Paste links to documents or describe evidence..."
                                value={answer?.evidence || ''}
                                onChange={(e) => handleEvidenceChange(q.id, e.target.value)}
                            />
                            </div>
                        </div>
                        </div>
                    );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const ObjectiveStatusPill = ({ status }: { status: 'OK' | 'RISK' | 'FAIL' | 'EXEMPT' }) => {
  if (status === 'EXEMPT') {
    return (
      <div className="inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 border border-blue-400/60">
        <ShieldCheck size={12} className="mr-1" />
        Objetivo de contribución sustancial
      </div>
    );
  }
  if (status === 'OK') {
    return (
      <div className="inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-400/60">
        <CheckCircle size={12} className="mr-1" />
        DNSH cumplido
      </div>
    );
  }
  if (status === 'FAIL') {
    return (
      <div className="inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-700 border border-red-400/60">
        <AlertCircle size={12} className="mr-1" />
        DNSH no cumplido
      </div>
    );
  }
  return (
    <div className="inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-400/60">
      <Circle size={10} className="mr-1" />
      En evaluación
    </div>
  );
};

export default DnshChecklistPage;