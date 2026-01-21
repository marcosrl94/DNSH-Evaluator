import React, { useState, useMemo } from 'react';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { getAllMeasures } from '../constants/extendedMeasures';
import { EPAdaptationMeasureCategory } from '../constants/equatorPrinciples';
import { Search, Tag, Info, PenTool, Database, AlertCircle, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

const CatalogsPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EPAdaptationMeasureCategory | 'All'>('All');

  // Get all measures
  const allMeasures = useMemo(() => {
    try {
      const measures = getAllMeasures();
      console.log('CatalogsPage: Loaded measures', measures.length);
      return measures;
    } catch (error) {
      console.error('CatalogsPage: Error loading measures', error);
      return [];
    }
  }, []);
  
  // Get unique categories from measures
  const availableCategories = useMemo(() => {
    const cats = new Set<EPAdaptationMeasureCategory>();
    allMeasures.forEach(m => {
      if (m && m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [allMeasures]);

  // Filter measures
  const filteredMeasures = useMemo(() => {
    if (!allMeasures || allMeasures.length === 0) {
      return [];
    }
    
    let filtered = allMeasures.filter(m => m != null); // Filter out null/undefined
    
    // Filter by search
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(m => {
        if (!m) return false;
        return (
          (m.name && m.name.toLowerCase().includes(searchLower)) || 
          (m.description && m.description.toLowerCase().includes(searchLower)) ||
          (m.tags && Array.isArray(m.tags) && m.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
          (m.hazardMitigation && Array.isArray(m.hazardMitigation) && m.hazardMitigation.some(hm => {
            const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === hm.hazardId);
            return hazard?.name.toLowerCase().includes(searchLower);
          }))
        );
      });
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m && m.category === selectedCategory);
    }
    
    console.log('CatalogsPage: Filtered measures', filtered.length, 'from', allMeasures.length, 'searchTerm:', searchTerm, 'category:', selectedCategory);
    return filtered;
  }, [allMeasures, searchTerm, selectedCategory]);

  return (
    <div className={`p-8 max-w-7xl mx-auto h-full flex flex-col transition-colors ${themeClasses.bg.primary} ${themeClasses.text.primary}`}>
      <div className="mb-8">
        <h2 className={`text-2xl font-bold tracking-tight mb-2 transition-colors ${themeClasses.text.primary}`}>CATÁLOGO DE MEDIDAS</h2>
        <p className={`text-sm font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>Biblioteca de soluciones de adaptación y mitigación</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
            <div className={`p-4 border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
                <div className="relative mb-4">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${themeClasses.text.tertiary}`} size={16} />
                    <input 
                        type="text" 
                        placeholder="BUSCAR MEDIDAS..." 
                        className={`w-full pl-9 pr-3 py-2 border text-xs font-mono transition-colors ${themeClasses.input.bg} ${themeClasses.input.border} ${themeClasses.input.text} ${themeClasses.input.placeholder} ${
                          theme === 'dark' ? 'focus:ring-1 focus:ring-[#00ff88] focus:border-[#00ff88]' : 'focus:ring-1 focus:ring-[#0066cc] focus:border-[#0066cc]'
                        }`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <h3 className={`font-semibold mb-3 text-xs uppercase tracking-widest font-mono transition-colors ${themeClasses.text.primary}`}>CATEGORÍAS</h3>
                <div className="space-y-1">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors border font-mono uppercase tracking-wider ${
                            selectedCategory === 'All' 
                              ? theme === 'dark'
                                ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                                : 'bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20'
                              : `${themeClasses.text.tertiary} ${themeClasses.border.default} ${
                                  theme === 'dark'
                                    ? 'hover:text-white hover:bg-[#111111]'
                                    : 'hover:text-gray-900 hover:bg-gray-50'
                                }`
                        }`}
                    >
                        TODAS ({allMeasures.length})
                    </button>
                    {availableCategories.map(cat => {
                        const count = allMeasures.filter(m => m.category === cat).length;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between border font-mono uppercase tracking-wider ${
                                    selectedCategory === cat 
                                      ? theme === 'dark'
                                        ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                                        : 'bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20'
                                      : `${themeClasses.text.tertiary} ${themeClasses.border.default} ${
                                          theme === 'dark'
                                            ? 'hover:text-white hover:bg-[#111111]'
                                            : 'hover:text-gray-900 hover:bg-gray-50'
                                      }`
                                }`}
                            >
                                <span>{cat}</span>
                                <span className={`text-[10px] opacity-60 transition-colors ${themeClasses.text.tertiary}`}>({count})</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={`p-4 border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}>
                <h4 className={`flex items-center font-semibold mb-2 text-xs uppercase tracking-wider font-mono transition-colors ${themeClasses.text.primary}`}>
                    <Database size={14} className={`mr-2 transition-colors ${
                      theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'
                    }`} />
                    BASE DE DATOS
                </h4>
                <p className={`text-xs font-mono transition-colors ${themeClasses.text.tertiary}`}>
                    {getAllMeasures().length} medidas estandarizadas
                </p>
            </div>
        </div>

        {/* Grid Results */}
        <div className="flex-1 overflow-y-auto pr-2">
            {filteredMeasures.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full text-center py-12 transition-colors ${themeClasses.text.primary}`}>
                    <Database size={48} className={`mb-4 transition-colors ${themeClasses.text.tertiary}`} />
                    <h3 className={`text-lg font-semibold mb-2 font-mono uppercase tracking-wider transition-colors ${themeClasses.text.primary}`}>NO SE ENCONTRARON MEDIDAS</h3>
                    <p className={`text-sm mb-4 font-mono transition-colors ${themeClasses.text.tertiary}`}>
                        {allMeasures.length === 0 
                            ? 'No hay medidas disponibles en el catálogo.'
                            : `No hay medidas que coincidan con "${searchTerm}"${selectedCategory !== 'All' ? ` en la categoría "${selectedCategory}"` : ''}.`
                        }
                    </p>
                    {allMeasures.length === 0 && (
                        <p className={`text-xs font-mono transition-colors ${themeClasses.text.tertiary}`}>
                            Verifica que el catálogo esté correctamente inicializado.
                        </p>
                    )}
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMeasures.map(measure => (
                    <div key={measure.id} className={`p-6 border transition-all flex flex-col h-full ${themeClasses.bg.secondary} ${themeClasses.border.default} ${
                      theme === 'dark' ? 'hover:border-[#00ff88]/30' : 'hover:border-[#0066cc]/30'
                    }`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 border transition-colors ${
                              theme === 'dark' 
                                ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                                : 'bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20'
                            }`}>
                                <PenTool size={18} />
                            </div>
                            <span className={`text-xs font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>ID: {measure.id}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-base font-bold tracking-tight transition-colors ${themeClasses.text.primary}`}>{measure.name}</h3>
                            {measure.status && (
                                <span className={`px-2 py-0.5 border text-xs font-mono uppercase tracking-wider transition-colors ${
                                    measure.status === 'approved' 
                                      ? theme === 'dark'
                                        ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                                        : 'bg-green-50 text-green-600 border-green-200'
                                      : measure.status === 'draft'
                                        ? theme === 'dark'
                                          ? 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/20'
                                          : 'bg-amber-50 text-amber-600 border-amber-200'
                                        : `${themeClasses.bg.tertiary} ${themeClasses.text.tertiary} ${themeClasses.border.default}`
                                }`}>
                                    {measure.status}
                                </span>
                            )}
                        </div>
                        <p className={`text-sm mb-4 flex-1 leading-relaxed transition-colors ${
                          theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600'
                        }`}>{measure.description}</p>
                        
                        {/* Category and Pathway */}
                        <div className="mb-3 flex flex-wrap gap-2">
                            {measure.category && (
                                <span className={`inline-flex items-center px-2 py-1 border text-xs font-mono uppercase tracking-wider transition-colors ${
                                  theme === 'dark'
                                    ? 'border-[#1a1a1a] bg-[#111111] text-[#00a8ff]'
                                    : 'border-gray-200 bg-gray-100 text-blue-600'
                                }`}>
                                    {measure.category}
                                </span>
                            )}
                            {measure.pathwayType && (
                                <span className={`inline-flex items-center px-2 py-1 border text-xs font-mono uppercase tracking-wider transition-colors ${
                                  theme === 'dark'
                                    ? 'border-[#1a1a1a] bg-[#111111] text-[#ffb800]'
                                    : 'border-gray-200 bg-gray-100 text-amber-600'
                                }`}>
                                    {measure.pathwayType}
                                </span>
                            )}
                        </div>
                        
                        {/* Hazards Mitigated */}
                        {measure.hazardMitigation && measure.hazardMitigation.length > 0 && (
                            <div className="mb-3">
                                <div className="flex items-center mb-1.5">
                                    <Shield size={12} className={`mr-1 transition-colors ${themeClasses.text.tertiary}`} />
                                    <span className={`text-xs font-semibold font-mono uppercase tracking-wider transition-colors ${
                                      theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600'
                                    }`}>MITIGA {measure.hazardMitigation.length} HAZARD(S):</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {measure.hazardMitigation.slice(0, 3).map(hm => {
                                        const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === hm.hazardId);
                                        return (
                                            <span 
                                                key={hm.hazardId}
                                                className={`px-2 py-0.5 border text-[10px] font-mono transition-colors ${
                                                  theme === 'dark'
                                                    ? 'bg-[#111111] text-[#ff4444] border-[#1a1a1a]'
                                                    : 'bg-gray-100 text-red-600 border-gray-200'
                                                }`}
                                                title={`${hazard?.name || hm.hazardCode}: ${hm.effectiveness.overallRiskReduction}% efectividad`}
                                            >
                                                {hm.hazardCode}
                                            </span>
                                        );
                                    })}
                                    {measure.hazardMitigation.length > 3 && (
                                        <span className={`px-2 py-0.5 border text-[10px] font-mono transition-colors ${
                                          theme === 'dark'
                                            ? 'bg-[#111111] text-[#666666] border-[#1a1a1a]'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                        }`}>
                                            +{measure.hazardMitigation.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className={`border-t pt-4 space-y-2 transition-colors ${themeClasses.border.default}`}>
                            <div className="flex justify-between text-xs font-mono">
                                <span className={`uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>COSTE:</span>
                                <span className={`font-medium transition-colors ${themeClasses.text.primary}`}>€{measure.cost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                                <span className={`uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>REDUCCIÓN:</span>
                                <span className={`font-bold transition-colors ${
                                  theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'
                                }`}>{measure.riskReductionPercentage}%</span>
                            </div>
                            {measure.implementationTime && (
                                <div className="flex justify-between text-xs font-mono">
                                    <span className={`uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}>TIEMPO:</span>
                                    <span className={`font-medium transition-colors ${themeClasses.text.primary}`}>{measure.implementationTime.total} MESES</span>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {measure.tags && measure.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {measure.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className={`inline-flex items-center px-2 py-1 border text-xs font-mono transition-colors ${
                                      theme === 'dark'
                                        ? 'border-[#1a1a1a] bg-[#111111] text-[#666666]'
                                        : 'border-gray-200 bg-gray-100 text-gray-500'
                                    }`}>
                                        <Tag size={10} className="mr-1" /> {tag.toUpperCase()}
                                    </span>
                                ))}
                                {measure.tags.length > 3 && (
                                    <span className={`inline-flex items-center px-2 py-1 border text-xs font-mono transition-colors ${
                                      theme === 'dark'
                                        ? 'border-[#1a1a1a] bg-[#111111] text-[#666666]'
                                        : 'border-gray-200 bg-gray-100 text-gray-500'
                                    }`}>
                                        +{measure.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                        
                        {/* Environmental Risks */}
                        {measure.environmentalRiskMitigation && measure.environmentalRiskMitigation.length > 0 && (
                            <div className={`mt-3 pt-3 border-t transition-colors ${themeClasses.border.default}`}>
                                <div className="flex items-center mb-1">
                                    <AlertCircle size={12} className={`mr-1 transition-colors ${
                                      theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'
                                    }`} />
                                    <span className={`text-xs font-semibold font-mono uppercase tracking-wider transition-colors ${
                                      theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600'
                                    }`}>RIESGOS AMBIENTALES:</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {measure.environmentalRiskMitigation.slice(0, 2).map((risk, idx) => (
                                        <span 
                                            key={idx}
                                            className={`px-2 py-0.5 border text-[10px] font-mono transition-colors ${
                                              theme === 'dark'
                                                ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20'
                                                : 'bg-green-50 text-green-600 border-green-200'
                                            }`}
                                            title={`${risk.riskDescription}: ${risk.effectiveness}%`}
                                        >
                                            {risk.riskType.replace('_', ' ').toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CatalogsPage;
