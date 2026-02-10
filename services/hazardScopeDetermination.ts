/**
 * Automatic Hazard Scope Determination Service
 * 
 * Determines "In Scope" vs "Out of Scope" for all 28 EU Taxonomy hazards
 * based on asset characteristics, location, and climate datasets (CORDEX, etc.)
 * 
 * This eliminates "Not Assessed" by providing automatic scope determination
 * using reference datasets and business rules.
 */

import { Asset, HazardType, HazardCategory, ClimateScenario } from '../types';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { getCORDEXData } from './cordexData';

export type ScopeDetermination = 'In Scope' | 'Out of Scope';

export interface ScopeDeterminationResult {
  scope: ScopeDetermination;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  dataSources: string[];
  applicableConditions?: string[];
}

/**
 * Determine scope for a specific hazard based on asset characteristics
 */
export const determineHazardScope = async (
  asset: Asset,
  hazard: HazardType,
  scenario: ClimateScenario = ClimateScenario.SSP2_45
): Promise<ScopeDeterminationResult> => {
  const attrs = asset.attributes;
  const lat = asset.lat;
  const lng = asset.lng;
  const assetType = asset.assetType.toLowerCase();

  // Get CORDEX data for relevant hazards
  let cordexData = null;
  if (hazard.category === HazardCategory.TEMPERATURE || 
      hazard.category === HazardCategory.WIND ||
      hazard.category === HazardCategory.WATER) {
    try {
      cordexData = await getCORDEXData(hazard.id, lat, lng, scenario, '2050');
    } catch (e) {
      // Continue without CORDEX data if unavailable
    }
  }

  // Rule-based determination based on hazard code and asset characteristics
  const result = determineScopeByRules(asset, hazard, cordexData);
  
  return result;
};

/**
 * Rule-based scope determination
 */
