import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Database, Sliders, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  type AppSettings,
  type HazardDatasetConfig,
  type HazardDataSource,
  type ParametricSettings,
} from '../services/settingsService';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { ClimateScenario } from '../types';
import { CLIMATE_SCENARIOS } from '../constants/climateScenarios';

const HAZARD_SOURCE_LABELS: Record<HazardDataSource, string> = {
  cordex: 'CORDEX (Europa)',
  'wri-aqueduct': 'WRI Aqueduct (Agua)',
  'copernicus-cds': 'Copernicus CDS',
  custom: 'Custom (URL)',
};

const SettingsPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [saved, setSaved] = useState(false);
  const [datasetsExpanded, setDatasetsExpanded] = useState(true);
  const [parametricExpanded, setParametricExpanded] = useState(true);

  useEffect(() => {
    const handler = () => setSettings(loadSettings());
    window.addEventListener('settings-updated', handler);
    return () => window.removeEventListener('settings-updated', handler);
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm('¿Restaurar configuración por defecto? Se perderán los cambios no guardados.')) {
      setSettings(getDefaultSettings());
    }
  };

  const updateHazardDataset = (hazardId: string, patch: Partial<HazardDatasetConfig>) => {
    setSettings((prev) => ({
      ...prev,
      hazardDatasets: prev.hazardDatasets.map((d) =>
        d.hazardId === hazardId ? { ...d, ...patch } : d
      ),
    }));
  };

  const updateParametric = (patch: Partial<ParametricSettings>) => {
    setSettings((prev) => ({
      ...prev,
      parametric: { ...prev.parametric, ...patch },
    }));
  };

  const hazardByName = (id: string) => EU_TAXONOMY_HAZARDS.find((h) => h.id === id);

  return (
    <div
      className={`p-8 max-w-6xl mx-auto h-full flex flex-col transition-colors ${themeClasses.bg.primary} ${themeClasses.text.primary}`}
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2
            className={`text-2xl font-bold tracking-tight mb-2 transition-colors ${themeClasses.text.primary}`}
          >
            CONFIGURACIÓN
          </h2>
          <p
            className={`text-sm font-mono uppercase tracking-wider transition-colors ${themeClasses.text.tertiary}`}
          >
            Datasets por hazard y parametría
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-mono border transition-colors ${
              theme === 'dark'
                ? 'border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <RotateCcw size={16} />
            Restaurar
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-mono transition-colors ${
              theme === 'dark'
                ? 'bg-[#00ff88] text-black hover:bg-[#00cc6f]'
                : 'bg-[#0066cc] text-white hover:bg-[#0052a3]'
            }`}
          >
            <Save size={16} />
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-y-auto">
        {/* Hazard Datasets */}
        <div
          className={`border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}
        >
          <button
            onClick={() => setDatasetsExpanded(!datasetsExpanded)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Database
                size={20}
                className={theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'}
              />
              <h3 className={`font-semibold uppercase tracking-wider font-mono ${themeClasses.text.primary}`}>
                Datasets por Hazard
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {datasetsExpanded ? '▲' : '▼'} {settings.hazardDatasets.filter((d) => d.enabled).length} activos
            </span>
          </button>
          {datasetsExpanded && (
            <div className="border-t p-4 space-y-4 max-h-[420px] overflow-y-auto">
              <p className={`text-xs font-mono mb-4 ${themeClasses.text.tertiary}`}>
                Define qué fuente de datos se usa para cada hazard en las capas del mapa y evaluaciones.
              </p>
              <div className="space-y-2">
                {settings.hazardDatasets.map((cfg) => {
                  const hazard = hazardByName(cfg.hazardId);
                  return (
                    <div
                      key={cfg.hazardId}
                      className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-colors ${
                        theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={(e) => updateHazardDataset(cfg.hazardId, { enabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-xs font-mono truncate max-w-[200px]" title={hazard?.name}>
                          {hazard?.code ?? cfg.hazardId}
                        </span>
                      </label>
                      <select
                        value={cfg.source}
                        onChange={(e) =>
                          updateHazardDataset(cfg.hazardId, {
                            source: e.target.value as HazardDataSource,
                            customApiUrl: e.target.value === 'custom' ? cfg.customApiUrl : undefined,
                          })
                        }
                        className={`text-xs px-2 py-1.5 rounded border ${
                          theme === 'dark'
                            ? 'bg-slate-800 border-slate-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        {(Object.keys(HAZARD_SOURCE_LABELS) as HazardDataSource[]).map((src) => (
                          <option key={src} value={src}>
                            {HAZARD_SOURCE_LABELS[src]}
                          </option>
                        ))}
                      </select>
                      {cfg.source === 'custom' && (
                        <input
                          type="url"
                          placeholder="https://api.example.com/hazard-data"
                          value={cfg.customApiUrl ?? ''}
                          onChange={(e) =>
                            updateHazardDataset(cfg.hazardId, { customApiUrl: e.target.value || undefined })
                          }
                          className={`flex-1 min-w-[200px] text-xs px-2 py-1.5 rounded border font-mono ${
                            theme === 'dark'
                              ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                      )}
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {hazard?.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                className={`flex items-start gap-2 p-3 rounded border ${
                  theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-600 dark:text-amber-400">Fuentes disponibles</p>
                  <ul className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                    <li>• <strong>CORDEX</strong>: Proyecciones climáticas regionales (Europa, ESGF/CDS)</li>
                    <li>• <strong>WRI Aqueduct</strong>: Estrés hídrico, sequía, inundaciones fluviales/costeras</li>
                    <li>• <strong>Copernicus CDS</strong>: Climate Data Store (requiere API key)</li>
                    <li>• <strong>Custom</strong>: API o dataset propio vía URL</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Parametric Settings */}
        <div
          className={`border transition-colors ${themeClasses.bg.secondary} ${themeClasses.border.default}`}
        >
          <button
            onClick={() => setParametricExpanded(!parametricExpanded)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Sliders
                size={20}
                className={theme === 'dark' ? 'text-[#00ff88]' : 'text-[#0066cc]'}
              />
              <h3 className={`font-semibold uppercase tracking-wider font-mono ${themeClasses.text.primary}`}>
                Parametría
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {parametricExpanded ? '▲' : '▼'}
            </span>
          </button>
          {parametricExpanded && (
            <div className="border-t p-4 space-y-6">
              <p className={`text-xs font-mono ${themeClasses.text.tertiary}`}>
                Escenarios por defecto y umbrales de materialidad para evaluaciones DNSH.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
                    Escenario climático por defecto
                  </label>
                  <select
                    value={settings.parametric.defaultScenario}
                    onChange={(e) =>
                      updateParametric({
                        defaultScenario: e.target.value as ClimateScenario,
                      })
                    }
                    className={`w-full text-sm px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {CLIMATE_SCENARIOS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
                    Horizonte por defecto
                  </label>
                  <select
                    value={settings.parametric.defaultHorizon}
                    onChange={(e) =>
                      updateParametric({
                        defaultHorizon: e.target.value as '2030' | '2050' | '2100',
                      })
                    }
                    className={`w-full text-sm px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="2030">2030</option>
                    <option value="2050">2050</option>
                    <option value="2100">2100</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
                    Umbral temperatura materialidad (°C)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.5}
                    max={3}
                    value={settings.parametric.temperatureThreshold}
                    onChange={(e) =>
                      updateParametric({
                        temperatureThreshold: parseFloat(e.target.value) || 1.5,
                      })
                    }
                    className={`w-full text-sm px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
                    Umbral olas de calor (eventos/año)
                  </label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    max={20}
                    value={settings.parametric.heatWaveThreshold}
                    onChange={(e) =>
                      updateParametric({
                        heatWaveThreshold: parseInt(e.target.value, 10) || 6,
                      })
                    }
                    className={`w-full text-sm px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
                    Umbral incendio forestal (0-1)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={1}
                    value={settings.parametric.wildfireThreshold}
                    onChange={(e) =>
                      updateParametric({
                        wildfireThreshold: parseFloat(e.target.value) || 0.4,
                      })
                    }
                    className={`w-full text-sm px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${themeClasses.text.tertiary}`}>
                    Nivel alerta estrés hídrico (0-5 WRI)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={5}
                    value={settings.parametric.waterStressAlertLevel}
                    onChange={(e) =>
                      updateParametric({
                        waterStressAlertLevel: parseFloat(e.target.value) || 4,
                      })
                    }
                    className={`w-full text-sm px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
