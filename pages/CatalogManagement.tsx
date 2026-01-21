/**
 * Catalog Management Page
 * 
 * Comprehensive catalog management interface for measures, hazards, and knowledge base
 * with CRUD operations, versioning, and approval workflows
 */

import React, { useState, useMemo } from 'react';
import { 
  Database, Plus, Search, Filter, Edit, Trash2, CheckCircle, X, 
  FileText, BookOpen, AlertTriangle, Tag, Clock, User, Save, Download, Upload
} from 'lucide-react';
import { ExtendedMeasure, KnowledgeBaseEntry, CaseStudy } from '../types/catalog';
import { EPAdaptationMeasureCategory, EPAdaptationPathwayType } from '../constants/equatorPrinciples';
import { EXTENDED_MEASURES, getAllMeasures } from '../constants/extendedMeasures';
import { catalogStorage, createMeasure, approveOperation } from '../services/catalogService';
import { initializeCatalog } from '../services/catalogService';

const CatalogManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'measures' | 'knowledge' | 'case-studies'>('measures');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EPAdaptationMeasureCategory | 'All'>('All');
  const [selectedPathway, setSelectedPathway] = useState<EPAdaptationPathwayType | 'All'>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<ExtendedMeasure | null>(null);

  // Initialize catalog on mount
  React.useEffect(() => {
    initializeCatalog(EXTENDED_MEASURES.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      cost: m.cost,
      reductionFactor: m.reductionFactor,
      mitigatesHazards: m.mitigatesHazards,
      riskReductionPercentage: m.riskReductionPercentage
    })));
  }, []);

  const measures = useMemo(() => {
    let filtered = getAllMeasures();
    
    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    
    // Filter by pathway
    if (selectedPathway !== 'All') {
      filtered = filtered.filter(m => m.pathwayType === selectedPathway);
    }
    
    return filtered;
  }, [searchTerm, selectedCategory, selectedPathway]);

  const handleAddMeasure = () => {
    setEditingMeasure(null);
    setShowAddForm(true);
  };

  const handleEditMeasure = (measure: ExtendedMeasure) => {
    setEditingMeasure(measure);
    setShowAddForm(true);
  };

  const handleDeleteMeasure = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta medida? Esta acción no se puede deshacer.')) {
      catalogStorage.deleteMeasure(id);
      // Force re-render
      setSearchTerm('');
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Database size={28} className="mr-3 text-blue-600" />
              Gestión de Catálogos
            </h1>
            <p className="text-slate-600 mt-1">
              Administra medidas de adaptación, base de conocimiento y casos de estudio
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {/* Export functionality */}}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center"
            >
              <Download size={16} className="mr-2" />
              Exportar
            </button>
            <button
              onClick={() => {/* Import functionality */}}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center"
            >
              <Upload size={16} className="mr-2" />
              Importar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-slate-200">
          {(['measures', 'knowledge', 'case-studies'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'measures' && 'Medidas'}
              {tab === 'knowledge' && 'Base de Conocimiento'}
              {tab === 'case-studies' && 'Casos de Estudio'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'measures' && (
          <>
            {/* Filters and Search */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar medidas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as EPAdaptationMeasureCategory | 'All')}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">Todas las categorías</option>
                  {Object.values(EPAdaptationMeasureCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={selectedPathway}
                  onChange={(e) => setSelectedPathway(e.target.value as EPAdaptationPathwayType | 'All')}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">Todos los tipos</option>
                  {Object.values(EPAdaptationPathwayType).map(pathway => (
                    <option key={pathway} value={pathway}>{pathway}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Measures List */}
            <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {measures.length} medida{measures.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={handleAddMeasure}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  Nueva Medida
                </button>
              </div>

              <div className="divide-y divide-slate-200">
                {measures.map(measure => (
                  <div key={measure.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{measure.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            measure.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            measure.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {measure.status}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {measure.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{measure.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center">
                            <Tag size={12} className="mr-1" />
                            {measure.tags.slice(0, 3).join(', ')}
                            {measure.tags.length > 3 && ` +${measure.tags.length - 3}`}
                          </span>
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            {measure.implementationTime.total} meses
                          </span>
                          <span className="font-semibold text-slate-700">
                            €{measure.cost.toLocaleString()}
                          </span>
                          <span className="text-emerald-600 font-semibold">
                            {measure.riskReductionPercentage}% reducción
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditMeasure(measure)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteMeasure(measure.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'knowledge' && (
          <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">Base de Conocimiento</p>
              <p className="text-sm">Próximamente: Gestión de entradas de conocimiento</p>
            </div>
          </div>
        )}

        {activeTab === 'case-studies' && (
          <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">Casos de Estudio</p>
              <p className="text-sm">Próximamente: Gestión de casos de estudio</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogManagementPage;
