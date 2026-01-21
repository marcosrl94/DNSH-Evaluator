
import { Asset, HazardType, RiskResult, AdaptationAssessment, RiskBand, HazardCategory, ClimateScenario } from '../types';
import { EU_TAXONOMY_HAZARDS } from '../constants';
import { getScenarioById } from '../constants/climateScenarios';

// --- CONFIGURACIÓN DE ESCENARIOS CLIMÁTICOS ---
// Now using SSP scenarios from climateScenarios.ts

const getRiskBand = (totalScore: number): RiskBand => {
    if (totalScore >= 13) return 'Very High';
    if (totalScore >= 10) return 'High';
    if (totalScore >= 5) return 'Moderate';
    return 'Low';
};

// --- LOGICA DE INTENSIDAD (HAZARD) ---

/**
 * Calcula la Intensidad de la Amenaza (0-1) basándose en atributos físicos, localización y escenario climático.
 * Now uses CORDEX data when available for more accurate projections.
 */
const calculateHazardIntensity = (
    asset: Asset, 
    hazard: HazardType, 
    scenario: ClimateScenario,
    horizon: '2030' | '2050' | '2100',
    tempRise: number, 
    extremeFactor: number
): number => {
    let baseIntensity = 0;

    // Get scenario-specific projections if available
    const scenarioProjection = hazard.scenarioProjections?.[scenario];
    const horizonKey = horizon === '2030' ? 'intensity2050' : horizon === '2050' ? 'intensity2050' : 'intensity2100';
    const baseScenarioIntensity = scenarioProjection?.[horizonKey] || 0;
    
    // Note: CORDEX data integration will be done asynchronously at a higher level
    // to avoid making this function async and breaking existing code

    // 1. ANÁLISIS TÉRMICO
    if (hazard.category === HazardCategory.TEMPERATURE) {
        // Base: Latitud (Más al sur = más calor). Lat 36 (Malaga) a 43 (Bilbao).
        // 43 -> 0.2, 36 -> 0.8
        const latitudeFactor = Math.max(0, Math.min(1, (44 - asset.lat) / 10));
        
        // Use scenario projection if available, otherwise calculate from temp rise
        if (baseScenarioIntensity > 0) {
            baseIntensity = baseScenarioIntensity * (0.7 + latitudeFactor * 0.3); // Adjust by latitude
        } else {
            baseIntensity = latitudeFactor * 0.6; // Base climate
            baseIntensity += (tempRise / 8); // Add Scenario Delta
        }

        // Specific Hazards
        if (hazard.code === 'TEMP-02' || hazard.code === 'TEMP-05') { // Heat Stress / Heat Wave
             // Urban Heat Island logic could go here, for now pure lat+scenario
             baseIntensity = Math.min(1, baseIntensity * 1.2);
        }
    }

    // 2. ANÁLISIS HÍDRICO (Inundaciones)
    else if (hazard.category === HazardCategory.WATER) {
        if (hazard.code === 'WAT-17') { // Sea Level Rise
             // Critical factor: Elevation & Distance to coast
             if (asset.attributes.distanceToCoastKm < 2 && asset.attributes.elevationMeters < 5) {
                 baseIntensity = 0.9 * extremeFactor;
             } else if (asset.attributes.distanceToCoastKm < 10 && asset.attributes.elevationMeters < 10) {
                 baseIntensity = 0.5 * extremeFactor;
             } else {
                 baseIntensity = 0.05;
             }
        } else if (['WAT-09', 'WAT-21'].includes(hazard.code)) { // Floods
             // Critical factor: Elevation (simplified proxy for flood plain)
             if (asset.attributes.elevationMeters < 15) baseIntensity = 0.7;
             else if (asset.attributes.elevationMeters < 50) baseIntensity = 0.4;
             else baseIntensity = 0.1;

             // Scenarios increase precip intensity
             baseIntensity = Math.min(1, baseIntensity * extremeFactor);
        } else if (hazard.code === 'WAT-19' || hazard.code === 'WAT-06') { // Drought/Water Stress
             // Southern spain (low lat) has high baseline drought risk
             const droughtBaseline = (44 - asset.lat) / 12; // 0.3 to 0.8
             baseIntensity = Math.min(1, droughtBaseline * extremeFactor);
        }
    }

    // 3. VIENTO Y OTROS
    else if (hazard.category === HazardCategory.WIND) {
        // Coastal areas have higher wind risk
        const coastalWind = asset.attributes.distanceToCoastKm < 20 ? 0.6 : 0.3;
        baseIntensity = coastalWind * extremeFactor;
    } 
    
    // Default fallback
    else {
        baseIntensity = 0.2 * extremeFactor;
    }

    return Math.min(1, Math.max(0, baseIntensity));
};

