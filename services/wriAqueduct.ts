/**
 * WRI Aqueduct Water Risk Data Service
 * 
 * World Resources Institute (WRI) Aqueduct Water Risk Atlas provides
 * comprehensive water risk data globally.
 * 
 * This service provides access to Aqueduct indicators:
 * - Baseline Water Stress
 * - Interannual Variability
 * - Seasonal Variability
 * - Groundwater Stress
 * - Drought Risk
 * - Riverine Flood Risk
 * - Coastal Flood Risk
 * - Water Quality
 * 
 * Data sources:
 * - WRI Aqueduct Water Risk Atlas (v3.0)
 * - Aqueduct 3.0 Country Rankings
 * - Aqueduct 3.0 Basin Rankings
 */

import { WaterRiskZone, WaterRiskType, WaterRiskLevel } from '../types';

export interface WRIAqueductIndicator {
  indicator: string;
  value: number;
  unit: string;
  riskLevel: WaterRiskLevel;
  percentile: number; // Global percentile (0-100)
  category: string; // e.g., 'Low', 'Low-Medium', 'Medium-High', 'High', 'Extremely High'
}

export interface WRIAqueductData {
  lat: number;
  lng: number;
  country: string;
  basin?: string;
  subbasin?: string;
  indicators: WRIAqueductIndicator[];
  overallRisk: WaterRiskLevel;
  lastUpdated: string;
}

/**
 * Get WRI Aqueduct data for a specific location
 * 
 * In production, this would fetch from:
 * - WRI Aqueduct API (if available)
 * - WRI Aqueduct data files (GeoTIFF/NetCDF)
 * - Processed Aqueduct datasets
 * 
 * For now, returns realistic mock data based on Aqueduct patterns
 */
