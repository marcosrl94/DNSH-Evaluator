/**
 * CORDEX Data Service
 * 
 * CORDEX (Coordinated Regional Climate Downscaling Experiment) provides
 * high-resolution climate projections for Europe and other regions.
 * 
 * This service provides access to CORDEX data for:
 * - Temperature projections
 * - Precipitation changes
 * - Wind speed changes
 * - Wildfire risk indices
 * - Other climate hazards
 * 
 * Data sources:
 * - CORDEX-EUR-11 (European domain, 0.11° resolution)
 * - CMIP5/CMIP6 GCMs downscaled with RCMs
 * - SSP scenarios (SSP1-2.6, SSP2-4.5, SSP5-8.5)
 */

import { ClimateScenario, HazardType } from '../types';

export interface CORDEXProjection {
  scenario: ClimateScenario;
  horizon: '2030' | '2050' | '2100';
  variable: string; // 'tas' (temperature), 'pr' (precipitation), 'sfcWind' (wind speed), etc.
  lat: number;
  lng: number;
  value: number;
  unit: string;
  changeFromBaseline?: number; // % change or absolute change
  modelEnsemble?: string; // e.g., 'mean', 'p10', 'p90'
}

export interface CORDEXHazardData {
  hazardId: string;
  hazardCode: string;
  projections: CORDEXProjection[];
  spatialResolution: string; // e.g., '0.11deg'
  dataSource: string; // e.g., 'CORDEX-EUR-11'
  lastUpdated: string;
}

/**
 * Get CORDEX data for a specific hazard and location
 * 
 * In production, this would fetch from:
 * - CORDEX ESGF (Earth System Grid Federation)
 * - Copernicus Climate Data Store (CDS)
 * - Regional climate service APIs
 * 
 * For now, returns realistic mock data based on CORDEX patterns
 */
