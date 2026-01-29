import React, { useState, useEffect } from 'react';
import { Settings, Save, X, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, Plus, Trash2, FileText } from 'lucide-react';
import {
  ReportConfiguration,
  ReportSectionConfig,
  ReportTemplate,
  ReportLevel,
  ReportSectionType,
  getDefaultConfiguration,
  toggleSection,
  reorderSections,
  updateSectionOptions,
  saveAsTemplate,
  getSavedTemplates,
  loadTemplate,
  deleteTemplate,
  applyTemplate,
  validateConfiguration
} from '../services/reportConfig';

interface ReportConfigPanelProps {
  level: ReportLevel;
  currentConfig: ReportConfiguration;
  onConfigChange: (config: ReportConfiguration) => void;
  onClose: () => void;
}

const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  level,
  currentConfig,
  onConfigChange,
  onClose
}) => {
  const [config, setConfig] = useState<ReportConfiguration>(currentConfig);
  const [expandedSections, setExpandedSections] = useState<Set<ReportSectionType>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    setTemplates(getSavedTemplates().filter(t => t.level === level));
  }, [level]);

  const handleToggleSection = (sectionType: ReportSectionType) => {
    const newConfig = toggleSection(config, sectionType);
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleMoveSection = (sectionType: ReportSectionType, direction: 'up' | 'down') => {
    const section = config.sections.find(s => s.type === sectionType);
    if (!section) return;

    const currentOrder = section.order;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    if (newOrder < 1 || newOrder > config.sections.length) return;

    const newConfig = reorderSections(config, sectionType, newOrder);
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleUpdateOptions = (sectionType: ReportSectionType, options: Partial<ReportSectionConfig['options']>) => {
    const newConfig = updateSectionOptions(config, sectionType, options);
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    
    const template = saveAsTemplate(config, templateName);
    setTemplates([...templates, template]);
    setTemplateName('');
    setShowSaveTemplate(false);
  };

  const handleLoadTemplate = (template: ReportTemplate) => {
    const newConfig = applyTemplate(template);
    setConfig(newConfig);
    onConfigChange(newConfig);
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    }
  };

  const handleReset = () => {
    if (confirm('¿Restaurar configuración por defecto? Se perderán los cambios no guardados.')) {
      const defaultConfig = getDefaultConfiguration(level);
      setConfig(defaultConfig);
      onConfigChange(defaultConfig);
    }
  };

  const toggleExpanded = (sectionType: ReportSectionType) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionType)) {
      newExpanded.delete(sectionType);
    } else {
      newExpanded.add(sectionType);
    }
    setExpandedSections(newExpanded);
  };

  const sectionLabels: Record<ReportSectionType, string> = {
    [ReportSectionType.EXECUTIVE_SUMMARY]: 'Resumen Ejecutivo',
    [ReportSectionType.DNSH_COMPLIANCE]: 'Cumplimiento DNSH',
    [ReportSectionType.RISK_ASSESSMENT]: 'Evaluación de Riesgos',
    [ReportSectionType.EVIDENCE_REVIEW]: 'Revisión de Evidencias',
    [ReportSectionType.FINANCIAL_METRICS]: 'Métricas Financieras',
    [ReportSectionType.GEOGRAPHIC_ANALYSIS]: 'Análisis Geográfico',
    [ReportSectionType.RECOMMENDATIONS]: 'Recomendaciones'
  };

  const validation = validateConfiguration(config);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Configuración de Reporte</h2>
            <p className="text-emerald-100 text-sm mt-1">
              Personaliza las secciones y opciones del reporte
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Templates Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Plantillas Guardadas</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                >
                  {showTemplates ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span>{templates.length} plantillas</span>
                </button>
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded flex items-center space-x-1"
                >
                  <Save size={14} />
                  <span>Guardar como plantilla</span>
                </button>
              </div>
            </div>

            {showSaveTemplate && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nombre de la plantilla..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveTemplate()}
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-2 rounded text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveTemplate(false);
                      setTemplateName('');
                    }}
                    className="text-slate-600 hover:text-slate-800 px-4 py-2 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {showTemplates && templates.length > 0 && (
              <div className="space-y-2 mb-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-slate-600">{template.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {template.sections.filter(s => s.enabled).length} secciones habilitadas
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLoadTemplate(template)}
                        className="text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded text-sm"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 p-1.5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={handleReset}
                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded border border-slate-300"
              >
                Restaurar por defecto
              </button>
            </div>
          </div>

          {/* Sections Configuration */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Secciones del Reporte</h3>
            <div className="space-y-2">
              {config.sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div
                    key={section.type}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="p-4 flex items-center space-x-3">
                      <GripVertical className="text-slate-400 cursor-move" size={20} />
                      <button
                        onClick={() => handleToggleSection(section.type)}
                        className={`flex-1 flex items-center justify-between text-left ${
                          section.enabled ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {section.enabled ? (
                            <Eye size={18} className="text-emerald-600" />
                          ) : (
                            <EyeOff size={18} className="text-slate-400" />
                          )}
                          <span className="font-medium">{sectionLabels[section.type]}</span>
                          <span className="text-xs text-slate-500">Orden: {section.order}</span>
                        </div>
                      </button>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleMoveSection(section.type, 'up')}
                          disabled={section.order === 1}
                          className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          onClick={() => handleMoveSection(section.type, 'down')}
                          disabled={section.order === config.sections.length}
                          className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={18} />
                        </button>
                        <button
                          onClick={() => toggleExpanded(section.type)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          {expandedSections.has(section.type) ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedSections.has(section.type) && (
                      <div className="px-4 pb-4 border-t border-slate-200 bg-slate-50">
                        <div className="pt-4 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Título personalizado (opcional)
                            </label>
                            <input
                              type="text"
                              value={section.title || ''}
                              onChange={(e) =>
                                handleUpdateOptions(section.type, {
                                  ...section.options,
                                  customFields: {
                                    ...section.options?.customFields,
                                    customTitle: e.target.value
                                  }
                                })
                              }
                              placeholder={sectionLabels[section.type]}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Nivel de detalle
                            </label>
                            <select
                              value={section.options?.detailLevel || 'standard'}
                              onChange={(e) =>
                                handleUpdateOptions(section.type, {
                                  detailLevel: e.target.value as 'summary' | 'standard' | 'detailed'
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            >
                              <option value="summary">Resumen</option>
                              <option value="standard">Estándar</option>
                              <option value="detailed">Detallado</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={section.options?.includeCharts || false}
                                onChange={(e) =>
                                  handleUpdateOptions(section.type, {
                                    includeCharts: e.target.checked
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-sm text-slate-700">Incluir gráficos</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={section.options?.includeTables || false}
                                onChange={(e) =>
                                  handleUpdateOptions(section.type, {
                                    includeTables: e.target.checked
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-sm text-slate-700">Incluir tablas</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Opciones Generales</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.options.includeCoverPage || false}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      options: { ...config.options, includeCoverPage: e.target.checked }
                    })
                  }
                  className="rounded"
                />
                <span>Incluir portada</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.options.includeTableOfContents || false}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      options: { ...config.options, includeTableOfContents: e.target.checked }
                    })
                  }
                  className="rounded"
                />
                <span>Incluir índice</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.options.pageNumbering || false}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      options: { ...config.options, pageNumbering: e.target.checked }
                    })
                  }
                  className="rounded"
                />
                <span>Numeración de páginas</span>
              </label>
            </div>
          </div>

          {/* Validation */}
          {!validation.valid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-red-900 mb-2">Errores de configuración:</h4>
              <ul className="list-disc list-inside text-sm text-red-700">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-600">
            {config.sections.filter(s => s.enabled).length} de {config.sections.length} secciones habilitadas
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-300"
            >
              Cerrar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              Aplicar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportConfigPanel;
