import React, { useMemo, useState } from 'react';
import { 
  AlertCircle, CheckCircle, FileText, ClipboardList, MapPin, 
  ChevronRight, Filter, Search, X, ArrowRight, Sparkles,
  AlertTriangle, Info
} from 'lucide-react';
import { Operation, DnshObjective, Asset } from '../types';
import { 
  identifyMissingData, 
  getMissingDataFiltered, 
  MissingDataItem,
  MissingDataSummary 
} from '../services/missingDataService';
import { DNSH_CHECKLIST_TEMPLATES } from '../constants';

interface Props {
  operation: Operation;
  activeObjective?: DnshObjective;
  selectedAssetId?: string | null;
  onNavigateToAsset?: (assetId: string) => void;
  onNavigateToObjective?: (objective: DnshObjective) => void;
  onNavigateToQuestion?: (assetId: string, objective: DnshObjective, questionId: string) => void;
}

const MissingDataPanel: React.FC<Props> = ({
  operation,
  activeObjective,
  selectedAssetId,
  onNavigateToAsset,
  onNavigateToObjective,
  onNavigateToQuestion
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'important' | 'optional'>('all');
  const [filterType, setFilterType] = useState<'all' | MissingDataItem['type']>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Calcular datos faltantes
  const missingData = useMemo(() => {
    return identifyMissingData(operation, activeObjective);
  }, [operation, activeObjective]);

  // Filtrar items
  const filteredItems = useMemo(() => {
    let items = missingData.items;

    // Filtrar por asset seleccionado si hay uno
    if (selectedAssetId) {
      items = items.filter(item => item.assetId === selectedAssetId);
    }

    // Filtrar por categoría
    if (filterCategory !== 'all') {
      items = items.filter(item => item.category === filterCategory);
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      items = items.filter(item => item.type === filterType);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.description.toLowerCase().includes(term) ||
        item.assetName?.toLowerCase().includes(term) ||
        item.objective?.toLowerCase().includes(term)
      );
    }

    return items;
  }, [missingData, selectedAssetId, filterCategory, filterType, searchTerm]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getTypeIcon = (type: MissingDataItem['type']) => {
    switch (type) {
      case 'evidence':
        return <FileText size={16} className="text-blue-600" />;
      case 'checklist':
        return <ClipboardList size={16} className="text-purple-600" />;
      case 'asset_attribute':
        return <MapPin size={16} className="text-green-600" />;
      case 'evaluation_status':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-slate-600" />;
    }
  };

  const getCategoryBadge = (category: MissingDataItem['category']) => {
    switch (category) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200">
            Crítico
          </span>
        );
      case 'important':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded border border-amber-200">
            Importante
          </span>
        );
      case 'optional':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-200">
            Opcional
          </span>
        );
    }
  };

  const handleNavigate = (item: MissingDataItem) => {
    if (item.assetId && onNavigateToAsset) {
      onNavigateToAsset(item.assetId);
    }
    if (item.objective && onNavigateToObjective) {
      onNavigateToObjective(item.objective);
    }
    if (item.questionId && item.assetId && item.objective && onNavigateToQuestion) {
      onNavigateToQuestion(item.assetId, item.objective, item.questionId);
    }
  };

  // Agrupar por asset y objetivo para mejor visualización
  const groupedItems = useMemo(() => {
    const groups: Record<string, MissingDataItem[]> = {};
    
    filteredItems.forEach(item => {
      const key = `${item.assetId || 'general'}-${item.objective || 'general'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return groups;
  }, [filteredItems]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header con resumen */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className="text-amber-600" />
            <h3 className="font-semibold text-slate-900">Datos Pendientes de Completar</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">
              {filteredItems.length} de {missingData.totalMissing} pendientes
            </span>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-lg p-2 border border-red-200">
            <div className="text-xs text-slate-500">Críticos</div>
            <div className="text-lg font-bold text-red-600">{missingData.critical}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-amber-200">
            <div className="text-xs text-slate-500">Importantes</div>
            <div className="text-lg font-bold text-amber-600">{missingData.important}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-blue-200">
            <div className="text-xs text-slate-500">Opcionales</div>
            <div className="text-lg font-bold text-blue-600">{missingData.optional}</div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-emerald-200">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-lg font-bold text-emerald-600">{missingData.totalMissing}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="space-y-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar datos faltantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtros de categoría y tipo */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Todas las categorías</option>
                <option value="critical">Críticos</option>
                <option value="important">Importantes</option>
                <option value="optional">Opcionales</option>
              </select>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="evidence">Evidencias</option>
              <option value="checklist">Checklist</option>
              <option value="asset_attribute">Atributos</option>
              <option value="evaluation_status">Estado Evaluación</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de items faltantes */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <CheckCircle size={48} className="mb-4 opacity-50 text-emerald-600" />
            <p className="text-sm font-medium">¡Todo completo!</p>
            <p className="text-xs mt-1">
              {selectedAssetId 
                ? 'Este asset tiene todos los datos necesarios'
                : 'No hay datos pendientes para los filtros seleccionados'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([key, items]) => {
              const firstItem = items[0];
              const isExpanded = expandedItems.has(key);
              
              return (
                <div
                  key={key}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
                >
                  {/* Header del grupo */}
                  <button
                    onClick={() => toggleExpand(key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 text-left">
                      {getTypeIcon(firstItem.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {firstItem.assetName && (
                            <span className="font-semibold text-slate-900">{firstItem.assetName}</span>
                          )}
                          {firstItem.objective && (
                            <span className="text-sm text-slate-500">
                              • {firstItem.objective}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getCategoryBadge(firstItem.category)}
                          <span className="text-xs text-slate-500">
                            {items.length} {items.length === 1 ? 'item' : 'items'} pendiente{items.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Items expandidos */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-white transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                {getTypeIcon(item.type)}
                                <span className="text-sm font-medium text-slate-900">
                                  {item.type === 'checklist' ? 'Pregunta del Checklist' :
                                   item.type === 'evidence' ? 'Evidencia Faltante' :
                                   item.type === 'asset_attribute' ? 'Atributo del Asset' :
                                   'Estado de Evaluación'}
                                </span>
                                {getCategoryBadge(item.category)}
                              </div>
                              
                              <p className="text-sm text-slate-700 mb-2">{item.description}</p>
                              
                              <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                                <p className="text-xs text-blue-800">
                                  <span className="font-semibold">Acción sugerida:</span> {item.suggestedAction}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleNavigate(item)}
                              className="ml-4 p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                              title="Ir a completar este dato"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer con acciones rápidas */}
      {filteredItems.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {filteredItems.filter(i => i.category === 'critical').length} items críticos requieren atención inmediata
            </div>
            <button
              onClick={() => {
                // Expandir todos los grupos
                const allKeys = Object.keys(groupedItems);
                setExpandedItems(new Set(allKeys));
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Expandir todos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingDataPanel;