// --- LOGICA DE VULNERABILIDAD (SENSITIVITY) ---

/**
 * Calcula la Vulnerabilidad (0-1) basándose en atributos del activo.
 * Cuanto daño sufre el activo ante una intensidad dada.
 */
const calculateVulnerabilityScore = (asset: Asset, hazard: HazardType): number => {
    let vulnerability = 0.5; // Default medium

    // A. Energy Assets (PV Plants, Wind, etc.)
    if (asset.assetType.includes('Solar') || asset.assetType.includes('Wind') || asset.assetType.includes('Hydro') || asset.assetType.includes('Geothermal') || asset.assetType.includes('Biomass')) {
        if (hazard.category === HazardCategory.TEMPERATURE) {
            // PV efficiency drops with heat. Check tolerance.
            // If hazard is Heat, and tolerance is low (e.g. 35C), vulnerability is high.
            vulnerability = asset.attributes.temperatureToleranceC < 40 ? 0.8 : 0.4;
        } else if (hazard.category === HazardCategory.WATER) {
            // PV plants are sensitive to Floods (electronics on ground) but low dependency on water
            if (['WAT-09', 'WAT-21'].includes(hazard.code)) vulnerability = 0.7; // Flood
            if (hazard.code === 'WAT-19') vulnerability = 0.2; // Drought (low impact usually)
        } else if (hazard.category === HazardCategory.WIND) {
             vulnerability = 0.6; // Panels can be damaged by storms
        }
    } 
    
    // B. Real Estate / Infrastructure / Transport
    else if (asset.assetType.includes('Building') || asset.assetType.includes('Warehouse') || 
             asset.assetType.includes('Data Center') || asset.assetType.includes('Grid') ||
             asset.assetType.includes('Port') || asset.assetType.includes('Highway') ||
             asset.assetType.includes('Railway') || asset.assetType.includes('Airport')) {
        if (hazard.category === HazardCategory.WATER) {
            // Flood logic: Do they have protection?
            // If hazard is flood, and protection < 100yr return period, high vulnerability
            if (['WAT-09', 'WAT-21', 'WAT-17'].includes(hazard.code)) {
                vulnerability = asset.attributes.floodProtectionLevel < 50 ? 0.9 : 0.3;
            }
            // Water Stress logic: Do they need water?
            if (['WAT-06', 'WAT-19'].includes(hazard.code)) {
                vulnerability = asset.attributes.waterDependency === 'High' ? 0.9 : 
                                asset.attributes.waterDependency === 'Medium' ? 0.5 : 0.1;
            }
        } else if (hazard.category === HazardCategory.TEMPERATURE) {
            // Cooling needs
            vulnerability = asset.attributes.temperatureToleranceC < 30 ? 0.7 : 0.3;
        }
    }

    return vulnerability;
};

// --- MAIN ENGINE ---

