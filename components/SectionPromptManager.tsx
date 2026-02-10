import React, { useState } from 'react';
import { Plus, X, Edit2, Trash2, Sparkles, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { ReportSection, SectionPrompt } from '../services/reportingService';
import { ReportSectionType } from '../services/reportingService';
import { createSectionPrompt, updateSectionPrompt, removePromptFromSection } from '../services/reportPromptService';

interface SectionPromptManagerProps {
  section: ReportSection;
  onSectionUpdate: (section: ReportSection) => void;
  theme?: 'dark' | 'light';
}

const SectionPromptManager: React.FC<SectionPromptManagerProps> = ({
  section,
  onSectionUpdate,
  theme = 'dark'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [promptPosition, setPromptPosition] = useState<'before' | 'after' | 'replace'>('after');
  const [showAddForm, setShowAddForm] = useState(false);

  const prompts = section.customPrompts || [];

  const handleAddPrompt = () => {
    if (!promptText.trim()) return;

    const newPrompt = createSectionPrompt(promptText, promptPosition, true);
    const updatedSection = {
      ...section,
      customPrompts: [...prompts, newPrompt]
    };
    onSectionUpdate(updatedSection);
    
    setPromptText('');
    setPromptPosition('after');
    setShowAddForm(false);
  };

  const handleEditPrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      setEditingPromptId(promptId);
      setPromptText(prompt.prompt);
      setPromptPosition(prompt.position);
      setShowAddForm(true);
    }
  };

  const handleUpdatePrompt = () => {
    if (!editingPromptId || !promptText.trim()) return;

    const updatedSection = updateSectionPrompt(section, editingPromptId, {
      prompt: promptText,
      position: promptPosition
    });
    onSectionUpdate(updatedSection);
    
    setEditingPromptId(null);
    setPromptText('');
    setPromptPosition('after');
    setShowAddForm(false);
  };

  const handleDeletePrompt = (promptId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      const updatedSection = removePromptFromSection(section, promptId);
      onSectionUpdate(updatedSection);
    }
  };

  const handleTogglePrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      const updatedSection = updateSectionPrompt(section, promptId, {
        enabled: !prompt.enabled
      });
      onSectionUpdate(updatedSection);
    }
  };

  const positionLabels: Record<'before' | 'after' | 'replace', string> = {
    before: 'Antes del prompt por defecto',
    after: 'Después del prompt por defecto',
    replace: 'Reemplazar prompt por defecto'
  };

  const themeClasses = {
    dark: {
      bg: 'bg-[#0a0a0a]',
      border: 'border-[#1a1a1a]',
      text: 'text-white',
      textSecondary: 'text-[#a0a0a0]',
      hover: 'hover:bg-[#1a1a1a]',
      input: 'bg-[#111111] border-[#1a1a1a] text-white',
      button: 'bg-[#00ff88] text-black hover:bg-[#00cc6f]',
      buttonSecondary: 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
    },
    light: {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      hover: 'hover:bg-gray-50',
      input: 'bg-white border-gray-300 text-gray-900',
      button: 'bg-emerald-600 text-white hover:bg-emerald-700',
      buttonSecondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
    }
  };

  const t = themeClasses[theme];

  return (
    <div className={`${t.border} ${t.bg} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between ${t.hover} transition-colors`}
      >
        <div className="flex items-center space-x-2">
          <Sparkles size={18} className={t.textSecondary} />
          <span className={`font-medium ${t.text}`}>
            Prompts Personalizados ({prompts.length})
          </span>
          {prompts.filter(p => p.enabled).length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-emerald-100 text-emerald-700'}`}>
              {prompts.filter(p => p.enabled).length} activos
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={18} className={t.textSecondary} />
        ) : (
          <ChevronDown size={18} className={t.textSecondary} />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className={`px-4 pb-4 border-t ${t.border} space-y-3`}>
          {/* Existing Prompts */}
          {prompts.length > 0 && (
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-3 rounded-lg border ${t.border} ${!prompt.enabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <button
                          onClick={() => handleTogglePrompt(prompt.id)}
                          className="flex items-center"
                        >
                          {prompt.enabled ? (
                            <Eye size={16} className={t.textSecondary} />
                          ) : (
                            <EyeOff size={16} className={t.textSecondary} />
                          )}
                        </button>
                        <span className={`text-xs font-medium ${t.textSecondary}`}>
                          {positionLabels[prompt.position]}
                        </span>
                      </div>
                      <p className={`text-sm ${t.text} whitespace-pre-wrap`}>
                        {prompt.prompt}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handleEditPrompt(prompt.id)}
                        className={`p-1 rounded ${t.hover} ${t.textSecondary}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className={`p-1 rounded ${t.hover} text-red-500`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className={`p-4 rounded-lg border ${t.border} ${t.bg}`}>
              <h4 className={`font-medium mb-3 ${t.text}`}>
                {editingPromptId ? 'Editar Prompt' : 'Nuevo Prompt'}
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                    Posición del Prompt
                  </label>
                  <select
                    value={promptPosition}
                    onChange={(e) => setPromptPosition(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-lg border ${t.input} text-sm`}
                  >
                    <option value="before">Antes del prompt por defecto</option>
                    <option value="after">Después del prompt por defecto</option>
                    <option value="replace">Reemplazar prompt por defecto</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                    Contenido del Prompt
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Escribe el prompt personalizado para esta sección..."
                    rows={6}
                    className={`w-full px-3 py-2 rounded-lg border ${t.input} text-sm font-mono resize-none`}
                  />
                  <p className={`text-xs mt-1 ${t.textSecondary}`}>
                    Este prompt se combinará con el prompt por defecto según la posición seleccionada.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={editingPromptId ? handleUpdatePrompt : handleAddPrompt}
                    disabled={!promptText.trim()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      promptText.trim()
                        ? t.button
                        : `${t.buttonSecondary} opacity-50 cursor-not-allowed`
                    }`}
                  >
                    {editingPromptId ? 'Actualizar' : 'Agregar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingPromptId(null);
                      setPromptText('');
                      setPromptPosition('after');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${t.buttonSecondary}`}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className={`w-full px-4 py-2 rounded-lg border border-dashed ${t.border} ${t.hover} flex items-center justify-center space-x-2 transition-colors`}
            >
              <Plus size={18} className={t.textSecondary} />
              <span className={`text-sm font-medium ${t.textSecondary}`}>
                Agregar Prompt Personalizado
              </span>
            </button>
          )}

          {/* Info */}
          <div className={`text-xs ${t.textSecondary} p-2 rounded ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
            <p className="mb-1">
              <strong>Prompts localizados:</strong> Agrega prompts personalizados que se aplicarán específicamente a esta sección del reporte.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Antes:</strong> Se añade al inicio del prompt por defecto</li>
              <li><strong>Después:</strong> Se añade al final del prompt por defecto</li>
              <li><strong>Reemplazar:</strong> Sustituye completamente el prompt por defecto</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionPromptManager;
