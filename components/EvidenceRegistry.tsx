
import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Trash2, Plus, Search, Filter, Calendar, User, Tag, Link as LinkIcon, X, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { EvidenceDocument, EvidenceType, Operation, DnshObjective } from '../types';
import { processDocument, createEvidenceFromProcessed, ProcessedDocumentData } from '../services/documentProcessor';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface Props {
  operation: Operation;
  onAddEvidence: (evidence: Omit<EvidenceDocument, 'id' | 'uploadDate'>) => void;
  onDeleteEvidence?: (evidenceId: string) => void;
  onLinkToQuestion?: (evidenceId: string, questionId: string, objective: DnshObjective) => void;
}

const EvidenceRegistry: React.FC<Props> = ({ 
  operation, 
  onAddEvidence, 
  onDeleteEvidence,
  onLinkToQuestion 
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme || 'dark');
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<EvidenceType | 'All'>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedDocumentData | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documents = operation.evidenceDocuments || [];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddEvidence = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newEvidence: Omit<EvidenceDocument, 'id' | 'uploadDate'> = {
      operationId: operation.id,
      assetId: formData.get('assetId') as string || undefined,
      name: formData.get('name') as string,
      type: formData.get('type') as EvidenceType,
      description: formData.get('description') as string || undefined,
      uploadedBy: 'Current User', // In real app, get from auth context
      fileUrl: formData.get('fileUrl') as string || undefined,
      documentDate: formData.get('documentDate') as string || undefined,
      author: formData.get('author') as string || undefined,
      language: formData.get('language') as string || undefined,
      relatedObjective: formData.get('relatedObjective') ? formData.get('relatedObjective') as DnshObjective : undefined,
      tags: formData.get('tags') ? (formData.get('tags') as string).split(',').map(t => t.trim()) : undefined,
    };

    onAddEvidence(newEvidence);
    setShowAddForm(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className={`${themeClasses.card.bg} rounded-xl shadow-sm border ${themeClasses.card.border} flex flex-col h-full`}>
      {/* Header */}
      <div className={`p-4 border-b ${themeClasses.border.default} ${themeClasses.bg.secondary} flex items-center justify-between`}>
        <div>
          <h3 className={`font-semibold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>REGISTRO_DE_EVIDENCIAS</h3>
          <p className={`text-xs font-mono mt-1 ${themeClasses.text.tertiary}`}>
            {documents.length} DOCUMENTO{documents.length !== 1 ? 'S' : ''} REGISTRADO{documents.length !== 1 ? 'S' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${themeClasses.button.primary}`}
        >
          <Plus size={14} className="mr-1" />
          AÑADIR_EVIDENCIA
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className={`p-4 border-b ${themeClasses.border.default} ${themeClasses.bg.tertiary}`}>
          <form onSubmit={handleAddEvidence} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>NOMBRE_DOC *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={processedData?.title || ''}
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                  placeholder="TDD_Iberia_Solar_PV"
                />
              </div>
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>TIPO_EVIDENCIA *</label>
                <select
                  name="type"
                  required
                  defaultValue={processedData?.documentType || ''}
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                >
                  {Object.values(EvidenceType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>DESCRIPCION</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={processedData?.description || ''}
                className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                placeholder="DESCRIPCION_DEL_DOCUMENTO..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>URL_DOC</label>
                <input
                  type="url"
                  name="fileUrl"
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                  placeholder="HTTPS://..."
                />
              </div>
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>FECHA_DOC</label>
                <input
                  type="date"
                  name="documentDate"
                  defaultValue={processedData?.documentDate || ''}
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>AUTOR</label>
                <input
                  type="text"
                  name="author"
                  defaultValue={processedData?.author || ''}
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                  placeholder="CONSULTORA_XYZ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>OBJETIVO_DNSH</label>
                <select
                  name="relatedObjective"
                  defaultValue={processedData?.relatedObjectives?.[0] || ''}
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                >
                  <option value="">NINGUNO</option>
                  {Object.values(DnshObjective).map(obj => (
                    <option key={obj} value={obj}>{obj}</option>
                  ))}
                </select>
                {processedData?.relatedObjectives && processedData.relatedObjectives.length > 1 && (
                  <p className={`text-xs font-mono mt-1 ${themeClasses.text.tertiary}`}>
                    TAMBIEN_DETECTADOS: {processedData.relatedObjectives.slice(1).map(o => o.split(' ')[0]).join(', ')}
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>TAGS (SEP_COMAS)</label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={processedData?.suggestedTags?.join(', ') || ''}
                  className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
                  placeholder="TDD, EIA, CLIMATE_RISK"
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary} mb-1`}>SUBIDO_POR</label>
              <input
                type="text"
                name="uploadedBy"
                defaultValue={processedData ? 'SYSTEM_AUTO_PROCESSED' : 'CURRENT_USER'}
                className={`w-full text-sm rounded-md p-2 font-mono ${themeClasses.inputClass}`}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-lg transition-all ${themeClasses.button.secondary}`}
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-lg transition-all ${themeClasses.button.primary}`}
              >
                REGISTRAR_EVIDENCIA
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className={`p-4 border-b ${themeClasses.border.default} ${themeClasses.bg.secondary}`}>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.text.tertiary}`} size={16} />
              <input
                type="text"
                placeholder="BUSCAR_EVIDENCIAS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg font-mono ${themeClasses.inputClass}`}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={16} className={themeClasses.text.tertiary} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as EvidenceType | 'All')}
                className={`text-sm rounded-lg px-3 py-2 font-mono ${themeClasses.inputClass}`}
              >
                <option value="All">TODOS_LOS_TIPOS</option>
                {Object.values(EvidenceType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Asset Filter */}
          {operation.assets && operation.assets.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>FILTRAR_POR_ASSET:</span>
              <select
                onChange={(e) => {
                  // This would filter evidence by asset
                  // For now, just a placeholder
                }}
                className={`text-xs rounded-lg px-2 py-1 font-mono ${themeClasses.inputClass}`}
              >
                <option value="">TODOS_LOS_ASSETS</option>
                {operation.assets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.name.toUpperCase().replace(/\s/g, '_')}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className={`flex-1 overflow-y-auto p-4 ${themeClasses.scrollbar.track} ${themeClasses.scrollbar.thumb}`}>
        {filteredDocuments.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-64 ${themeClasses.text.tertiary}`}>
            <FileText size={48} className="mb-4 opacity-50" />
            <p className={`text-sm font-mono uppercase tracking-wider ${themeClasses.text.secondary}`}>NO_HAY_EVIDENCIAS_REGISTRADAS</p>
            <p className={`text-xs mt-1 font-mono uppercase tracking-wider ${themeClasses.text.tertiary}`}>AÑADE_DOCUMENTOS_PARA_COMENZAR</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className={`p-4 border ${themeClasses.card.border} rounded-lg transition-all ${themeClasses.card.bg} ${themeClasses.card.hover}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText size={18} className={themeClasses.text.accent} />
                      <h4 className={`font-semibold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>{doc.name.toUpperCase().replace(/\s/g, '_')}</h4>
                      <span className={`px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded border ${themeClasses.badge.info}`}>
                        {doc.type}
                      </span>
                    </div>
                    
                    {doc.description && (
                      <p className={`text-sm font-mono mb-3 ${themeClasses.text.secondary}`}>{doc.description.toUpperCase()}</p>
                    )}

                    <div className={`flex flex-wrap items-center gap-4 text-xs font-mono ${themeClasses.text.tertiary}`}>
                      {doc.documentDate && (
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {(() => {
                            try {
                              const dateRaw = doc.documentDate;
                              const date = dateRaw instanceof Date ? dateRaw : new Date(String(dateRaw));
                              return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
                            } catch (e) {
                              return '';
                            }
                          })()}
                        </div>
                      )}
                      {doc.author && (
                        <div className="flex items-center">
                          <User size={12} className="mr-1" />
                          {doc.author.toUpperCase()}
                        </div>
                      )}
                      {doc.uploadedBy && (
                        <div className="flex items-center">
                          <span>SUBIDO_POR: {doc.uploadedBy.toUpperCase().replace(/\s/g, '_')}</span>
                        </div>
                      )}
                      {doc.relatedObjective && (
                        <div className="flex items-center">
                          <Tag size={12} className="mr-1" />
                          {doc.relatedObjective}
                        </div>
                      )}
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {doc.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded border ${themeClasses.badge.neutral}`}
                          >
                            {tag.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded transition-colors ${themeClasses.text.accent} ${themeClasses.bg.hover}`}
                        title="ABRIR_DOCUMENTO"
                      >
                        <LinkIcon size={16} />
                      </a>
                    )}
                    {onDeleteEvidence && (
                      <button
                        onClick={() => onDeleteEvidence(doc.id)}
                        className={`p-2 rounded transition-colors ${themeClasses.text.danger} ${themeClasses.bg.hover}`}
                        title="ELIMINAR"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenceRegistry;
