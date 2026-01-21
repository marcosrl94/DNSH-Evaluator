
import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Trash2, Plus, Search, Filter, Calendar, User, Tag, Link as LinkIcon, X, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { EvidenceDocument, EvidenceType, Operation, DnshObjective } from '../types';
import { processDocument, createEvidenceFromProcessed, ProcessedDocumentData } from '../services/documentProcessor';

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Registro de Evidencias</h3>
          <p className="text-xs text-slate-500 mt-1">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} registrado{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} className="mr-1" />
          Añadir Evidencia
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 border-b border-slate-200 bg-emerald-50/30">
          <form onSubmit={handleAddEvidence} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Documento *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={processedData?.title || ''}
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                  placeholder="Ej: TDD - Iberia Solar PV"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Evidencia *</label>
                <select
                  name="type"
                  required
                  defaultValue={processedData?.documentType || ''}
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                >
                  {Object.values(EvidenceType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={processedData?.description || ''}
                className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                placeholder="Descripción del documento..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">URL del Documento</label>
                <input
                  type="url"
                  name="fileUrl"
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha del Documento</label>
                <input
                  type="date"
                  name="documentDate"
                  defaultValue={processedData?.documentDate || ''}
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Autor/Organización</label>
                <input
                  type="text"
                  name="author"
                  defaultValue={processedData?.author || ''}
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                  placeholder="Ej: Consultora XYZ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Objetivo DNSH Relacionado</label>
                <select
                  name="relatedObjective"
                  defaultValue={processedData?.relatedObjectives?.[0] || ''}
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                >
                  <option value="">Ninguno</option>
                  {Object.values(DnshObjective).map(obj => (
                    <option key={obj} value={obj}>{obj}</option>
                  ))}
                </select>
                {processedData?.relatedObjectives && processedData.relatedObjectives.length > 1 && (
                  <p className="text-xs text-slate-500 mt-1">
                    También detectados: {processedData.relatedObjectives.slice(1).map(o => o.split(' ')[0]).join(', ')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tags (separados por comas)</label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={processedData?.suggestedTags?.join(', ') || ''}
                  className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
                  placeholder="TDD, EIA, Climate Risk"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subido por</label>
              <input
                type="text"
                name="uploadedBy"
                defaultValue={processedData ? 'System (Auto-processed)' : 'Current User'}
                className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500 p-2"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Registrar Evidencia
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar evidencias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as EvidenceType | 'All')}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="All">Todos los tipos</option>
                {Object.values(EvidenceType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Asset Filter */}
          {operation.assets && operation.assets.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-600">Filtrar por asset:</span>
              <select
                onChange={(e) => {
                  // This would filter evidence by asset
                  // For now, just a placeholder
                }}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los assets</option>
                {operation.assets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-sm">No hay evidencias registradas</p>
            <p className="text-xs mt-1">Añade documentos para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText size={18} className="text-emerald-600" />
                      <h4 className="font-semibold text-slate-900">{doc.name}</h4>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-100">
                        {doc.type}
                      </span>
                    </div>
                    
                    {doc.description && (
                      <p className="text-sm text-slate-600 mb-3">{doc.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {doc.documentDate && (
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {new Date(doc.documentDate).toLocaleDateString()}
                        </div>
                      )}
                      {doc.author && (
                        <div className="flex items-center">
                          <User size={12} className="mr-1" />
                          {doc.author}
                        </div>
                      )}
                      {doc.uploadedBy && (
                        <div className="flex items-center">
                          <span>Subido por: {doc.uploadedBy}</span>
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
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200"
                          >
                            {tag}
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
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="Abrir documento"
                      >
                        <LinkIcon size={16} />
                      </a>
                    )}
                    {onDeleteEvidence && (
                      <button
                        onClick={() => onDeleteEvidence(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
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