export const getWRIAqueductData = async (
  lat: number,
  lng: number
): Promise<WRIAqueductData | null> => {
  // TODO: Replace with actual WRI Aqueduct API call
  // Example: fetch(`https://aqueduct.wri.org/api/v1/data?lat=${lat}&lng=${lng}`)
  
  // Mock implementation based on Aqueduct patterns for Spain
  // These values are realistic approximations based on Aqueduct 3.0 data
  
  // Determine region/basin based on coordinates
  const region = getRegionFromCoordinates(lat, lng);
  
  // Baseline Water Stress (0-5 scale, where >4 = Extremely High)
  const baselineWaterStress = getBaselineWaterStress(region);
  
  // Groundwater Stress (0-5 scale)
  const groundwaterStress = getGroundwaterStress(region);
  
  // Drought Risk (0-5 scale)
  const droughtRisk = getDroughtRisk(region);
  
  // Interannual Variability (0-1 scale)
  const interannualVariability = getInterannualVariability(region);
  
  // Seasonal Variability (0-1 scale)
  const seasonalVariability = getSeasonalVariability(region);
  
  // Riverine Flood Risk (0-5 scale)
  const riverineFloodRisk = getRiverineFloodRisk(region);
  
  // Water Quality (0-5 scale, where higher = worse)
  const waterQuality = getWaterQuality(region);

  const indicators: WRIAqueductIndicator[] = [
    {
      indicator: 'Baseline Water Stress',
      value: baselineWaterStress.value,
      unit: 'score (0-5)',
      riskLevel: baselineWaterStress.level,
      percentile: baselineWaterStress.percentile,
      category: baselineWaterStress.category,
    },
    {
      indicator: 'Groundwater Stress',
      value: groundwaterStress.value,
      unit: 'score (0-5)',
      riskLevel: groundwaterStress.level,
      percentile: groundwaterStress.percentile,
      category: groundwaterStress.category,
    },
    {
      indicator: 'Drought Risk',
      value: droughtRisk.value,
      unit: 'score (0-5)',
      riskLevel: droughtRisk.level,
      percentile: droughtRisk.percentile,
      category: droughtRisk.category,
    },
    {
      indicator: 'Interannual Variability',
      value: interannualVariability.value,
      unit: 'score (0-1)',
      riskLevel: interannualVariability.level,
      percentile: interannualVariability.percentile,
      category: interannualVariability.category,
    },
    {
      indicator: 'Seasonal Variability',
      value: seasonalVariability.value,
      unit: 'score (0-1)',
      riskLevel: seasonalVariability.level,
      percentile: seasonalVariability.percentile,
      category: seasonalVariability.category,
    },
    {
      indicator: 'Riverine Flood Risk',
      value: riverineFloodRisk.value,
      unit: 'score (0-5)',
      riskLevel: riverineFloodRisk.level,
      percentile: riverineFloodRisk.percentile,
      category: riverineFloodRisk.category,
    },
    {
      indicator: 'Water Quality',
      value: waterQuality.value,
      unit: 'score (0-5)',
      riskLevel: waterQuality.level,
      percentile: waterQuality.percentile,
      category: waterQuality.category,
    },
  ];

  // Calculate overall risk (weighted average)
  const overallRisk = calculateOverallRisk(indicators);

  return {
    lat,
    lng,
    country: 'Spain',
    basin: region.basin,
    subbasin: region.subbasin,
    indicators,
    overallRisk,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Get WRI Aqueduct spatial data (polygons/zones)
 */
export const getWRIAqueductZones = async (
  bbox?: { north: number; south: number; east: number; west: number }
): Promise<WaterRiskZone[]> => {
  // TODO: Replace with actual WRI Aqueduct spatial data API
  // This would return polygon data for water risk zones
  
  // For now, returns enhanced zones based on Aqueduct data patterns
  // In production, these would come from Aqueduct basin/sub-basin shapefiles
  
  return []; // Will be populated from actual data source
};

// Helper functions for mock data generation

interface Region {
  name: string;
  basin?: string;
  subbasin?: string;
}

function getRegionFromCoordinates(lat: number, lng: number): Region {
  // Simplified region detection for Spain
  if (lat < 37.5 && lng > -6.5) return { name: 'Guadalquivir', basin: 'Guadalquivir' };
  if (lat < 38.5 && lng > -1.5) return { name: 'Segura', basin: 'Segura' };
  if (lat < 40.0 && lng > -1.0) return { name: 'Júcar', basin: 'Júcar' };
  if (lat < 37.5 && lng > -4.5) return { name: 'Mediterranean Coast', basin: 'Mediterranean' };
  return { name: 'Central Spain', basin: 'Tagus' };
}

function getBaselineWaterStress(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  const stressMap: Record<string, { value: number; level: WaterRiskLevel; percentile: number; category: string }> = {
    'Segura': { value: 4.8, level: WaterRiskLevel.VERY_HIGH, percentile: 95, category: 'Extremely High' },
    'Guadalquivir': { value: 4.2, level: WaterRiskLevel.HIGH, percentile: 88, category: 'High' },
    'Júcar': { value: 4.0, level: WaterRiskLevel.HIGH, percentile: 85, category: 'High' },
    'Mediterranean Coast': { value: 4.0, level: WaterRiskLevel.HIGH, percentile: 85, category: 'High' },
    'Central Spain': { value: 3.2, level: WaterRiskLevel.MODERATE, percentile: 70, category: 'Medium-High' },
  };
  return stressMap[region.name] || { value: 2.5, level: WaterRiskLevel.MODERATE, percentile: 60, category: 'Medium' };
}

function getGroundwaterStress(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  const stressMap: Record<string, { value: number; level: WaterRiskLevel; percentile: number; category: string }> = {
    'Segura': { value: 4.5, level: WaterRiskLevel.VERY_HIGH, percentile: 92, category: 'Extremely High' },
    'Guadalquivir': { value: 3.8, level: WaterRiskLevel.HIGH, percentile: 85, category: 'High' },
    'Mediterranean Coast': { value: 4.0, level: WaterRiskLevel.HIGH, percentile: 87, category: 'High' },
    'Júcar': { value: 3.5, level: WaterRiskLevel.HIGH, percentile: 80, category: 'High' },
    'Central Spain': { value: 2.5, level: WaterRiskLevel.MODERATE, percentile: 65, category: 'Medium' },
  };
  return stressMap[region.name] || { value: 2.0, level: WaterRiskLevel.LOW, percentile: 50, category: 'Low-Medium' };
}

function getDroughtRisk(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  const riskMap: Record<string, { value: number; level: WaterRiskLevel; percentile: number; category: string }> = {
    'Segura': { value: 4.2, level: WaterRiskLevel.HIGH, percentile: 90, category: 'High' },
    'Guadalquivir': { value: 3.8, level: WaterRiskLevel.HIGH, percentile: 85, category: 'High' },
    'Júcar': { value: 3.5, level: WaterRiskLevel.HIGH, percentile: 82, category: 'High' },
    'Mediterranean Coast': { value: 3.6, level: WaterRiskLevel.HIGH, percentile: 83, category: 'High' },
    'Central Spain': { value: 2.8, level: WaterRiskLevel.MODERATE, percentile: 70, category: 'Medium-High' },
  };
  return riskMap[region.name] || { value: 2.0, level: WaterRiskLevel.MODERATE, percentile: 60, category: 'Medium' };
}

function getInterannualVariability(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  // Spain generally has moderate-high interannual variability
  return { value: 0.45, level: WaterRiskLevel.MODERATE, percentile: 75, category: 'Medium-High' };
}

function getSeasonalVariability(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  // Mediterranean climate has high seasonal variability
  if (region.name.includes('Mediterranean') || region.name === 'Segura' || region.name === 'Júcar') {
    return { value: 0.65, level: WaterRiskLevel.HIGH, percentile: 85, category: 'High' };
  }
  return { value: 0.50, level: WaterRiskLevel.MODERATE, percentile: 70, category: 'Medium-High' };
}

function getRiverineFloodRisk(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  // Lower risk in arid regions, higher in river basins
  if (region.name === 'Segura') {
    return { value: 2.0, level: WaterRiskLevel.LOW, percentile: 40, category: 'Low-Medium' };
  }
  if (region.name === 'Guadalquivir' || region.name === 'Júcar') {
    return { value: 3.0, level: WaterRiskLevel.MODERATE, percentile: 65, category: 'Medium-High' };
  }
  return { value: 2.5, level: WaterRiskLevel.MODERATE, percentile: 55, category: 'Medium' };
}

function getWaterQuality(region: Region): { value: number; level: WaterRiskLevel; percentile: number; category: string } {
  // Generally moderate water quality in Spain
  const qualityMap: Record<string, { value: number; level: WaterRiskLevel; percentile: number; category: string }> = {
    'Segura': { value: 3.2, level: WaterRiskLevel.MODERATE, percentile: 70, category: 'Medium-High' },
    'Guadalquivir': { value: 2.8, level: WaterRiskLevel.MODERATE, percentile: 65, category: 'Medium' },
    'Júcar': { value: 2.5, level: WaterRiskLevel.MODERATE, percentile: 60, category: 'Medium' },
    'Mediterranean Coast': { value: 3.0, level: WaterRiskLevel.MODERATE, percentile: 68, category: 'Medium-High' },
    'Central Spain': { value: 2.2, level: WaterRiskLevel.LOW, percentile: 50, category: 'Low-Medium' },
  };
  return qualityMap[region.name] || { value: 2.0, level: WaterRiskLevel.LOW, percentile: 45, category: 'Low-Medium' };
}

function calculateOverallRisk(indicators: WRIAqueductIndicator[]): WaterRiskLevel {
  // Weighted average: Baseline Water Stress (40%), Groundwater Stress (25%), Drought Risk (20%), Others (15%)
  const weights: Record<string, number> = {
    'Baseline Water Stress': 0.40,
    'Groundwater Stress': 0.25,
    'Drought Risk': 0.20,
    'Interannual Variability': 0.05,
    'Seasonal Variability': 0.05,
    'Riverine Flood Risk': 0.03,
    'Water Quality': 0.02,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  indicators.forEach(ind => {
    const weight = weights[ind.indicator] || 0;
    weightedSum += ind.value * weight;
    totalWeight += weight;
  });

  const overallValue = weightedSum / totalWeight;

  if (overallValue >= 4.0) return WaterRiskLevel.VERY_HIGH;
  if (overallValue >= 3.0) return WaterRiskLevel.HIGH;
  if (overallValue >= 2.0) return WaterRiskLevel.MODERATE;
  return WaterRiskLevel.LOW;
}
