import { ClimateScenario, ClimateScenarioConfig, ClimateMetrics } from '../types';

/**
 * Climate Scenarios Configuration
 * Based on IPCC AR6 and CMIP6 models
 * SSP1-2.6: Optimistic pathway (sustainable development, low emissions)
 * SSP2-4.5: Baseline pathway (intermediate emissions, middle-of-the-road)
 * SSP5-8.5: Pessimistic pathway (fossil-fueled development, high emissions)
 */

// Helper to create metrics for a scenario
const createMetrics = (
  tempIncrease: number,
  seaLevelRise: number,
  precipChange: number,
  multiplier: number = 1.0
): ClimateMetrics => ({
  temperatureIncrease: tempIncrease,
  maxTemperatureIncrease: tempIncrease * 1.5,
  heatWaveFrequency: Math.round(5 + tempIncrease * 3 * multiplier),
  heatWaveIntensity: tempIncrease * 0.8,
  coldWaveFrequency: Math.max(0, Math.round(3 - tempIncrease * 1.5)),
  
  precipitationChange: precipChange,
  heavyPrecipitationFrequency: Math.round(8 + Math.abs(precipChange) * 0.5 * multiplier),
  heavyPrecipitationIntensity: Math.abs(precipChange) * 2,
  droughtFrequency: precipChange < 0 ? Math.round(4 + Math.abs(precipChange) * 0.3 * multiplier) : 2,
  droughtSeverity: precipChange < 0 ? Math.min(1, Math.abs(precipChange) / 20) : 0.2,
  
  seaLevelRise: seaLevelRise,
  coastalErosionRate: seaLevelRise * 0.05,
  stormSurgeHeight: seaLevelRise * 0.1,
  
  windSpeedIncrease: multiplier * 5,
  extremeWindFrequency: Math.round(2 + multiplier * 2),
  cycloneFrequency: Math.round(1 + multiplier * 1.5),
  
  wildfireRisk: Math.min(1, 0.3 + tempIncrease * 0.15 + Math.abs(precipChange) * 0.02),
  soilMoistureChange: precipChange * 0.8,
  permafrostThawDepth: 0, // Only relevant for northern regions
  oceanAcidification: tempIncrease * 0.05,
});

export const CLIMATE_SCENARIOS: ClimateScenarioConfig[] = [
  {
    id: ClimateScenario.SSP1_26,
    label: 'SSP1-2.6 (Optimistic)',
    description: 'Sustainable development pathway. Rapid reduction in emissions, strong climate policies, and technological innovation.',
    rcpEquivalent: 'RCP 2.6',
    temperatureIncrease2050: 1.4,
    temperatureIncrease2100: 1.8,
    seaLevelRise2050: 18,
    seaLevelRise2100: 44,
    precipitationChange2050: -2,
    color: '#10b981',
    metrics2030: createMetrics(0.84, 10.8, -1.2, 0.6),
    metrics2050: createMetrics(1.4, 18, -2, 1.0),
    metrics2100: createMetrics(1.8, 44, -2.5, 1.2),
  },
  {
    id: ClimateScenario.SSP2_45,
    label: 'SSP2-4.5 (Baseline)',
    description: 'Middle-of-the-road pathway. Moderate emissions reduction, continuation of current trends with some climate action.',
    rcpEquivalent: 'RCP 4.5',
    temperatureIncrease2050: 1.8,
    temperatureIncrease2100: 2.7,
    seaLevelRise2050: 22,
    seaLevelRise2100: 63,
    precipitationChange2050: -5,
    color: '#3b82f6',
    metrics2030: createMetrics(1.08, 13.2, -3, 0.6),
    metrics2050: createMetrics(1.8, 22, -5, 1.0),
    metrics2100: createMetrics(2.7, 63, -6, 1.5),
  },
  {
    id: ClimateScenario.SSP5_85,
    label: 'SSP5-8.5 (Pessimistic)',
    description: 'Fossil-fueled development pathway. High emissions, limited climate action, rapid economic growth based on fossil fuels.',
    rcpEquivalent: 'RCP 8.5',
    temperatureIncrease2050: 2.4,
    temperatureIncrease2100: 4.4,
    seaLevelRise2050: 28,
    seaLevelRise2100: 101,
    precipitationChange2050: -10,
    color: '#ef4444',
    metrics2030: createMetrics(1.44, 16.8, -6, 0.6),
    metrics2050: createMetrics(2.4, 28, -10, 1.0),
    metrics2100: createMetrics(4.4, 101, -12, 1.8),
  },
];

/**
 * Get scenario by ID
 */
export const getScenarioById = (id: ClimateScenario): ClimateScenarioConfig | undefined => {
  return CLIMATE_SCENARIOS.find(s => s.id === id);
};

/**
 * Get scenario label for display
 */
export const getScenarioLabel = (id: ClimateScenario): string => {
  return getScenarioById(id)?.label || id;
};
