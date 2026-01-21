
import React, { useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, MapPin, FileText, Save, Download, Link as LinkIcon, Leaf, Droplets } from 'lucide-react';
import { Asset, DnshObjective, AssetDnshEvaluation, AssetDnshAnswer, EUAssetType, EvidenceDocument } from '../types';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';
import { findNearbyKBAs } from '../constants/kbas';
import { findNearbyWaterRiskZones } from '../constants/waterRisk';
import MapViewer from '../components/MapViewer';

interface Props {
  asset: Asset;
  operationName: string;
  availableEvidence?: EvidenceDocument[]; // Evidence documents from the operation
  onBack: () => void;
  onSave?: (evaluation: AssetDnshEvaluation) => void;
}

const AssetEvaluationPage: React.FC<Props> = ({ asset, operationName, availableEvidence = [], onBack, onSave }) => {
  const [activeObjective, setActiveObjective] = useState<DnshObjective>(DnshObjective.MITIGATION);
  const [answers, setAnswers] = useState<Record<string, AssetDnshAnswer>>({});
  const [saved, setSaved] = useState(false);
  const [showKBAs, setShowKBAs] = useState(false);
  const [showWaterRisk, setShowWaterRisk] = useState(false);
  
  // Filter evidence relevant to current objective
  const relevantEvidence = availableEvidence.filter(ev => 
    !ev.relatedObjective || ev.relatedObjective === activeObjective
  );

  const activeTemplate = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === activeObjective);

  // Find nearby KBAs when evaluating Biodiversity objective
  const nearbyKBAs = useMemo(() => {
    if (activeObjective === DnshObjective.BIODIVERSITY) {
      return findNearbyKBAs(asset.lat, asset.lng, 50); // 50km radius
    }
    return [];
  }, [activeObjective, asset.lat, asset.lng]);

  // Find nearby water risk zones when evaluating Water objective
  const [nearbyWaterRiskZones, setNearbyWaterRiskZones] = useState<ReturnType<typeof findNearbyWaterRiskZones> extends Promise<infer T> ? T : never>([]);
  
  React.useEffect(() => {
    if (activeObjective === DnshObjective.WATER) {
      findNearbyWaterRiskZones(asset.lat, asset.lng, 50).then(setNearbyWaterRiskZones);
    } else {
      setNearbyWaterRiskZones([]);
    }
  }, [activeObjective, asset.lat, asset.lng]);
  
  // Check if current objective is the substantial contribution
  const isExempt = asset.attributes.substantialContribution === activeObjective;

  const handleResponseChange = (questionId: string, val: 'Yes' | 'No' | 'N/A') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { 
        ...prev[questionId],
        assetId: asset.id,
        questionId,
        objective: activeObjective,
        response: val,
        evidence: prev[questionId]?.evidence || '',
        assessedBy: 'Current User',
        assessedDate: new Date().toISOString()
      }
    }));
    setSaved(false);
  };

  const handleEvidenceChange = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { 
        ...prev[questionId],
        assetId: asset.id,
        questionId,
        objective: activeObjective,
        response: prev[questionId]?.response || null,
        evidence: text,
        supportingDocuments: prev[questionId]?.supportingDocuments || [],
        assessedBy: 'Current User',
        assessedDate: new Date().toISOString()
      }
    }));
    setSaved(false);
  };

  const toggleEvidenceLink = (questionId: string, evidenceId: string) => {
    setAnswers(prev => {
      const current = prev[questionId];
      const currentDocs = current?.supportingDocuments || [];
      const newDocs = currentDocs.includes(evidenceId)
        ? currentDocs.filter(id => id !== evidenceId)
        : [...currentDocs, evidenceId];
      
      return {
        ...prev,
        [questionId]: {
          ...(current || {
            assetId: asset.id,
            questionId,
            objective: activeObjective,
            response: null,
            evidence: '',
            assessedBy: 'Current User',
            assessedDate: new Date().toISOString()
          }),
          supportingDocuments: newDocs
        }
      };
    });
    setSaved(false);
  };

  const calculateObjectiveStatus = (objective: DnshObjective): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
    if (asset.attributes.substantialContribution === objective) {
      return 'Compliant'; // Exempt for substantial contribution
    }

    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
    if (!template) return 'Not Assessed';

    const objectiveAnswers = template.questions
      .map(q => answers[q.id])
      .filter(a => a !== undefined);

    if (objectiveAnswers.length === 0) return 'Not Assessed';

    const hasNo = objectiveAnswers.some(a => a.response === 'No');
    const allAnswered = objectiveAnswers.every(a => a.response !== null);

    if (hasNo) return 'Non-Compliant';
    if (allAnswered) return 'Compliant';
    return 'Conditional';
  };

  const handleSave = () => {
    const evaluation: AssetDnshEvaluation = {
      assetId: asset.id,
      evaluationDate: new Date().toISOString(),
      evaluator: 'Current User',
      mitigationStatus: calculateObjectiveStatus(DnshObjective.MITIGATION),
      mitigationEvidence: Object.values(answers)
        .filter(a => a.objective === DnshObjective.MITIGATION && a.evidence)
        .map(a => a.evidence),
      adaptationStatus: calculateObjectiveStatus(DnshObjective.ADAPTATION),
      waterStatus: calculateObjectiveStatus(DnshObjective.WATER),
      waterEvidence: Object.values(answers)
        .filter(a => a.objective === DnshObjective.WATER && a.evidence)
        .map(a => a.evidence),
      circularStatus: calculateObjectiveStatus(DnshObjective.CIRCULAR),
      circularEvidence: Object.values(answers)
        .filter(a => a.objective === DnshObjective.CIRCULAR && a.evidence)
        .map(a => a.evidence),
      pollutionStatus: calculateObjectiveStatus(DnshObjective.POLLUTION),
      pollutionEvidence: Object.values(answers)
        .filter(a => a.objective === DnshObjective.POLLUTION && a.evidence)
        .map(a => a.evidence),
      biodiversityStatus: calculateObjectiveStatus(DnshObjective.BIODIVERSITY),
      biodiversityEvidence: Object.values(answers)
        .filter(a => a.objective === DnshObjective.BIODIVERSITY && a.evidence)
        .map(a => a.evidence),
      overallStatus: calculateOverallStatus(),
    };

    if (onSave) {
      onSave(evaluation);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const calculateOverallStatus = (): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
    const statuses = [
      calculateObjectiveStatus(DnshObjective.MITIGATION),
      calculateObjectiveStatus(DnshObjective.ADAPTATION),
      calculateObjectiveStatus(DnshObjective.WATER),
      calculateObjectiveStatus(DnshObjective.CIRCULAR),
      calculateObjectiveStatus(DnshObjective.POLLUTION),
      calculateObjectiveStatus(DnshObjective.BIODIVERSITY),
    ];

    if (statuses.some(s => s === 'Non-Compliant')) return 'Non-Compliant';
    if (statuses.every(s => s === 'Compliant')) return 'Compliant';
    if (statuses.some(s => s === 'Conditional')) return 'Conditional';
    return 'Not Assessed';
  };

  const calculateProgress = (objective: DnshObjective) => {
    if (asset.attributes.substantialContribution === objective) return 100;

    const template = DNSH_CHECKLIST_TEMPLATES.find(t => t.objective === objective);
    if (!template) return 0;
    
    let answeredCount = 0;
    template.questions.forEach(q => {
      if (answers[q.id]?.response) answeredCount++;
    });
    return Math.round((answeredCount / template.questions.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Non-Compliant': return 'bg-red-100 text-red-700 border-red-200';
      case 'Conditional': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
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
            <h2 className="text-lg font-bold text-slate-900">Evaluación DNSH por Asset</h2>
            <p className="text-sm text-slate-500">
              {asset.name} • {operationName} • {asset.assetType}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1.5 rounded-lg border font-semibold text-sm ${getStatusColor(calculateOverallStatus())}`}>
            {calculateOverallStatus()}
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            {saved ? <CheckCircle size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
            {saved ? 'Guardado' : 'Guardar Evaluación'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Sidebar: Objectives Navigation */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Objetivos DNSH</h3>
            <div className="mt-2 flex items-center space-x-2 text-xs text-slate-500">
              <MapPin size={12} />
              <span>Lat: {asset.lat.toFixed(4)}, Lng: {asset.lng.toFixed(4)}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {DNSH_CHECKLIST_TEMPLATES.map((template) => {
              const isActive = activeObjective === template.objective;
              const progress = calculateProgress(template.objective);
              const status = calculateObjectiveStatus(template.objective);
              const isSubstantial = asset.attributes.substantialContribution === template.objective;
              
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
                        <span title="Primary Contribution Objective" className="ml-2">
                          <CheckCircle size={14} className="text-blue-500" />
                        </span>
                      )}
                    </div>
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          status === 'Compliant' ? 'bg-emerald-500' : 
                          status === 'Non-Compliant' ? 'bg-red-500' : 
                          status === 'Conditional' ? 'bg-amber-500' : 
                          'bg-slate-400'
                        }`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {status}
                    </div>
                  </div>
                  {status === 'Compliant' && <CheckCircle size={16} className="text-emerald-500 ml-3" />}
                  {status === 'Non-Compliant' && <XCircle size={16} className="text-red-500 ml-3" />}
                  {status === 'Conditional' && <AlertTriangle size={16} className="text-amber-500 ml-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content: Questionnaire */}
        <div className="col-span-12 lg:col-span-9 flex flex-col min-h-0 space-y-4">
          {/* Asset Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase">Tipo de Asset</p>
                <p className="font-semibold text-slate-900">{asset.assetType}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">NACE Code</p>
                <p className="font-semibold text-slate-900">{asset.attributes.naceCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Taxonomía Activity</p>
                <p className="font-semibold text-slate-900">{asset.attributes.taxonomyActivity || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Valor Expuesto</p>
                <p className="font-semibold text-slate-900">€{(asset.exposedValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>

          {/* Map showing asset location - Reduced size */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-shrink-0" style={{ height: '220px' }}>
            <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-600 uppercase">Ubicación del Asset</h4>
              <div className="flex items-center space-x-2">
                {activeObjective === DnshObjective.BIODIVERSITY && nearbyKBAs.length > 0 && (
                  <button
                    onClick={() => setShowKBAs(!showKBAs)}
                    className={`text-xs px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
                      showKBAs 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Leaf size={12} />
                    <span>KBAs ({nearbyKBAs.length})</span>
                  </button>
                )}
                {activeObjective === DnshObjective.WATER && nearbyWaterRiskZones.length > 0 && (
                  <button
                    onClick={() => setShowWaterRisk(!showWaterRisk)}
                    className={`text-xs px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
                      showWaterRisk 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Droplets size={12} />
                    <span>Water Risk ({nearbyWaterRiskZones.length})</span>
                  </button>
                )}
                <span className="text-xs text-slate-400">Coordenadas: {asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}</span>
              </div>
            </div>
            <div className="relative overflow-hidden" style={{ height: '180px', minHeight: '180px' }}>
              <MapViewer 
                assets={[asset]} 
                activeLayers={[]} 
                theme="light"
                showKBAs={showKBAs && activeObjective === DnshObjective.BIODIVERSITY}
                kbas={nearbyKBAs}
                showWaterRisk={showWaterRisk && activeObjective === DnshObjective.WATER}
                waterRiskZones={nearbyWaterRiskZones}
              />
            </div>
            {activeObjective === DnshObjective.BIODIVERSITY && nearbyKBAs.length > 0 && (
              <div className="p-2 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-800">
                <div className="flex items-center space-x-1 mb-1">
                  <Leaf size={12} />
                  <span className="font-semibold">Nearby Key Biodiversity Areas:</span>
                </div>
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {nearbyKBAs.slice(0, 3).map(kba => (
                    <div key={kba.id} className="text-[10px]">
                      • {kba.name} ({kba.distanceFromAssetKm?.toFixed(1)} km)
                    </div>
                  ))}
                  {nearbyKBAs.length > 3 && (
                    <div className="text-[10px] text-emerald-600">+{nearbyKBAs.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
            {activeObjective === DnshObjective.WATER && nearbyWaterRiskZones.length > 0 && (
              <div className="p-2 bg-blue-50 border-t border-blue-200 text-xs text-blue-800">
                <div className="flex items-center space-x-1 mb-1">
                  <Droplets size={12} />
                  <span className="font-semibold">Nearby Water Risk Zones:</span>
                </div>
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {nearbyWaterRiskZones.slice(0, 3).map(zone => (
                    <div key={zone.id} className="text-[10px]">
                      • {zone.name} ({zone.distanceFromAssetKm?.toFixed(1)} km) - <span className={`font-semibold ${
                        zone.riskLevel === 'Very High' ? 'text-red-600' :
                        zone.riskLevel === 'High' ? 'text-orange-600' :
                        zone.riskLevel === 'Moderate' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>{zone.riskLevel}</span>
                    </div>
                  ))}
                  {nearbyWaterRiskZones.length > 3 && (
                    <div className="text-[10px] text-blue-600">+{nearbyWaterRiskZones.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Questionnaire */}
          {activeTemplate && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{activeTemplate.title}</h3>
                    <p className="text-slate-500 mt-1">{activeTemplate.description}</p>
                  </div>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    EU Taxonomy
                  </div>
                </div>
              </div>

              {isExempt ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-lg">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Primary Contribution Objective</h3>
                    <p className="text-slate-600 mb-6">
                      Este asset hace una <span className="font-semibold">Contribución Sustancial</span> a {activeTemplate.title}. 
                      Por lo tanto, la evaluación DNSH se considera cumplida automáticamente para este objetivo específico.
                    </p>
                    <div className="inline-flex items-center text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                      <CheckCircle size={18} className="mr-2" /> Evaluación Cumplida Automáticamente
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg">
                    <h4 className="font-bold text-amber-800 text-sm">Metodología EU Taxonomy</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Evaluación asset-by-asset según Reglamento (UE) 2020/852. Cada asset debe cumplir individualmente con los criterios DNSH.
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
                              <FileText size={12} className="mr-1" />
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
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                              <FileText size={12} className="mr-1" /> Evidencia / Documentación de Apoyo
                            </label>
                            <textarea 
                              className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 min-h-[60px] p-2 border"
                              placeholder="Pegar enlaces a documentos o describir evidencia..."
                              value={answer?.evidence || ''}
                              onChange={(e) => handleEvidenceChange(q.id, e.target.value)}
                            />
                            
                            {/* Available Evidence Documents */}
                            {relevantEvidence.length > 0 && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-xs font-medium text-blue-800 mb-2">Documentos disponibles en el registro:</p>
                                <div className="space-y-2">
                                  {relevantEvidence.map(ev => {
                                    const isLinked = answer?.supportingDocuments?.includes(ev.id);
                                    return (
                                      <div 
                                        key={ev.id} 
                                        className={`flex items-center justify-between p-2 rounded border transition-all cursor-pointer ${
                                          isLinked 
                                            ? 'bg-emerald-50 border-emerald-300' 
                                            : 'bg-white border-blue-200 hover:border-blue-300'
                                        }`}
                                        onClick={() => toggleEvidenceLink(q.id, ev.id)}
                                      >
                                        <div className="flex items-center space-x-2 flex-1">
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                            isLinked ? 'border-emerald-500 bg-emerald-500' : 'border-blue-300'
                                          }`}>
                                            {isLinked && <CheckCircle size={10} className="text-white" />}
                                          </div>
                                          <FileText size={12} className="text-blue-600" />
                                          <div className="flex-1 min-w-0">
                                            <span className="text-blue-700 text-xs font-medium block truncate">{ev.name}</span>
                                            {ev.description && (
                                              <span className="text-blue-600 text-[10px] block truncate">{ev.description}</span>
                                            )}
                                          </div>
                                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] whitespace-nowrap">
                                            {ev.type}
                                          </span>
                                        </div>
                                        {ev.fileUrl && (
                                          <a
                                            href={ev.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded ml-2"
                                            title="Abrir documento"
                                          >
                                            <LinkIcon size={12} />
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {answer?.supportingDocuments && answer.supportingDocuments.length > 0 && (
                                  <p className="text-xs text-emerald-700 mt-2 font-medium">
                                    ✓ {answer.supportingDocuments.length} documento(s) vinculado(s)
                                  </p>
                                )}
                              </div>
                            )}
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

export default AssetEvaluationPage;