export const getCORDEXData = async (
  hazardId: string,
  lat: number,
  lng: number,
  scenario: ClimateScenario,
  horizon: '2030' | '2050' | '2100'
): Promise<CORDEXProjection | null> => {
  // TODO: Replace with actual CORDEX API call
  // Example: fetch(`https://cordex-api.example.com/data?lat=${lat}&lng=${lng}&scenario=${scenario}&horizon=${horizon}&variable=${variable}`)
  
  // Mock implementation based on CORDEX patterns for Europe
  // These values are realistic approximations based on CORDEX-EUR-11 ensemble means
  
  const hazard = getHazardVariable(hazardId);
  if (!hazard) return null;

  // Base values for Spain (approximate) - Extended for all variables
  const baseValues: Record<string, { value: number; unit: string }> = {
    'wind-speed': { value: 4.5, unit: 'm/s' }, // Average wind speed
    'wildfire-risk': { value: 0.3, unit: 'index' }, // Fire Weather Index
    'temperature': { value: 15.5, unit: '°C' }, // Annual mean temperature
    'precipitation': { value: 600, unit: 'mm/year' }, // Annual precipitation
    'sea-level': { value: 0, unit: 'cm' }, // Sea level (baseline)
    'groundwater': { value: 50, unit: 'm' }, // Groundwater depth
  };

  const base = baseValues[hazard.variable] || { value: 0, unit: '' };

  // Scenario multipliers based on CORDEX projections for Southern Europe
  // Extended for all variables including sea level rise
  const scenarioMultipliers: Record<ClimateScenario, Record<string, Record<string, number>>> = {
    [ClimateScenario.SSP1_26]: {
      '2030': { 
        'wind-speed': 1.02, 
        'wildfire-risk': 1.05, 
        'temperature': 1.15, 
        'precipitation': 0.95,
        'sea-level': 8, // cm rise
        'groundwater': 0.98 // slight decrease
      },
      '2050': { 
        'wind-speed': 1.04, 
        'wildfire-risk': 1.10, 
        'temperature': 1.25, 
        'precipitation': 0.92,
        'sea-level': 15, // cm rise
        'groundwater': 0.95
      },
      '2100': { 
        'wind-speed': 1.06, 
        'wildfire-risk': 1.15, 
        'temperature': 1.35, 
        'precipitation': 0.88,
        'sea-level': 30, // cm rise
        'groundwater': 0.90
      },
    },
    [ClimateScenario.SSP2_45]: {
      '2030': { 
        'wind-speed': 1.03, 
        'wildfire-risk': 1.08, 
        'temperature': 1.20, 
        'precipitation': 0.93,
        'sea-level': 10,
        'groundwater': 0.97
      },
      '2050': { 
        'wind-speed': 1.06, 
        'wildfire-risk': 1.18, 
        'temperature': 1.40, 
        'precipitation': 0.88,
        'sea-level': 20,
        'groundwater': 0.93
      },
      '2100': { 
        'wind-speed': 1.10, 
        'wildfire-risk': 1.35, 
        'temperature': 1.70, 
        'precipitation': 0.82,
        'sea-level': 45,
        'groundwater': 0.85
      },
    },
    [ClimateScenario.SSP5_85]: {
      '2030': { 
        'wind-speed': 1.04, 
        'wildfire-risk': 1.12, 
        'temperature': 1.25, 
        'precipitation': 0.90,
        'sea-level': 12,
        'groundwater': 0.96
      },
      '2050': { 
        'wind-speed': 1.08, 
        'wildfire-risk': 1.28, 
        'temperature': 1.55, 
        'precipitation': 0.85,
        'sea-level': 25,
        'groundwater': 0.90
      },
      '2100': { 
        'wind-speed': 1.15, 
        'wildfire-risk': 1.60, 
        'temperature': 2.20, 
        'precipitation': 0.75,
        'sea-level': 70,
        'groundwater': 0.75
      },
    },
  };

  const multipliers = scenarioMultipliers[scenario]?.[horizon];
  if (!multipliers) {
    return null;
  }

  // Handle sea level differently (absolute change, not multiplier)
  let projectedValue: number;
  let changeFromBaseline: number;
  
  if (hazard.variable === 'sea-level') {
    projectedValue = multipliers[hazard.variable] || 0;
    changeFromBaseline = projectedValue; // Absolute change in cm
  } else {
    const multiplier = multipliers[hazard.variable] || 1.0;
    projectedValue = base.value * multiplier;
    changeFromBaseline = ((projectedValue - base.value) / base.value) * 100;
  }

  return {
    scenario,
    horizon,
    variable: hazard.variable,
    lat,
    lng,
    value: projectedValue,
    unit: base.unit,
    changeFromBaseline,
    modelEnsemble: 'mean',
  };
};

/**
 * Get CORDEX spatial data for a hazard (polygon/raster data)
 * Returns hazard intensity polygons for visualization
 */
export const getCORDEXSpatialData = async (
  hazardId: string,
  scenario: ClimateScenario,
  horizon: '2030' | '2050' | '2100',
  bbox?: { north: number; south: number; east: number; west: number }
): Promise<Array<{ polygon: [number, number][]; intensity: number }>> => {
  // TODO: Replace with actual CORDEX spatial data API
  // This would return raster or polygon data for the hazard
  
  // Mock implementation: returns simplified polygons based on hazard type
  const hazard = getHazardVariable(hazardId);
  if (!hazard) return [];

  // Generate realistic polygons for Spain region
  // In production, these would come from CORDEX NetCDF files processed server-side
  const basePolygons: Array<{ polygon: [number, number][]; baseIntensity: number }> = [
    {
      polygon: [
        [36.0, -6.0],
        [37.0, -5.5],
        [37.5, -4.5],
        [37.0, -4.0],
        [36.5, -4.5],
        [36.0, -5.5],
      ],
      baseIntensity: 0.6,
    },
    {
      polygon: [
        [38.0, -2.0],
        [39.0, -1.5],
        [39.5, -0.5],
        [39.0, 0.0],
        [38.5, -0.5],
        [38.0, -1.5],
      ],
      baseIntensity: 0.5,
    },
  ];

  // Apply scenario and horizon multipliers
  const multipliers: Record<ClimateScenario, Record<string, number>> = {
    [ClimateScenario.SSP1_26]: { '2030': 1.05, '2050': 1.10, '2100': 1.15 },
    [ClimateScenario.SSP2_45]: { '2030': 1.08, '2050': 1.18, '2100': 1.35 },
    [ClimateScenario.SSP5_85]: { '2030': 1.12, '2050': 1.28, '2100': 1.60 },
  };

  const multiplier = multipliers[scenario]?.[horizon] || 1.0;

  return basePolygons.map(p => ({
    polygon: p.polygon,
    intensity: Math.min(1.0, p.baseIntensity * multiplier),
  }));
};