function determineScopeByRules(
  asset: Asset,
  hazard: HazardType,
  cordexData: any
): ScopeDeterminationResult {
  const attrs = asset.attributes;
  const lat = asset.lat;
  const lng = asset.lng;
  const assetType = asset.assetType.toLowerCase();
  const hazardCode = hazard.code;
  const category = hazard.category;

  const dataSources: string[] = ['EU Taxonomy Appendix A', 'Asset Characteristics'];
  const reasoning = '';
  const applicableConditions: string[] = [];

  // TEMPERATURE HAZARDS
  if (category === HazardCategory.TEMPERATURE) {
    switch (hazardCode) {
      case 'TEMP-01': // Changing temperature
        // Always in scope for all assets (fundamental climate change impact)
        return {
          scope: 'In Scope',
          confidence: 'High',
          reasoning: 'Temperature changes affect all asset types and locations. Fundamental climate change impact.',
          dataSources: [...dataSources, 'CORDEX Temperature Projections'],
          applicableConditions: ['All assets', 'All locations']
        };

      case 'TEMP-02': // Heat stress
        // In scope for: outdoor assets, buildings, infrastructure, agriculture
        // Out of scope for: underground assets, assets in cold regions
        if (assetType.includes('solar') || assetType.includes('wind') || 
            assetType.includes('building') || assetType.includes('infrastructure') ||
            assetType.includes('agriculture') || assetType.includes('grid')) {
          const isHotRegion = lat < 40; // Southern Spain
          return {
            scope: isHotRegion ? 'In Scope' : 'In Scope', // Always assess, but higher priority in hot regions
            confidence: 'High',
            reasoning: `Heat stress affects ${assetType} assets. ${isHotRegion ? 'High priority in southern regions.' : 'Moderate priority.'}`,
            dataSources: [...dataSources, 'CORDEX Temperature Projections', 'Regional Climate Data'],
            applicableConditions: [`Latitude: ${lat.toFixed(2)}°`, `Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: `Heat stress not material for ${assetType} assets (indoor/underground operations).`,
          dataSources: dataSources
        };

      case 'TEMP-03': // Temperature variability
        // In scope for: assets sensitive to temperature swings (solar, buildings, agriculture)
        if (assetType.includes('solar') || assetType.includes('building') || 
            assetType.includes('agriculture') || assetType.includes('battery')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Temperature variability affects performance and durability of ${assetType} assets.`,
            dataSources: [...dataSources, 'CORDEX Temperature Variability'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Temperature variability not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'TEMP-04': // Permafrost thawing
        // Out of scope for Spain (no permafrost)
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: 'Permafrost thawing not applicable in Spain (no permafrost regions).',
          dataSources: [...dataSources, 'Geological Survey Data'],
          applicableConditions: ['Location: Spain (no permafrost)']
        };

      case 'TEMP-05': // Heat wave
        // In scope for: all outdoor assets, buildings, infrastructure
        if (assetType.includes('solar') || assetType.includes('wind') || 
            assetType.includes('building') || assetType.includes('infrastructure') ||
            assetType.includes('grid') || assetType.includes('agriculture')) {
          const isHotRegion = lat < 40;
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Heat waves affect ${assetType} assets. ${isHotRegion ? 'High frequency expected in southern Spain.' : 'Moderate frequency.'}`,
            dataSources: [...dataSources, 'CORDEX Extreme Temperature Events', 'Heat Wave Frequency Data'],
            applicableConditions: [`Latitude: ${lat.toFixed(2)}°`, `Region: ${isHotRegion ? 'Southern Spain' : 'Northern Spain'}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Heat waves not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'TEMP-06': // Cold wave/frost
        // In scope for: agriculture, outdoor infrastructure, water systems
        // Out of scope for: solar (minimal impact), buildings (heating systems)
        if (assetType.includes('agriculture') || assetType.includes('water') || 
            assetType.includes('infrastructure') || (assetType.includes('solar') && lat > 40)) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Cold waves/frost affect ${assetType} assets. ${lat > 40 ? 'Higher risk in northern regions.' : 'Moderate risk.'}`,
            dataSources: [...dataSources, 'CORDEX Temperature Extremes'],
            applicableConditions: [`Latitude: ${lat.toFixed(2)}°`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Cold waves/frost not material for ${assetType} assets in this location.`,
          dataSources: dataSources
        };

      case 'TEMP-07': // Wildfire
        // In scope for: assets in forested/vegetated areas, near forests
        // Out of scope for: urban assets, coastal assets without vegetation
        const distanceToForest = attrs.distanceToForestKm || 999;
        const isForestedArea = distanceToForest < 5 || assetType.includes('forest') || assetType.includes('agriculture');
        if (isForestedArea || lat < 40) { // Southern Spain has higher wildfire risk
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Wildfire risk affects assets ${distanceToForest < 5 ? 'near forested areas' : 'in high-risk regions'}.`,
            dataSources: [...dataSources, 'CORDEX Fire Weather Index', 'Wildfire Risk Maps', 'Forest Proximity Data'],
            applicableConditions: [
              `Distance to forest: ${distanceToForest < 999 ? distanceToForest.toFixed(1) + ' km' : 'Unknown'}`,
              `Region: ${lat < 40 ? 'Southern Spain (high risk)' : 'Moderate risk'}`
            ]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: `Wildfire not material for ${assetType} assets in urban/coastal areas without nearby vegetation.`,
          dataSources: [...dataSources, 'Wildfire Risk Maps'],
          applicableConditions: [`Distance to forest: ${distanceToForest < 999 ? distanceToForest.toFixed(1) + ' km' : 'Unknown'}`]
        };
    }
  }

  // WIND HAZARDS
  if (category === HazardCategory.WIND) {
    switch (hazardCode) {
      case 'WIND-01': // Changing wind patterns
        // In scope for: wind energy, aviation, shipping
        if (assetType.includes('wind') || assetType.includes('aviation') || assetType.includes('shipping')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Changing wind patterns directly affect ${assetType} assets.`,
            dataSources: [...dataSources, 'CORDEX Wind Speed Projections'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Changing wind patterns not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'WIND-02': // Precipitation/hydrological variability
        // In scope for: water-dependent assets, agriculture, infrastructure
        if (assetType.includes('water') || assetType.includes('agriculture') || 
            assetType.includes('hydropower') || assetType.includes('infrastructure')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Precipitation variability affects ${assetType} assets.`,
            dataSources: [...dataSources, 'CORDEX Precipitation Projections', 'Hydrological Data'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Precipitation variability not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'WIND-03': // Cyclone, hurricane, typhoon
        // Out of scope for Spain (not in hurricane/typhoon region)
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: 'Cyclones/hurricanes/typhoons not applicable in Spain (outside tropical cyclone regions).',
          dataSources: [...dataSources, 'Tropical Cyclone Track Data'],
          applicableConditions: ['Location: Spain (outside tropical cyclone region)']
        };

      case 'WIND-04': // Storm
        // In scope for: outdoor assets, infrastructure, buildings
        if (assetType.includes('wind') || assetType.includes('solar') || 
            assetType.includes('building') || assetType.includes('infrastructure')) {
          const isCoastal = (attrs.distanceToCoastKm || 999) < 50;
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Storms affect ${assetType} assets. ${isCoastal ? 'Higher risk in coastal areas.' : 'Moderate risk.'}`,
            dataSources: [...dataSources, 'CORDEX Wind Speed Extremes', 'Storm Frequency Data'],
            applicableConditions: [
              `Distance to coast: ${attrs.distanceToCoastKm ? attrs.distanceToCoastKm.toFixed(1) + ' km' : 'Unknown'}`,
              `Asset type: ${asset.assetType}`
            ]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Storms not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'WIND-05': // Tornado
        // Out of scope for Spain (very rare)
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: 'Tornadoes extremely rare in Spain (not in tornado-prone region).',
          dataSources: [...dataSources, 'Tornado Frequency Data'],
          applicableConditions: ['Location: Spain (low tornado frequency)']
        };
    }
  }

  // WATER HAZARDS
  if (category === HazardCategory.WATER) {
    switch (hazardCode) {
      case 'WAT-01': // Changing precipitation
        // In scope for: water-dependent assets, agriculture, infrastructure
        if (assetType.includes('water') || assetType.includes('agriculture') || 
            assetType.includes('hydropower') || assetType.includes('infrastructure')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Changing precipitation affects ${assetType} assets.`,
            dataSources: [...dataSources, 'CORDEX Precipitation Projections'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Changing precipitation not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'WAT-02': // Hydrological variability
        // In scope for: water-dependent assets, agriculture
        if (assetType.includes('water') || assetType.includes('agriculture') || 
            assetType.includes('hydropower')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Hydrological variability affects ${assetType} assets.`,
            dataSources: [...dataSources, 'CORDEX Hydrological Projections', 'River Flow Data'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Hydrological variability not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'WAT-03': // Flood
        // In scope for: assets in flood-prone areas, near rivers
        const distanceToRiver = attrs.distanceToRiverKm || 999;
        const elevation = attrs.elevationMeters || 0;
        const isFloodProne = distanceToRiver < 2 || elevation < 50;
        if (isFloodProne || assetType.includes('water') || assetType.includes('infrastructure')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Flood risk affects assets ${isFloodProne ? 'in flood-prone areas' : 'near water infrastructure'}.`,
            dataSources: [...dataSources, 'Flood Risk Maps', 'River Proximity Data', 'Elevation Data'],
            applicableConditions: [
              `Distance to river: ${distanceToRiver < 999 ? distanceToRiver.toFixed(1) + ' km' : 'Unknown'}`,
              `Elevation: ${elevation.toFixed(0)} m`
            ]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: `Flood not material for ${assetType} assets in elevated areas away from water bodies.`,
          dataSources: [...dataSources, 'Flood Risk Maps', 'Elevation Data'],
          applicableConditions: [
            `Distance to river: ${distanceToRiver < 999 ? distanceToRiver.toFixed(1) + ' km' : 'Unknown'}`,
            `Elevation: ${elevation.toFixed(0)} m`
          ]
        };

      case 'WAT-04': // Coastal flood
        // In scope for: coastal assets
        const distanceToCoast = attrs.distanceToCoastKm || 999;
        if (distanceToCoast < 10 || assetType.includes('coastal') || assetType.includes('port')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Coastal flood risk affects assets within ${distanceToCoast.toFixed(1)} km of coast.`,
            dataSources: [...dataSources, 'Coastal Flood Risk Maps', 'Sea Level Rise Projections', 'CORDEX Coastal Data'],
            applicableConditions: [`Distance to coast: ${distanceToCoast.toFixed(1)} km`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: `Coastal flood not material for assets ${distanceToCoast.toFixed(1)} km from coast.`,
          dataSources: [...dataSources, 'Coastal Flood Risk Maps'],
          applicableConditions: [`Distance to coast: ${distanceToCoast.toFixed(1)} km`]
        };

      case 'WAT-05': // Sea level rise
        // In scope for: coastal assets, low-lying areas
        const distanceToCoastSLR = attrs.distanceToCoastKm || 999;
        const elevationSLR = attrs.elevationMeters || 0;
        if ((distanceToCoastSLR < 20 && elevationSLR < 20) || assetType.includes('coastal') || assetType.includes('port')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Sea level rise affects coastal assets at low elevation (${elevationSLR.toFixed(0)} m).`,
            dataSources: [...dataSources, 'Sea Level Rise Projections', 'Coastal Elevation Data', 'CORDEX Coastal Data'],
            applicableConditions: [
              `Distance to coast: ${distanceToCoastSLR.toFixed(1)} km`,
              `Elevation: ${elevationSLR.toFixed(0)} m`
            ]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: `Sea level rise not material for assets ${distanceToCoastSLR.toFixed(1)} km from coast at ${elevationSLR.toFixed(0)} m elevation.`,
          dataSources: [...dataSources, 'Sea Level Rise Projections', 'Coastal Elevation Data'],
          applicableConditions: [
            `Distance to coast: ${distanceToCoastSLR.toFixed(1)} km`,
            `Elevation: ${elevationSLR.toFixed(0)} m`
          ]
        };

      case 'WAT-06': // Water scarcity
        // In scope for: water-dependent assets, agriculture
        if (assetType.includes('water') || assetType.includes('agriculture') || 
            assetType.includes('hydropower') || assetType.includes('industrial')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Water scarcity affects ${assetType} assets.`,
            dataSources: [...dataSources, 'Water Stress Index', 'CORDEX Precipitation Projections', 'Aquifer Data'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Water scarcity not material for ${assetType} assets.`,
          dataSources: dataSources
        };

      case 'WAT-07': // Drought
        // In scope for: agriculture, water-dependent assets
        if (assetType.includes('agriculture') || assetType.includes('water') || 
            assetType.includes('hydropower')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Drought affects ${assetType} assets.`,
            dataSources: [...dataSources, 'Drought Index', 'CORDEX Precipitation Projections', 'Soil Moisture Data'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Drought not material for ${assetType} assets.`,
          dataSources: dataSources
        };
    }
  }

  // SOLID MASS HAZARDS
  if (category === HazardCategory.SOLID_MASS) {
    switch (hazardCode) {
      case 'SOL-01': // Landslide
        // In scope for: assets in hilly/mountainous areas, near slopes
        const elevationLandslide = attrs.elevationMeters || 0;
        const isMountainous = elevationLandslide > 500;
        if (isMountainous || assetType.includes('mountain') || assetType.includes('slope')) {
          return {
            scope: 'In Scope',
            confidence: 'High',
            reasoning: `Landslide risk affects assets in ${isMountainous ? 'mountainous areas' : 'sloped terrain'}.`,
            dataSources: [...dataSources, 'Landslide Risk Maps', 'Topographic Data', 'Geological Data'],
            applicableConditions: [`Elevation: ${elevationLandslide.toFixed(0)} m`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: `Landslide not material for assets in flat/low-elevation areas (${elevationLandslide.toFixed(0)} m).`,
          dataSources: [...dataSources, 'Landslide Risk Maps', 'Topographic Data'],
          applicableConditions: [`Elevation: ${elevationLandslide.toFixed(0)} m`]
        };

      case 'SOL-02': // Avalanche
        // Out of scope for Spain (very limited alpine regions)
        return {
          scope: 'Out of Scope',
          confidence: 'High',
          reasoning: 'Avalanche risk extremely limited in Spain (very few alpine regions).',
          dataSources: [...dataSources, 'Avalanche Risk Maps', 'Alpine Region Data'],
          applicableConditions: ['Location: Spain (limited alpine regions)']
        };

      case 'SOL-03': // Subsidence
        // In scope for: assets in areas with groundwater extraction, mining, karst
        if (assetType.includes('mining') || assetType.includes('groundwater') || 
            attrs.distanceToCoastKm && attrs.distanceToCoastKm < 5) { // Coastal areas may have subsidence
          return {
            scope: 'In Scope',
            confidence: 'Medium',
            reasoning: `Subsidence risk affects ${assetType} assets.`,
            dataSources: [...dataSources, 'Subsidence Monitoring Data', 'Geological Data'],
            applicableConditions: [`Asset type: ${asset.assetType}`]
          };
        }
        return {
          scope: 'Out of Scope',
          confidence: 'Medium',
          reasoning: `Subsidence not material for ${assetType} assets in stable geological conditions.`,
          dataSources: [...dataSources, 'Geological Data']
        };
    }
  }

  // Default: If no specific rule matches, use general category-based rules
  return {
    scope: 'Out of Scope',
    confidence: 'Low',
    reasoning: `No specific scope determination rule found for ${hazardCode}. Defaulting to Out of Scope.`,
    dataSources: dataSources
  };
}

/**
 * Determine scope for all hazards for an asset
 */
export const determineAllHazardScopes = async (
  asset: Asset,
  scenario: ClimateScenario = ClimateScenario.SSP2_45
): Promise<Record<string, ScopeDeterminationResult>> => {
  const results: Record<string, ScopeDeterminationResult> = {};

  // Process all hazards in parallel
  const promises = EU_TAXONOMY_HAZARDS.map(async (hazard) => {
    const result = await determineHazardScope(asset, hazard, scenario);
    return { hazardId: hazard.id, result };
  });

  const resolved = await Promise.all(promises);
  resolved.forEach(({ hazardId, result }) => {
    results[hazardId] = result;
  });

  return results;
};
