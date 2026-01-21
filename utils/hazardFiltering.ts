import { HazardType, ClimateScenario, ClimateScenarioConfig, ClimateMetrics, HazardThreshold, Asset } from '../types';
import { getScenarioById } from '../constants/climateScenarios';

/**
 * Check if a hazard exceeds its threshold for a given scenario and horizon
 */
export const checkHazardThreshold = (
  hazard: HazardType,
  scenario: ClimateScenario,
  horizon: '2030' | '2050' | '2100',
  asset?: Asset
): { exceeds: boolean; value: number; threshold: number; metric: string } => {
  if (!hazard.threshold) {
    // If no threshold defined, consider it material if intensity > 0.3
    const scenarioConfig = getScenarioById(scenario);
    const metrics = horizon === '2030' ? scenarioConfig?.metrics2030 :
                    horizon === '2050' ? scenarioConfig?.metrics2050 :
                    scenarioConfig?.metrics2100;
    
    if (!metrics) {
      return { exceeds: false, value: 0, threshold: 0, metric: 'N/A' };
    }
    
    // Default: use intensity from scenario projections
    const projection = hazard.scenarioProjections?.[scenario];
    const intensity = horizon === '2030' ? (projection?.intensity2050 || 0) * 0.6 :
                      horizon === '2050' ? (projection?.intensity2050 || 0) :
                      (projection?.intensity2100 || 0);
    
    return {
      exceeds: intensity > 0.3,
      value: intensity,
      threshold: 0.3,
      metric: 'intensity'
    };
  }
  
  const scenarioConfig = getScenarioById(scenario);
  if (!scenarioConfig) {
    return { exceeds: false, value: 0, threshold: 0, metric: hazard.threshold.metric };
  }
  
  const metrics = horizon === '2030' ? scenarioConfig.metrics2030 :
                  horizon === '2050' ? scenarioConfig.metrics2050 :
                  scenarioConfig.metrics2100;
  
  const metricValue = metrics[hazard.threshold.metric];
  const threshold = hazard.threshold.thresholdValue;
  
  let exceeds = false;
  switch (hazard.threshold.comparison) {
    case '>':
      exceeds = metricValue > threshold;
      break;
    case '<':
      exceeds = metricValue < threshold;
      break;
    case '>=':
      exceeds = metricValue >= threshold;
      break;
    case '<=':
      exceeds = metricValue <= threshold;
      break;
    case '==':
      exceeds = Math.abs(metricValue - threshold) < 0.01;
      break;
  }
  
  return {
    exceeds,
    value: metricValue,
    threshold,
    metric: hazard.threshold.metric
  };
};

/**
 * Filter hazards based on thresholds and asset characteristics
 */
export const filterRelevantHazards = (
  hazards: HazardType[],
  scenario: ClimateScenario,
  horizon: '2030' | '2050' | '2100',
  asset?: Asset
): HazardType[] => {
  return hazards.filter(hazard => {
    // Check threshold
    const thresholdCheck = checkHazardThreshold(hazard, scenario, horizon, asset);
    
    // If threshold is exceeded, hazard is relevant
    if (thresholdCheck.exceeds) {
      return true;
    }
    
    // Also check asset-specific scope if available
    if (asset?.attributes.adaptationHazardScope) {
      const scope = asset.attributes.adaptationHazardScope[hazard.id];
      if (scope === 'In Scope') {
        return true;
      }
      if (scope === 'Out of Scope') {
        return false;
      }
    }
    
    // Default: show if intensity > 0.2 (low threshold for visibility)
    return thresholdCheck.value > 0.2;
  });
};

/**
 * Get metrics comparison across scenarios for a specific hazard
 */
export const getHazardMetricsComparison = (
  hazard: HazardType,
  horizon: '2030' | '2050' | '2100'
): Array<{ scenario: ClimateScenario; metrics: ClimateMetrics; thresholdCheck: ReturnType<typeof checkHazardThreshold> }> => {
  const scenarios = [ClimateScenario.SSP1_26, ClimateScenario.SSP2_45, ClimateScenario.SSP5_85];
  
  return scenarios.map(scenario => {
    const scenarioConfig = getScenarioById(scenario);
    const metrics = horizon === '2030' ? scenarioConfig?.metrics2030 :
                    horizon === '2050' ? scenarioConfig?.metrics2050 :
                    scenarioConfig?.metrics2100;
    
    if (!metrics) {
      throw new Error(`Metrics not found for scenario ${scenario} and horizon ${horizon}`);
    }
    
    return {
      scenario,
      metrics,
      thresholdCheck: checkHazardThreshold(hazard, scenario, horizon)
    };
  });
};
