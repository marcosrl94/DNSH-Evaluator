/**
 * Settings Service
 *
 * Configuración de datasets por hazard y parametría global.
 * Persistencia en localStorage (puede sincronizar con backend/organización más adelante).
 */

import { EU_TAXONOMY_HAZARDS } from '../constants';
import { ClimateScenario } from '../types';

export type HazardDataSource = 'cordex' | 'wri-aqueduct' | 'copernicus-cds' | 'custom';

export interface HazardDatasetConfig {
  hazardId: string;
  source: HazardDataSource;
  /** URL del API/dataset para fuente custom */
  customApiUrl?: string;
  /** Variable CORDEX (tas, pr, sfcWind, etc.) para mapeo */
  cordexVariable?: string;
  /** Activar/desactivar dataset para este hazard */
  enabled: boolean;
}

export interface ParametricSettings {
  /** Escenario climático por defecto */
  defaultScenario: ClimateScenario;
  /** Horizonte por defecto (2030, 2050, 2100) */
  defaultHorizon: '2030' | '2050' | '2100';
  /** Umbral de temperatura para materialidad (°C) */
  temperatureThreshold: number;
  /** Umbral de frecuencia de olas de calor (eventos/año) */
  heatWaveThreshold: number;
  /** Umbral de riesgo de incendio (0-1) */
  wildfireThreshold: number;
  /** Nivel mínimo de estrés hídrico para alerta (0-5 WRI) */
  waterStressAlertLevel: number;
}

export interface AppSettings {
  hazardDatasets: HazardDatasetConfig[];
  parametric: ParametricSettings;
  version: number;
}

const STORAGE_KEY = 'ecoinvest-dnsh-settings';

const defaultParametric: ParametricSettings = {
  defaultScenario: ClimateScenario.SSP2_45,
  defaultHorizon: '2050',
  temperatureThreshold: 1.5,
  heatWaveThreshold: 6,
  wildfireThreshold: 0.4,
  waterStressAlertLevel: 4,
};

const DEFAULT_HAZARD_SOURCES: Record<string, HazardDataSource> = {
  h1: 'cordex',
  h2: 'cordex',
  h3: 'cordex',
  h4: 'cordex',
  h5: 'cordex',
  h6: 'cordex',
  h7: 'cordex',
  h8: 'cordex',
  h9: 'cordex',
  h10: 'cordex',
  h11: 'cordex',
  h12: 'cordex',
  h13: 'cordex',
  h14: 'cordex',
  h15: 'wri-aqueduct',
  h16: 'wri-aqueduct',
  h17: 'cordex',
  h18: 'wri-aqueduct',
  h19: 'wri-aqueduct',
  h20: 'cordex',
  h21: 'cordex',
  h22: 'cordex',
  h23: 'cordex',
  h24: 'cordex',
  h25: 'wri-aqueduct',
  h26: 'cordex',
  h27: 'cordex',
  h28: 'cordex',
};

export function getDefaultHazardDatasets(): HazardDatasetConfig[] {
  return EU_TAXONOMY_HAZARDS.map((h) => ({
    hazardId: h.id,
    source: DEFAULT_HAZARD_SOURCES[h.id] ?? 'cordex',
    enabled: true,
    cordexVariable: getDefaultCordexVariable(h.id),
  }));
}

function getDefaultCordexVariable(hazardId: string): string {
  const mapping: Record<string, string> = {
    h1: 'temperature',
    h2: 'temperature',
    h3: 'temperature',
    h4: 'temperature',
    h5: 'temperature',
    h6: 'temperature',
    h7: 'wildfire-risk',
    h8: 'wind-speed',
    h9: 'precipitation',
    h10: 'wind-speed',
    h11: 'wind-speed',
    h12: 'wind-speed',
    h13: 'precipitation',
    h14: 'precipitation',
    h15: 'precipitation',
    h16: 'sea-level',
    h17: 'sea-level',
    h18: 'precipitation',
    h19: 'precipitation',
    h20: 'precipitation',
    h21: 'precipitation',
    h22: 'groundwater',
    h23: 'precipitation',
    h24: 'precipitation',
    h25: 'precipitation',
    h26: 'precipitation',
    h27: 'precipitation',
    h28: 'precipitation',
  };
  return mapping[hazardId] ?? 'temperature';
}

export function getDefaultSettings(): AppSettings {
  return {
    hazardDatasets: getDefaultHazardDatasets(),
    parametric: { ...defaultParametric },
    version: 1,
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const defaults = getDefaultSettings();
    return {
      hazardDatasets:
        parsed.hazardDatasets && Array.isArray(parsed.hazardDatasets)
          ? mergeHazardDatasets(defaults.hazardDatasets, parsed.hazardDatasets)
          : defaults.hazardDatasets,
      parametric: parsed.parametric
        ? { ...defaults.parametric, ...parsed.parametric }
        : defaults.parametric,
      version: parsed.version ?? 1,
    };
  } catch {
    return getDefaultSettings();
  }
}

function mergeHazardDatasets(
  defaults: HazardDatasetConfig[],
  saved: Partial<HazardDatasetConfig>[]
): HazardDatasetConfig[] {
  const byId = new Map(defaults.map((d) => [d.hazardId, { ...d }]));
  saved.forEach((s) => {
    if (s.hazardId && byId.has(s.hazardId)) {
      const curr = byId.get(s.hazardId)!;
      if (s.source) curr.source = s.source;
      if (s.customApiUrl !== undefined) curr.customApiUrl = s.customApiUrl;
      if (s.cordexVariable !== undefined) curr.cordexVariable = s.cordexVariable;
      if (typeof s.enabled === 'boolean') curr.enabled = s.enabled;
    }
  });
  return Array.from(byId.values());
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export function getHazardDatasetConfig(hazardId: string): HazardDatasetConfig | undefined {
  const s = loadSettings();
  return s.hazardDatasets.find((d) => d.hazardId === hazardId);
}

export function getParametricSettings(): ParametricSettings {
  return loadSettings().parametric;
}
