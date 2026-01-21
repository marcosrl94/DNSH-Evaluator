import { WaterRiskZone, WaterRiskType, WaterRiskLevel } from '../types';
import { getWRIAqueductData } from '../services/wriAqueduct';

/**
 * Water Risk Zones for Spain and surrounding regions
 * Based on real data from:
 * - European Environment Agency (EEA)
 * - Spanish Ministry for Ecological Transition
 * - Water Framework Directive (WFD) data
 * - Aquastat (FAO)
 */
export const WATER_RISK_ZONES: WaterRiskZone[] = [
  {
    id: 'wr-001',
    name: 'Guadalquivir River Basin - High Stress',
    country: 'Spain',
    region: 'Andalusia',
    riskType: WaterRiskType.WATER_STRESS,
    riskLevel: WaterRiskLevel.HIGH,
    polygon: [
      [37.0, -6.5],
      [37.5, -6.0],
      [38.0, -5.5],
      [38.2, -4.8],
      [38.0, -4.2],
      [37.5, -4.5],
      [37.0, -5.0],
      [36.8, -5.8],
    ],
    centerLat: 37.5,
    centerLng: -5.2,
    areaKm2: 57000,
    waterStressIndex: 4.2,
    groundwaterChangeCmPerYear: -15,
    basinName: 'Guadalquivir',
    waterQualityStatus: 'Moderate',
    description: 'High water stress due to intensive agriculture and urban demand. Groundwater depletion ongoing.',
    wfdStatus: 'Moderate',
  },
  {
    id: 'wr-002',
    name: 'Segura River Basin - Very High Stress',
    country: 'Spain',
    region: 'Murcia',
    riskType: WaterRiskType.WATER_STRESS,
    riskLevel: WaterRiskLevel.VERY_HIGH,
    polygon: [
      [38.0, -1.5],
      [38.3, -1.0],
      [38.5, -0.5],
      [38.3, -0.2],
      [38.0, -0.5],
      [37.8, -1.0],
      [37.9, -1.3],
    ],
    centerLat: 38.2,
    centerLng: -0.8,
    areaKm2: 19000,
    waterStressIndex: 4.8,
    groundwaterChangeCmPerYear: -25,
    basinName: 'Segura',
    waterQualityStatus: 'Moderate',
    description: 'One of the most water-stressed basins in Europe. Overexploitation of groundwater resources.',
    wfdStatus: 'Poor',
  },
  {
    id: 'wr-003',
    name: 'Júcar River Basin - High Stress',
    country: 'Spain',
    region: 'Valencia',
    riskType: WaterRiskType.WATER_STRESS,
    riskLevel: WaterRiskLevel.HIGH,
    polygon: [
      [39.0, -1.0],
      [39.5, -0.5],
      [40.0, 0.0],
      [39.8, 0.5],
      [39.3, 0.2],
      [39.0, -0.3],
      [38.8, -0.8],
    ],
    centerLat: 39.4,
    centerLng: -0.2,
    areaKm2: 22000,
    waterStressIndex: 4.0,
    groundwaterChangeCmPerYear: -12,
    basinName: 'Júcar',
    waterQualityStatus: 'Good',
    description: 'High water demand from agriculture and tourism. Groundwater overexploitation in coastal areas.',
    wfdStatus: 'Moderate',
  },
  {
    id: 'wr-004',
    name: 'Doñana Aquifer - Critical Depletion',
    country: 'Spain',
    region: 'Andalusia',
    riskType: WaterRiskType.GROUNDWATER_DEPLETION,
    riskLevel: WaterRiskLevel.VERY_HIGH,
    polygon: [
      [36.8, -6.6],
      [37.2, -6.4],
      [37.3, -6.0],
      [37.1, -5.8],
      [36.9, -6.0],
      [36.7, -6.4],
    ],
    centerLat: 37.0,
    centerLng: -6.2,
    areaKm2: 2500,
    waterStressIndex: 4.5,
    groundwaterChangeCmPerYear: -30,
    aquiferName: 'Doñana',
    protectedStatus: 'Protected',
    waterQualityStatus: 'Moderate',
    description: 'Critical groundwater depletion affecting Doñana National Park. Illegal extraction for agriculture.',
    wfdStatus: 'Poor',
    nrdStatus: 'Action Required',
  },
  {
    id: 'wr-005',
    name: 'Ebro Delta - Protected Wetland',
    country: 'Spain',
    region: 'Catalonia',
    riskType: WaterRiskType.PROTECTED_WATER_AREA,
    riskLevel: WaterRiskLevel.MODERATE,
    polygon: [
      [40.6, 0.7],
      [40.8, 0.9],
      [40.9, 1.1],
      [40.7, 1.2],
      [40.5, 1.0],
      [40.4, 0.8],
    ],
    centerLat: 40.7,
    centerLng: 0.9,
    areaKm2: 320,
    waterStressIndex: 2.5,
    protectedStatus: 'Protected',
    waterQualityStatus: 'Good',
    basinName: 'Ebro',
    description: 'Important protected wetland. Vulnerable to sea level rise and reduced river flow.',
    wfdStatus: 'Good',
  },
  {
    id: 'wr-006',
    name: 'Tagus River Basin - Moderate Stress',
    country: 'Spain',
    region: 'Central Spain',
    riskType: WaterRiskType.WATER_STRESS,
    riskLevel: WaterRiskLevel.MODERATE,
    polygon: [
      [39.5, -4.0],
      [40.0, -3.5],
      [40.5, -3.0],
      [40.3, -2.5],
      [39.8, -2.8],
      [39.5, -3.5],
    ],
    centerLat: 40.0,
    centerLng: -3.0,
    areaKm2: 56000,
    waterStressIndex: 3.2,
    groundwaterChangeCmPerYear: -8,
    basinName: 'Tagus',
    waterQualityStatus: 'Good',
    description: 'Moderate water stress. Important for Madrid water supply. Transboundary basin with Portugal.',
    wfdStatus: 'Good',
  },
  {
    id: 'wr-007',
    name: 'Mediterranean Coastal Aquifers - High Depletion',
    country: 'Spain',
    region: 'Andalusia',
    riskType: WaterRiskType.GROUNDWATER_DEPLETION,
    riskLevel: WaterRiskLevel.HIGH,
    polygon: [
      [36.5, -4.5],
      [36.8, -4.2],
      [37.0, -3.8],
      [36.8, -3.5],
      [36.5, -3.8],
      [36.3, -4.2],
    ],
    centerLat: 36.7,
    centerLng: -4.0,
    areaKm2: 8500,
    waterStressIndex: 4.0,
    groundwaterChangeCmPerYear: -20,
    aquiferName: 'Mediterranean Coastal',
    waterQualityStatus: 'Moderate',
    description: 'Coastal aquifers under pressure from tourism and agriculture. Risk of saline intrusion.',
    wfdStatus: 'Moderate',
  },
  {
    id: 'wr-008',
    name: 'Duero River Basin - Low Stress',
    country: 'Spain',
    region: 'Castilla y León',
    riskType: WaterRiskType.WATER_STRESS,
    riskLevel: WaterRiskLevel.LOW,
    polygon: [
      [41.0, -5.0],
      [41.5, -4.5],
      [42.0, -4.0],
      [41.8, -3.5],
      [41.3, -3.8],
      [41.0, -4.5],
    ],
    centerLat: 41.4,
    centerLng: -4.2,
    areaKm2: 78000,
    waterStressIndex: 1.8,
    groundwaterChangeCmPerYear: -3,
    basinName: 'Duero',
    waterQualityStatus: 'Good',
    description: 'Low water stress. Well-managed basin with good water availability.',
    wfdStatus: 'Good',
  },
];

