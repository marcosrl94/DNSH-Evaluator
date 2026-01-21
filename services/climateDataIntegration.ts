/**
 * Climate Data Integration Service
 * 
 * Centralized service for integrating multiple climate datasets:
 * - CORDEX (regional climate projections)
 * - WRI Aqueduct (water risk data)
 * - Copernicus Climate Data Store (future)
 * - Other relevant datasets
 * 
 * Provides unified interface for accessing climate data across the application
 */

import { Asset, HazardType, ClimateScenario, WaterRiskLevel } from '../types';
import { getCORDEXData, CORDEXProjection } from './cordexData';
import { getWRIAqueductData, WRIAqueductData } from './wriAqueduct';
import { getScenarioById } from '../constants/climateScenarios';

export interface IntegratedClimateData {
  assetId: string;
  lat: number;
  lng: number;
  
  // CORDEX Data
  cordexProjections: {
    [hazardId: string]: {
      [scenario: string]: {
        [horizon: string]: CORDEXProjection | null;
      };
    };
  };
  
  // WRI Aqueduct Data
  aqueductData: WRIAqueductData | null;
  
  // Metadata
  dataQuality: {
    cordex: 'high' | 'medium' | 'low' | 'unavailable';
    aqueduct: 'high' | 'medium' | 'low' | 'unavailable';
    overall: 'high' | 'medium' | 'low';
  };
  
  lastUpdated: string;
}

/**
 * Get integrated climate data for an asset
 * Fetches from multiple sources and combines into unified structure
 */