/**
 * Map hazard IDs to CORDEX variables
 * Extended mapping for all 28 EU Taxonomy hazards
 */
function getHazardVariable(hazardId: string): { variable: string; name: string } | null {
  const hazardMap: Record<string, { variable: string; name: string }> = {
    // Temperature hazards
    'h1': { variable: 'temperature', name: 'Temperature' }, // TEMP-01: Changing temperature
    'h2': { variable: 'temperature', name: 'Heat Stress' }, // TEMP-02: Heat stress
    'h3': { variable: 'temperature', name: 'Temperature Variability' }, // TEMP-03: Temperature variability
    'h4': { variable: 'temperature', name: 'Permafrost Thawing' }, // TEMP-04: Permafrost thawing
    'h5': { variable: 'temperature', name: 'Heat Wave' }, // TEMP-05: Heat wave
    'h6': { variable: 'temperature', name: 'Cold Wave' }, // TEMP-06: Cold wave/frost
    'h7': { variable: 'wildfire-risk', name: 'Wildfire Risk' }, // TEMP-07: Wildfire
    
    // Wind hazards
    'h8': { variable: 'wind-speed', name: 'Wind Speed' }, // WIND-01: Changing wind patterns
    'h9': { variable: 'precipitation', name: 'Precipitation Variability' }, // WIND-02: Precipitation/hydrological variability
    'h10': { variable: 'wind-speed', name: 'Cyclone Wind' }, // WIND-03: Cyclone, hurricane, typhoon
    'h11': { variable: 'wind-speed', name: 'Storm Wind' }, // WIND-04: Storm
    'h12': { variable: 'wind-speed', name: 'Tornado Wind' }, // WIND-05: Tornado
    
    // Water hazards
    'h13': { variable: 'precipitation', name: 'Precipitation Patterns' }, // WAT-01: Changing precipitation
    'h14': { variable: 'precipitation', name: 'Hydrological Variability' }, // WAT-02: Hydrological variability
    'h15': { variable: 'precipitation', name: 'Flood Risk' }, // WAT-03: Flood (riverine)
    'h16': { variable: 'sea-level', name: 'Coastal Flood' }, // WAT-04: Coastal flood
    'h17': { variable: 'sea-level', name: 'Sea Level Rise' }, // WAT-05: Sea level rise
    'h18': { variable: 'precipitation', name: 'Water Scarcity' }, // WAT-06: Water scarcity
    'h19': { variable: 'precipitation', name: 'Drought' }, // WAT-07: Drought
    
    // Solid mass hazards
    'h20': { variable: 'precipitation', name: 'Landslide Risk' }, // SOL-01: Landslide
    'h21': { variable: 'precipitation', name: 'Avalanche Risk' }, // SOL-02: Avalanche
    'h22': { variable: 'groundwater', name: 'Subsidence' }, // SOL-03: Subsidence
  };

  return hazardMap[hazardId] || null;
}

/**
 * Get CORDEX metadata for a dataset
 */
export const getCORDEXMetadata = (hazardId: string): CORDEXHazardData | null => {
  const hazard = getHazardVariable(hazardId);
  if (!hazard) return null;

  return {
    hazardId,
    hazardCode: hazardId,
    projections: [],
    spatialResolution: '0.11deg',
    dataSource: 'CORDEX-EUR-11',
    lastUpdated: new Date().toISOString(),
  };
};
