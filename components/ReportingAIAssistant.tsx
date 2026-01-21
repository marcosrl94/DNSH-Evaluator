import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Edit3, Lightbulb, FileText, X, Send, Bot, User, Loader2, CheckCircle, AlertCircle, Wand2, RefreshCw } from 'lucide-react';
import { ReportSection, ReportSectionType } from '../services/reportingService';
import { generateReportSection, modifyReportContent, generateJustification, generateSuggestions, AISuggestion } from '../services/aiGenService';
import { DnshObjective, EvidenceDocument, Asset, Operation, Client } from '../types';
import { logger } from '../utils/logger';

interface ReportingAIAssistantProps {
  currentSection?: ReportSection;
  sections?: ReportSection[];
  onSectionUpdate?: (sectionId: string, content: string) => void;
  context: {
    level: 'company' | 'portfolio' | 'asset';
    client?: Client;
    operation?: Operation;
    asset?: Asset;
    evidenceDocuments?: EvidenceDocument[];
    metrics?: Record<string, any>;
  };
  mode?: 'edit' | 'suggest' | 'justify';
}

const ReportingAIAssistant: React.FC<ReportingAIAssistantProps> = ({
  currentSection,
  sections = [],
  onSectionUpdate,
  context,
  mode = 'edit'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'edit' | 'suggest' | 'justify'>(mode);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [editingContent, setEditingContent] = useState<string>('');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentSection) {
      setEditingContent(currentSection.content);
    }
  }, [currentSection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [suggestions]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeMode]);

  // Load suggestions when opening in suggest mode
  useEffect(() => {
    if (isOpen && activeMode === 'suggest' && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen, activeMode]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const aiSuggestions = await generateSuggestions(context);
      setSuggestions(aiSuggestions);
    } catch (error) {
      logger.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSection = async () => {
    if (!currentSection) return;
    
    setIsLoading(true);
    try {
      const response = await generateReportSection({
        sectionType: currentSection.type,
        context: {
          ...context,
          existingContent: currentSection.content
        }
      });
      
      setEditingContent(response.content);
      if (onSectionUpdate) {
        onSectionUpdate(currentSection.id, response.content);
      }
    } catch (error) {
      logger.error('Error regenerating section:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyContent = async () => {
    if (!input.trim() || !currentSection) return;
    
    setIsLoading(true);
    try {
      const response = await modifyReportContent(
        currentSection.content,
        input,
        context
      );
      
      setEditingContent(response.content);
      setInput('');
      if (onSectionUpdate) {
        onSectionUpdate(currentSection.id, response.content);
      }
    } catch (error) {
      logger.error('Error modifying content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion: AISuggestion) => {
    if (!currentSection || !suggestion.suggestedContent) return;
    
    setIsLoading(true);
    try {
      const newContent = currentSection.content + '\n\n' + suggestion.suggestedContent;
      setEditingContent(newContent);
      if (onSectionUpdate) {
        onSectionUpdate(currentSection.id, newContent);
      }
      // Remove applied suggestion
      setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    } catch (error) {
      logger.error('Error applying suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateJustification = async (objective: DnshObjective) => {
    if (!context.asset?.dnshEvaluation) return;
    
    setIsLoading(true);
    try {
      const evaluation = context.asset.dnshEvaluation;
      const status = getObjectiveStatus(evaluation, objective);
      const justification = await generateJustification(
        objective,
        status,
        context.evidenceDocuments || [],
        context
      );
      
      setEditingContent(justification);
      if (onSectionUpdate && currentSection) {
        onSectionUpdate(currentSection.id, justification);
      }
    } catch (error) {
      logger.error('Error generating justification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (currentSection && onSectionUpdate) {
      onSectionUpdate(currentSection.id, editingContent);
      setShowEditPanel(false);
    }
  };

  const getObjectiveStatus = (
    evaluation: any,
    objective: DnshObjective
  ): 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' => {
    switch (objective) {
      case DnshObjective.MITIGATION:
        return evaluation.mitigationStatus || 'Not Assessed';
      case DnshObjective.ADAPTATION:
        return evaluation.adaptationStatus || 'Not Assessed';
      case DnshObjective.WATER:
        return evaluation.waterStatus || 'Not Assessed';
      case DnshObjective.CIRCULAR:
        return evaluation.circularStatus || 'Not Assessed';
      case DnshObjective.POLLUTION:
        return evaluation.pollutionStatus || 'Not Assessed';
      case DnshObjective.BIODIVERSITY:
        return evaluation.biodiversityStatus || 'Not Assessed';
      default:
        return 'Not Assessed';
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 group"
          aria-label="Abrir asistente de IA para reporting"
        >
          <Sparkles size={24} />
          <span className="hidden group-hover:inline-block text-sm font-medium ml-2">Asistente IA Gen</span>
        </button>
      )}

      {/* Assistant Panel */}
      {isOpen && (
        <div className="fixed inset-4 md:inset-auto md:bottom-6 md:right-6 md:w-[600px] md:h-[700px] md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100vh-3rem)] z-50 bg-white rounded-xl shadow-2xl flex flex-col border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Asistente IA Gen para Reporting</h3>
                <p className="text-xs text-emerald-100">Genera, modifica y mejora contenidos</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              aria-label="Cerrar asistente"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActiveMode('edit')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeMode === 'edit'
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 size={16} className="inline mr-2" />
              Editar Contenido
            </button>
            <button
              onClick={() => setActiveMode('suggest')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeMode === 'suggest'
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lightbulb size={16} className="inline mr-2" />
              Sugerencias
            </button>
            <button
              onClick={() => setActiveMode('justify')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeMode === 'justify'
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={16} className="inline mr-2" />
              Justificaciones
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-0">
            {activeMode === 'edit' && (
              <div className="space-y-4">
                {currentSection ? (
                  <>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">{currentSection.title}</h4>
                        <button
                          onClick={handleRegenerateSection}
                          disabled={isLoading}
                          className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                          <span>Regenerar</span>
                        </button>
                      </div>
                      <textarea
                        ref={inputRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Edita el contenido aquí..."
                      />
                      <div className="mt-3 flex items-center space-x-2">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleModifyContent()}
                          placeholder="Instrucción para modificar (ej: ampliar, simplificar, añadir detalles)..."
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          disabled={isLoading}
                        />
                        <button
                          onClick={handleModifyContent}
                          disabled={!input.trim() || isLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Wand2 size={16} />
                          )}
                          <span>Modificar</span>
                        </button>
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <CheckCircle size={16} />
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 text-center text-slate-500">
                    <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                    <p>Selecciona una sección del reporte para editarla</p>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'suggest' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900">Sugerencias basadas en evidencias</h4>
                  <button
                    onClick={loadSuggestions}
                    disabled={isLoading}
                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span>Actualizar</span>
                  </button>
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-emerald-600" />
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`bg-white rounded-lg p-4 border ${
                        suggestion.priority === 'high'
                          ? 'border-red-200 bg-red-50'
                          : suggestion.priority === 'medium'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {suggestion.type === 'improvement' && <AlertCircle size={16} className="text-amber-600" />}
                            {suggestion.type === 'evidence_link' && <FileText size={16} className="text-red-600" />}
                            {suggestion.type === 'content_enhancement' && <Lightbulb size={16} className="text-blue-600" />}
                            <h5 className="font-semibold text-slate-900">{suggestion.title}</h5>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              suggestion.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : suggestion.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{suggestion.description}</p>
                          {suggestion.suggestedContent && (
                            <div className="bg-white rounded p-2 text-xs text-slate-600 font-mono border border-slate-200 mb-2">
                              {suggestion.suggestedContent}
                            </div>
                          )}
                        </div>
                      </div>
                      {suggestion.suggestedContent && (
                        <button
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-1"
                        >
                          <CheckCircle size={14} />
                          <span>Aplicar Sugerencia</span>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 text-center text-slate-500">
                    <Lightbulb size={48} className="mx-auto mb-3 text-slate-300" />
                    <p>No hay sugerencias disponibles en este momento</p>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'justify' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 mb-4">Generar Justificaciones DNSH</h4>
                {context.asset?.dnshEvaluation ? (
                  <div className="space-y-2">
                    {Object.values(DnshObjective).map((objective) => {
                      const evaluation = context.asset!.dnshEvaluation!;
                      const status = getObjectiveStatus(evaluation, objective);
                      const objectiveLabels: Record<DnshObjective, string> = {
                        [DnshObjective.MITIGATION]: '1. Mitigación Cambio Climático',
                        [DnshObjective.ADAPTATION]: '2. Adaptación Cambio Climático',
                        [DnshObjective.WATER]: '3. Uso Sostenible del Agua',
                        [DnshObjective.CIRCULAR]: '4. Economía Circular',
                        [DnshObjective.POLLUTION]: '5. Prevención de la Contaminación',
                        [DnshObjective.BIODIVERSITY]: '6. Biodiversidad y Ecosistemas'
                      };
                      
                      return (
                        <button
                          key={objective}
                          onClick={() => handleGenerateJustification(objective)}
                          disabled={isLoading}
                          className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-3 text-left transition-colors disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-slate-900">{objectiveLabels[objective]}</h5>
                              <p className="text-xs text-slate-500 mt-1">Estado: {status}</p>
                            </div>
                            <Wand2 size={18} className="text-emerald-600" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-6 border border-slate-200 text-center text-slate-500">
                    <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                    <p>Las justificaciones están disponibles para activos con evaluación DNSH</p>
                  </div>
                )}
                {editingContent && (
                  <div className="bg-white rounded-lg p-4 border border-slate-200 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-slate-900">Justificación Generada</h5>
                      <button
                        onClick={() => setEditingContent('')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                      {editingContent}
                    </div>
                    {currentSection && (
                      <button
                        onClick={handleSaveEdit}
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Guardar en Sección
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportingAIAssistant;