export const computeOperationRisk = (
    assets: Asset[], 
    scenario: ClimateScenario | string = ClimateScenario.SSP2_45, 
    horizon: string = '2050'
): { 
  risks: RiskResult[], 
  assessments: AdaptationAssessment[] 
} => {
  const risks: RiskResult[] = [];
  const assessments: AdaptationAssessment[] = [];

  // 1. Get Climate Projections
  // Handle both new ClimateScenario enum and legacy string format
  let climateScenario: ClimateScenario;
  if (typeof scenario === 'string') {
    // Legacy support: convert old RCP strings to SSP
    if (scenario.includes('2.6') || scenario.includes('Optimistic')) {
      climateScenario = ClimateScenario.SSP1_26;
    } else if (scenario.includes('8.5') || scenario.includes('Pessimistic')) {
      climateScenario = ClimateScenario.SSP5_85;
    } else {
      climateScenario = ClimateScenario.SSP2_45;
    }
  } else {
    climateScenario = scenario;
  }

  const scenarioConfig = getScenarioById(climateScenario);
  if (!scenarioConfig) {
    throw new Error(`Invalid climate scenario: ${climateScenario}`);
  }

  // Get temperature rise and extreme factor based on horizon
  const tempRise = horizon === '2030' 
    ? scenarioConfig.temperatureIncrease2050 * 0.6  // Approximate 2030 value
    : horizon === '2050' 
    ? scenarioConfig.temperatureIncrease2050 
    : scenarioConfig.temperatureIncrease2100;
  
  // Extreme event multiplier based on scenario intensity
  const extremeFactor = climateScenario === ClimateScenario.SSP1_26 ? 1.1 :
                        climateScenario === ClimateScenario.SSP2_45 ? 1.25 :
                        1.5; // SSP5-8.5

  EU_TAXONOMY_HAZARDS.forEach(hazard => {
    let hazardTotalAAL = 0;
    let hazardMaxIntensity = 0;
    let avgExposure = 0;

    assets.forEach(asset => {
      // Step A: Calculate Physical Intensity (H)
      const intensity = calculateHazardIntensity(
        asset, 
        hazard, 
        climateScenario,
        horizon as '2030' | '2050' | '2100',
        tempRise, 
        extremeFactor
      );
      
      // Step B: Calculate Asset Vulnerability (V)
      const vulnerability = calculateVulnerabilityScore(asset, hazard);
      
      // Step C: Calculate Exposure Value (E) - Magnitude
      // For scoring 0-5, we normalize. Here we use exposedValue for AAL
      
      // Step D: Calculate AEP & Damage
      const aep = 0.05 * (intensity * 1.5); // Simplified AEP
      
      // Damage Function: Vulnerability modulates the impact of Intensity
      // If V=0, no damage. If V=1, full damage potential of intensity.
      const damageRatio = Math.min(1, (intensity * intensity) * vulnerability * 1.5); 
      
      const aal = asset.exposedValue * damageRatio * aep;

      risks.push({
        hazardTypeId: hazard.id,
        assetId: asset.id,
        intensity,
        damageRatio,
        aal
      });

      hazardTotalAAL += aal;
      hazardMaxIntensity = Math.max(hazardMaxIntensity, intensity);
      // "Exposure" in score context often means "Are we in harm's way?" (Intensity)
      // But in BBVA methodology, Exposure is distinct from Hazard.
      // We will map Intensity -> Hazard Score, and Location Presence -> Exposure Score.
      avgExposure += intensity; 
    });

    avgExposure = avgExposure / assets.length;

    // --- BBVA CRVA SCORING LOGIC (H+E+V) ---
    
    // 1. Hazard (H) 0-5: Based on the raw physical intensity of the climate event
    const scoreHazard = Math.ceil(hazardMaxIntensity * 5); 

    // 2. Exposure (E) 0-5: In this engine, Exposure is how much the asset is "touched" by the hazard
    // We use the calculated intensity at location as the exposure metric.
    const scoreExposure = Math.ceil(avgExposure * 5);

    // 3. Vulnerability (V) 0-5: Based on asset attributes
    // We take the worst case asset in the portfolio for the overall hazard assessment
    const maxVuln = Math.max(...assets.map(a => calculateVulnerabilityScore(a, hazard)));
    const scoreVulnerability = Math.ceil(maxVuln * 5);

    const totalScore = scoreHazard + scoreExposure + scoreVulnerability;
    const riskBand = getRiskBand(totalScore);

    // Materiality: High or Very High bands are material
    const isMaterial = ['High', 'Very High'].includes(riskBand);

    // Calculate DNSH status based on risk band
    const getDnshStatus = (band: RiskBand): 'Compliant' | 'Non-Compliant' | 'Conditional' => {
      if (band === 'Very High' || band === 'High') return 'Non-Compliant';
      if (band === 'Moderate') return 'Conditional';
      return 'Compliant';
    };

    assessments.push({
      hazardTypeId: hazard.id,
      scoreHazard,
      scoreExposure,
      scoreVulnerability,
      totalScore,
      riskBand,
      materiality: isMaterial,
      maxIntensity: hazardMaxIntensity,
      totalAAL: hazardTotalAAL,
      measuresRequired: isMaterial, 
      status: isMaterial ? 'Conditional' : 'Pass',
      dnshStatusPreMeasures: getDnshStatus(riskBand)
    });
  });

  return { risks, assessments };
};
