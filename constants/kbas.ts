import { KeyBiodiversityArea, KBACriteria, KBADesignation } from '../types';

/**
 * Key Biodiversity Areas (KBAs) for Spain and surrounding regions
 * Based on real KBA data from BirdLife International and other sources
 * Coordinates are simplified polygons for visualization
 */
export const KEY_BIODIVERSITY_AREAS: KeyBiodiversityArea[] = [
  {
    id: 'kba-001',
    name: 'Doñana National Park',
    country: 'Spain',
    region: 'Andalusia',
    designation: KBADesignation.GLOBAL,
    criteria: [KBACriteria.A1, KBACriteria.B1],
    areaKm2: 542.0,
    polygon: [
      [37.0, -6.5],
      [37.2, -6.3],
      [37.3, -6.1],
      [37.2, -5.8],
      [37.0, -5.9],
      [36.8, -6.2],
      [36.9, -6.4],
    ],
    centerLat: 37.0,
    centerLng: -6.3,
    protectedStatus: 'Fully Protected',
    keySpecies: ['Iberian Lynx', 'Spanish Imperial Eagle', 'Marbled Teal'],
    keyEcosystems: ['Mediterranean wetlands', 'Coastal dunes', 'Pine forests'],
    threatenedSpeciesCount: 12,
    natura2000SiteId: 'ES0000024',
    description: 'One of Europe\'s most important wetlands. Critical habitat for migratory birds and endangered species.',
  },
  {
    id: 'kba-002',
    name: 'Sierra Nevada',
    country: 'Spain',
    region: 'Andalusia',
    designation: KBADesignation.GLOBAL,
    criteria: [KBACriteria.A1, KBACriteria.A2, KBACriteria.B1],
    areaKm2: 2100.0,
    polygon: [
      [37.0, -3.2],
      [37.2, -3.0],
      [37.3, -2.8],
      [37.1, -2.6],
      [36.9, -2.7],
      [36.8, -3.0],
      [36.9, -3.2],
    ],
    centerLat: 37.1,
    centerLng: -2.9,
    protectedStatus: 'Fully Protected',
    keySpecies: ['Iberian Ibex', 'Golden Eagle', 'Sierra Nevada Blue Butterfly'],
    keyEcosystems: ['Alpine meadows', 'Mediterranean forests', 'High mountain ecosystems'],
    threatenedSpeciesCount: 8,
    natura2000SiteId: 'ES0000047',
    description: 'Highest mountain range in continental Spain. Unique alpine flora and fauna with many endemic species.',
  },
  {
    id: 'kba-003',
    name: 'Guadalquivir Marshes',
    country: 'Spain',
    region: 'Andalusia',
    designation: KBADesignation.REGIONAL,
    criteria: [KBACriteria.A1, KBACriteria.B1],
    areaKm2: 320.0,
    polygon: [
      [37.1, -6.0],
      [37.3, -5.8],
      [37.4, -5.6],
      [37.2, -5.5],
      [37.0, -5.7],
      [36.9, -5.9],
    ],
    centerLat: 37.2,
    centerLng: -5.8,
    protectedStatus: 'Partially Protected',
    keySpecies: ['Greater Flamingo', 'White-headed Duck', 'Purple Swamphen'],
    keyEcosystems: ['Seasonal marshes', 'Rice paddies', 'Reed beds'],
    threatenedSpeciesCount: 6,
    description: 'Important wetland complex for waterbirds. Partially protected, facing agricultural pressure.',
  },
  {
    id: 'kba-004',
    name: 'Cabo de Gata-Níjar Natural Park',
    country: 'Spain',
    region: 'Andalusia',
    designation: KBADesignation.REGIONAL,
    criteria: [KBACriteria.A1, KBACriteria.B1],
    areaKm2: 460.0,
    polygon: [
      [36.7, -2.2],
      [36.9, -2.0],
      [37.0, -1.8],
      [36.8, -1.7],
      [36.6, -1.9],
      [36.5, -2.1],
    ],
    centerLat: 36.8,
    centerLng: -2.0,
    protectedStatus: 'Fully Protected',
    keySpecies: ['Audouin\'s Gull', 'Mediterranean Chameleon', 'European Shag'],
    keyEcosystems: ['Marine protected area', 'Coastal cliffs', 'Dry Mediterranean scrub'],
    threatenedSpeciesCount: 5,
    natura2000SiteId: 'ES0000046',
    description: 'Marine and terrestrial protected area. Important seabird colonies and unique Mediterranean flora.',
  },
  {
    id: 'kba-005',
    name: 'Tablas de Daimiel',
    country: 'Spain',
    region: 'Castilla-La Mancha',
    designation: KBADesignation.REGIONAL,
    criteria: [KBACriteria.A1, KBACriteria.B1],
    areaKm2: 30.0,
    polygon: [
      [39.1, -3.7],
      [39.2, -3.6],
      [39.3, -3.5],
      [39.2, -3.4],
      [39.1, -3.5],
      [39.0, -3.6],
    ],
    centerLat: 39.15,
    centerLng: -3.55,
    protectedStatus: 'Fully Protected',
    keySpecies: ['Red-crested Pochard', 'Marsh Harrier', 'Purple Heron'],
    keyEcosystems: ['Inland wetlands', 'Reed beds', 'Riparian forests'],
    threatenedSpeciesCount: 4,
    natura2000SiteId: 'ES0000012',
    description: 'Important inland wetland. Threatened by water extraction and climate change.',
  },
  {
    id: 'kba-006',
    name: 'Monfragüe National Park',
    country: 'Spain',
    region: 'Extremadura',
    designation: KBADesignation.GLOBAL,
    criteria: [KBACriteria.A1, KBACriteria.B1],
    areaKm2: 180.0,
    polygon: [
      [39.8, -6.0],
      [40.0, -5.8],
      [40.1, -5.6],
      [39.9, -5.5],
      [39.7, -5.7],
      [39.6, -5.9],
    ],
    centerLat: 39.85,
    centerLng: -5.75,
    protectedStatus: 'Fully Protected',
    keySpecies: ['Black Vulture', 'Spanish Imperial Eagle', 'Black Stork'],
    keyEcosystems: ['Mediterranean forest', 'Rocky outcrops', 'Riparian galleries'],
    threatenedSpeciesCount: 10,
    natura2000SiteId: 'ES0000015',
    description: 'One of the best preserved Mediterranean forests. Important raptor breeding area.',
  },
  {
    id: 'kba-007',
    name: 'Ebro Delta',
    country: 'Spain',
    region: 'Catalonia',
    designation: KBADesignation.GLOBAL,
    criteria: [KBACriteria.A1, KBACriteria.B1],
    areaKm2: 320.0,
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
    protectedStatus: 'Fully Protected',
    keySpecies: ['Greater Flamingo', 'Slender-billed Gull', 'Audouin\'s Gull'],
    keyEcosystems: ['Coastal wetlands', 'Rice paddies', 'Salt marshes'],
    threatenedSpeciesCount: 7,
    natura2000SiteId: 'ES0000019',
    description: 'Important Mediterranean wetland. Critical stopover for migratory birds.',
  },
  {
    id: 'kba-008',
    name: 'Coto Doñana Buffer Zone',
    country: 'Spain',
    region: 'Andalusia',
    designation: KBADesignation.REGIONAL,
    criteria: [KBACriteria.A1],
    areaKm2: 680.0,
    polygon: [
      [37.2, -6.6],
      [37.4, -6.4],
      [37.5, -6.2],
      [37.3, -6.0],
      [37.1, -6.2],
      [37.0, -6.4],
    ],
    centerLat: 37.3,
    centerLng: -6.4,
    protectedStatus: 'Partially Protected',
    keySpecies: ['Iberian Lynx', 'Spanish Imperial Eagle'],
    keyEcosystems: ['Mediterranean scrub', 'Pine plantations'],
    threatenedSpeciesCount: 5,
    description: 'Buffer zone around Doñana. Important connectivity corridor for wildlife.',
  },
];

/**
 * Calculate distance from asset to KBA (simplified)
 */
export const calculateDistanceToKBA = (
  assetLat: number,
  assetLng: number,
  kba: KeyBiodiversityArea
): number => {
  // Haversine formula (simplified)
  const R = 6371; // Earth radius in km
  const dLat = ((kba.centerLat - assetLat) * Math.PI) / 180;
  const dLng = ((kba.centerLng - assetLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((assetLat * Math.PI) / 180) *
      Math.cos((kba.centerLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find KBAs within a radius of an asset
 */
export const findNearbyKBAs = (
  assetLat: number,
  assetLng: number,
  radiusKm: number = 50
): KeyBiodiversityArea[] => {
  return KEY_BIODIVERSITY_AREAS.filter(kba => {
    const distance = calculateDistanceToKBA(assetLat, assetLng, kba);
    kba.distanceFromAssetKm = distance;
    return distance <= radiusKm;
  }).sort((a, b) => (a.distanceFromAssetKm || 0) - (b.distanceFromAssetKm || 0));
};