export const getIntegratedClimateData = async (
  asset: Asset,
  hazards: HazardType[],
  scenarios: ClimateScenario[] = [ClimateScenario.SSP1_26, ClimateScenario.SSP2_45, ClimateScenario.SSP5_85],
  horizons: Array<'2030' | '2050' | '2100'> = ['2030', '2050', '2100']
): Promise<IntegratedClimateData> => {
  const cordexProjections: IntegratedClimateData['cordexProjections'] = {};
  let cordexQuality: 'high' | 'medium' | 'low' | 'unavailable' = 'unavailable';
  let aqueductData: WRIAqueductData | null = null;
  let aqueductQuality: 'high' | 'medium' | 'low' | 'unavailable' = 'unavailable';

  // Fetch CORDEX data for relevant hazards
  const cordexPromises: Promise<void>[] = [];
  let cordexSuccessCount = 0;
  let cordexTotalCount = 0;

  hazards.forEach(hazard => {
    if (!cordexProjections[hazard.id]) {
      cordexProjections[hazard.id] = {};
    }

    scenarios.forEach(scenario => {
      if (!cordexProjections[hazard.id][scenario]) {
        cordexProjections[hazard.id][scenario] = {};
      }

      horizons.forEach(horizon => {
        cordexTotalCount++;
        const promise = getCORDEXData(hazard.id, asset.lat, asset.lng, scenario, horizon)
          .then(projection => {
            if (projection) {
              cordexProjections[hazard.id][scenario][horizon] = projection;
              cordexSuccessCount++;
            } else {
              cordexProjections[hazard.id][scenario][horizon] = null;
            }
          })
          .catch(() => {
            cordexProjections[hazard.id][scenario][horizon] = null;
          });
        cordexPromises.push(promise);
      });
    });
  });

  // Fetch WRI Aqueduct data
  const aqueductPromise = getWRIAqueductData(asset.lat, asset.lng)
    .then(data => {
      aqueductData = data;
      aqueductQuality = data ? 'high' : 'unavailable';
    })
    .catch(() => {
      aqueductQuality = 'unavailable';
    });

  // Wait for all data to load
  await Promise.all([...cordexPromises, aqueductPromise]);

  // Determine data quality
  const cordexSuccessRate = cordexTotalCount > 0 ? cordexSuccessCount / cordexTotalCount : 0;
  if (cordexSuccessRate >= 0.8) {
    cordexQuality = 'high';
  } else if (cordexSuccessRate >= 0.5) {
    cordexQuality = 'medium';
  } else if (cordexSuccessRate > 0) {
    cordexQuality = 'low';
  }

  // Determine overall quality
  let overallQuality: 'high' | 'medium' | 'low' = 'low';
  if (cordexQuality === 'high' && aqueductQuality === 'high') {
    overallQuality = 'high';
  } else if (cordexQuality === 'medium' || aqueductQuality === 'medium') {
    overallQuality = 'medium';
  }

  return {
    assetId: asset.id,
    lat: asset.lat,
    lng: asset.lng,
    cordexProjections,
    aqueductData,
    dataQuality: {
      cordex: cordexQuality,
      aqueduct: aqueductQuality,
      overall: overallQuality
    },
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Get CORDEX projection for a specific hazard, scenario, and horizon
 * Uses cached integrated data if available
 */
export const getCORDEXProjectionForHazard = (
  integratedData: IntegratedClimateData,
  hazardId: string,
  scenario: ClimateScenario,
  horizon: '2030' | '2050' | '2100'
): CORDEXProjection | null => {
  return integratedData.cordexProjections[hazardId]?.[scenario]?.[horizon] || null;
};

/**
 * Get enhanced hazard intensity using integrated climate data
 * Combines CORDEX projections with scenario-based calculations
 */
export const getEnhancedHazardIntensity = (
  hazard: HazardType,
  asset: Asset,
  scenario: ClimateScenario,
  horizon: '2030' | '2050' | '2100',
  integratedData?: IntegratedClimateData
): {
  intensity: number;
  dataSource: 'cordex' | 'scenario' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  metrics: {
    value: number;
    unit: string;
    changeFromBaseline?: number;
  };
} => {
  // Try to use CORDEX data first
  if (integratedData) {
    const cordexProjection = getCORDEXProjectionForHazard(integratedData, hazard.id, scenario, horizon);
    if (cordexProjection) {
      // Convert CORDEX projection to intensity (0-1 scale)
      let intensity = 0;
      
      if (hazard.category === 'Temperature-related') {
        // Temperature intensity based on change from baseline
        const tempChange = cordexProjection.changeFromBaseline || 0;
        intensity = Math.min(1, Math.max(0, tempChange / 50)); // Normalize to 0-1
      } else if (hazard.category === 'Water-related') {
        // Water intensity based on precipitation change or sea level rise
        if (hazard.id === 'h17' || hazard.id === 'h16') {
          // Sea level rise
          const slr = cordexProjection.value;
          intensity = Math.min(1, Math.max(0, slr / 100)); // Normalize to 0-1 (100cm = max)
        } else {
          // Precipitation
          const precipChange = Math.abs(cordexProjection.changeFromBaseline || 0);
          intensity = Math.min(1, Math.max(0, precipChange / 40)); // Normalize to 0-1
        }
      } else if (hazard.category === 'Wind-related') {
        // Wind intensity
        const windChange = cordexProjection.changeFromBaseline || 0;
        intensity = Math.min(1, Math.max(0, windChange / 30)); // Normalize to 0-1
      }

      return {
        intensity,
        dataSource: 'cordex',
        confidence: integratedData.dataQuality.cordex === 'high' ? 'high' : 'medium',
        metrics: {
          value: cordexProjection.value,
          unit: cordexProjection.unit,
          changeFromBaseline: cordexProjection.changeFromBaseline
        }
      };
    }
  }

  // Fall back to scenario-based calculation
  const scenarioConfig = getScenarioById(scenario);
  if (scenarioConfig) {
    const metrics = horizon === '2030' ? scenarioConfig.metrics2030 :
                    horizon === '2050' ? scenarioConfig.metrics2050 :
                    scenarioConfig.metrics2100;

    let intensity = 0;
    let value = 0;
    let unit = '';

    if (hazard.category === 'Temperature-related') {
      value = metrics.temperatureIncrease;
      unit = '°C';
      intensity = Math.min(1, Math.max(0, value / 5)); // Normalize to 0-1
    } else if (hazard.category === 'Water-related') {
      if (hazard.id === 'h17' || hazard.id === 'h16') {
        value = metrics.seaLevelRise;
        unit = 'cm';
        intensity = Math.min(1, Math.max(0, value / 100));
      } else {
        value = metrics.precipitationChange;
        unit = '%';
        intensity = Math.min(1, Math.max(0, Math.abs(value) / 40));
      }
    } else if (hazard.category === 'Wind-related') {
      value = metrics.windSpeedIncrease;
      unit = '%';
      intensity = Math.min(1, Math.max(0, value / 30));
    }

    return {
      intensity,
      dataSource: 'scenario',
      confidence: 'medium',
      metrics: { value, unit }
    };
  }

  // Final fallback
  return {
    intensity: 0.3, // Default moderate intensity
    dataSource: 'fallback',
    confidence: 'low',
    metrics: { value: 0, unit: 'N/A' }
  };
};

/**
 * Get water risk indicators from WRI Aqueduct
 * Enhanced with asset-specific context
 */
export const getWaterRiskIndicators = (
  integratedData: IntegratedClimateData,
  asset: Asset
): {
  indicators: Array<{
    name: string;
    value: number;
    level: 'Low' | 'Medium' | 'High' | 'Very High';
    relevance: 'high' | 'medium' | 'low';
    impact: string;
  }>;
  overallRisk: 'Low' | 'Medium' | 'High' | 'Very High';
} => {
  if (!integratedData.aqueductData) {
    return {
      indicators: [],
      overallRisk: 'Medium'
    };
  }

  const aqueduct = integratedData.aqueductData;
  const indicators = aqueduct.indicators.map(ind => {
    // Determine relevance based on asset characteristics
    let relevance: 'high' | 'medium' | 'low' = 'medium';
    let impact = '';

    if (ind.indicator === 'Baseline Water Stress' || ind.indicator === 'Water Scarcity') {
      relevance = asset.attributes.waterDependency === 'High' ? 'high' : 
                  asset.attributes.waterDependency === 'Medium' ? 'medium' : 'low';
      impact = asset.attributes.waterDependency === 'High' 
        ? 'High water dependency makes this asset vulnerable to water stress'
        : 'Moderate impact expected';
    } else if (ind.indicator === 'Riverine Flood Risk') {
      relevance = asset.attributes.elevationMeters < 50 ? 'high' : 'medium';
      impact = asset.attributes.elevationMeters < 50
        ? 'Low elevation increases flood vulnerability'
        : 'Moderate flood risk';
    } else if (ind.indicator === 'Drought Risk') {
      relevance = asset.attributes.waterDependency === 'High' ? 'high' : 'medium';
      impact = 'Drought can impact water availability';
    }

    const level = ind.riskLevel === WaterRiskLevel.VERY_HIGH ? 'Very High' :
                  ind.riskLevel === WaterRiskLevel.HIGH ? 'High' :
                  ind.riskLevel === WaterRiskLevel.MODERATE ? 'Medium' : 'Low';

    return {
      name: ind.indicator,
      value: ind.value,
      level,
      relevance,
      impact
    };
  });

  const overallRisk = aqueduct.overallRisk === WaterRiskLevel.VERY_HIGH ? 'Very High' :
                      aqueduct.overallRisk === WaterRiskLevel.HIGH ? 'High' :
                      aqueduct.overallRisk === WaterRiskLevel.MODERATE ? 'Medium' : 'Low';

  return {
    indicators,
    overallRisk
  };
};