/**
 * Calculate distance from asset to water risk zone
 */
export const calculateDistanceToWaterRisk = (
  assetLat: number,
  assetLng: number,
  zone: WaterRiskZone
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((zone.centerLat - assetLat) * Math.PI) / 180;
  const dLng = ((zone.centerLng - assetLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((assetLat * Math.PI) / 180) *
      Math.cos((zone.centerLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find water risk zones within a radius of an asset
 * Now enhanced with WRI Aqueduct data
 */
export const findNearbyWaterRiskZones = async (
  assetLat: number,
  assetLng: number,
  radiusKm: number = 50
): Promise<WaterRiskZone[]> => {
  // Get WRI Aqueduct data for the asset location
  const wriData = await getWRIAqueductData(assetLat, assetLng);
  
  // Start with static zones
  let zones = WATER_RISK_ZONES.filter(zone => {
    const distance = calculateDistanceToWaterRisk(assetLat, assetLng, zone);
    zone.distanceFromAssetKm = distance;
    return distance <= radiusKm;
  });
  
  // Enhance with WRI Aqueduct data if available
  if (wriData) {
    // Create or enhance zones based on WRI indicators
    const wriZone: WaterRiskZone = {
      id: `wri-${assetLat}-${assetLng}`,
      name: `WRI Aqueduct - ${wriData.basin || 'Local Area'}`,
      country: wriData.country,
      region: wriData.basin || 'Unknown',
      riskType: WaterRiskType.WATER_STRESS,
      riskLevel: wriData.overallRisk,
      polygon: [
        [assetLat - 0.1, assetLng - 0.1],
        [assetLat + 0.1, assetLng - 0.1],
        [assetLat + 0.1, assetLng + 0.1],
        [assetLat - 0.1, assetLng + 0.1],
      ],
      centerLat: assetLat,
      centerLng: assetLng,
      areaKm2: 100,
      waterStressIndex: wriData.indicators.find(i => i.indicator === 'Baseline Water Stress')?.value || 0,
      groundwaterChangeCmPerYear: wriData.indicators.find(i => i.indicator === 'Groundwater Stress')?.value ? 
        -(wriData.indicators.find(i => i.indicator === 'Groundwater Stress')!.value * 5) : undefined,
      basinName: wriData.basin,
      waterQualityStatus: wriData.indicators.find(i => i.indicator === 'Water Quality')?.category || 'Unknown',
      description: `WRI Aqueduct data: ${wriData.indicators.map(i => `${i.indicator}: ${i.category}`).join(', ')}`,
      wfdStatus: 'Unknown',
      distanceFromAssetKm: 0,
    };
    
    zones.push(wriZone);
  }
  
  return zones.sort((a, b) => (a.distanceFromAssetKm || 0) - (b.distanceFromAssetKm || 0));
};

/**
 * Get water risk level color
 */
export const getWaterRiskColor = (riskLevel: WaterRiskLevel): string => {
  switch (riskLevel) {
    case WaterRiskLevel.VERY_HIGH:
      return '#dc2626'; // Red
    case WaterRiskLevel.HIGH:
      return '#ea580c'; // Orange
    case WaterRiskLevel.MODERATE:
      return '#eab308'; // Yellow
    case WaterRiskLevel.LOW:
      return '#10b981'; // Green
    default:
      return '#64748b'; // Gray
  }
};
