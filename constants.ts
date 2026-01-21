
import { HazardType, HazardCategory, Operation, Measure, DnshChecklistTemplate, DnshObjective, EUAssetType, EvidenceType, ClimateScenario, Client } from './types';

// The 28 Hazards from EU Taxonomy Appendix A with scenario-specific projections
export const EU_TAXONOMY_HAZARDS: HazardType[] = [
  // Temperature
  { 
    id: 'h1', 
    code: 'TEMP-01', 
    name: 'Changing temperature (air, fresh water, marine water)', 
    category: HazardCategory.TEMPERATURE,
    threshold: {
      hazardId: 'h1',
      metric: 'temperatureIncrease',
      thresholdValue: 1.5,
      comparison: '>',
      unit: '°C',
      description: 'Temperature increase above 1.5°C indicates material risk'
    }
  },
  { 
    id: 'h2', 
    code: 'TEMP-02', 
    name: 'Heat stress', 
    category: HazardCategory.TEMPERATURE,
    threshold: {
      hazardId: 'h2',
      metric: 'heatWaveFrequency',
      thresholdValue: 6,
      comparison: '>',
      unit: 'events/year',
      description: 'More than 6 heat wave events per year indicates material risk'
    }
  },
  { id: 'h3', code: 'TEMP-03', name: 'Temperature variability', category: HazardCategory.TEMPERATURE },
  { id: 'h4', code: 'TEMP-04', name: 'Permafrost thawing', category: HazardCategory.TEMPERATURE },
  { 
    id: 'h5', 
    code: 'TEMP-05', 
    name: 'Heat wave', 
    category: HazardCategory.TEMPERATURE,
    threshold: {
      hazardId: 'h5',
      metric: 'heatWaveFrequency',
      thresholdValue: 6,
      comparison: '>',
      unit: 'events/year',
      description: 'More than 6 heat wave events per year indicates material risk'
    }
  },
  { id: 'h6', code: 'TEMP-06', name: 'Cold wave/frost', category: HazardCategory.TEMPERATURE },
  { 
    id: 'h7', 
    code: 'TEMP-07', 
    name: 'Wildfire', 
    category: HazardCategory.TEMPERATURE,
    threshold: {
      hazardId: 'h7',
      metric: 'wildfireRisk',
      thresholdValue: 0.4,
      comparison: '>',
      unit: '0-1 scale',
      description: 'Wildfire risk above 0.4 indicates material risk'
    }
  },
  // Wind
  { 
    id: 'h8', 
    code: 'WIND-01', 
    name: 'Changing wind patterns', 
    category: HazardCategory.WIND,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.40, frequencyChange2050: 12, frequencyChange2100: 22 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.60, frequencyChange2050: 22, frequencyChange2100: 42 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 0.85, frequencyChange2050: 38, frequencyChange2100: 78 },
    }
  },
  { 
    id: 'h9', 
    code: 'WIND-02', 
    name: 'Precipitation or hydrological variability', 
    category: HazardCategory.WIND,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 15, frequencyChange2100: 25 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 25, frequencyChange2100: 45 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 40, frequencyChange2100: 80 },
    }
  },
  { 
    id: 'h10', 
    code: 'WIND-03', 
    name: 'Cyclone, hurricane, typhoon', 
    category: HazardCategory.WIND,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 10, frequencyChange2100: 20 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 20, frequencyChange2100: 40 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 35, frequencyChange2100: 75 },
    }
  },
  { 
    id: 'h11', 
    code: 'WIND-04', 
    name: 'Storm (including blizzards, dust, sand)', 
    category: HazardCategory.WIND,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.40, frequencyChange2050: 12, frequencyChange2100: 22 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.60, frequencyChange2050: 22, frequencyChange2100: 42 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 0.85, frequencyChange2050: 38, frequencyChange2100: 78 },
    }
  },
  { 
    id: 'h12', 
    code: 'WIND-05', 
    name: 'Tornado', 
    category: HazardCategory.WIND,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.25, intensity2100: 0.35, frequencyChange2050: 8, frequencyChange2100: 18 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.35, intensity2100: 0.55, frequencyChange2050: 18, frequencyChange2100: 38 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.50, intensity2100: 0.80, frequencyChange2050: 30, frequencyChange2100: 70 },
    }
  },
  // Water
  { 
    id: 'h13', 
    code: 'WAT-01', 
    name: 'Changing precipitation patterns', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.40, frequencyChange2050: 15, frequencyChange2100: 25 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.60, frequencyChange2050: 25, frequencyChange2100: 45 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 0.85, frequencyChange2050: 40, frequencyChange2100: 80 },
    }
  },
  { 
    id: 'h14', 
    code: 'WAT-02', 
    name: 'Precipitation or hydrological variability', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 18, frequencyChange2100: 28 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 28, frequencyChange2100: 48 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 45, frequencyChange2100: 85 },
    }
  },
  { 
    id: 'h15', 
    code: 'WAT-03', 
    name: 'Ocean acidification', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.25, intensity2100: 0.35, frequencyChange2050: 10, frequencyChange2100: 20 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.35, intensity2100: 0.55, frequencyChange2050: 20, frequencyChange2100: 40 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.50, intensity2100: 0.80, frequencyChange2050: 35, frequencyChange2100: 75 },
    }
  },
  { 
    id: 'h16', 
    code: 'WAT-04', 
    name: 'Saline intrusion', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.40, frequencyChange2050: 12, frequencyChange2100: 22 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.60, frequencyChange2050: 22, frequencyChange2100: 42 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 0.85, frequencyChange2050: 38, frequencyChange2100: 78 },
    }
  },
  { 
    id: 'h17', 
    code: 'WAT-05', 
    name: 'Sea level rise', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.45, frequencyChange2050: 18, frequencyChange2100: 44 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.63, frequencyChange2050: 22, frequencyChange2100: 63 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 1.0, frequencyChange2050: 28, frequencyChange2100: 101 },
    },
    threshold: {
      hazardId: 'h17',
      metric: 'seaLevelRise',
      thresholdValue: 20,
      comparison: '>',
      unit: 'cm',
      description: 'Sea level rise above 20cm indicates material risk for coastal assets'
    }
  },
  { 
    id: 'h18', 
    code: 'WAT-06', 
    name: 'Water stress', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 20, frequencyChange2100: 30 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 30, frequencyChange2100: 50 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 50, frequencyChange2100: 85 },
    }
  },
  { 
    id: 'h19', 
    code: 'WAT-07', 
    name: 'Drought', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.40, intensity2100: 0.50, frequencyChange2050: 25, frequencyChange2100: 35 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.50, intensity2100: 0.70, frequencyChange2050: 35, frequencyChange2100: 55 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.65, intensity2100: 0.95, frequencyChange2050: 55, frequencyChange2100: 90 },
    }
  },
  { 
    id: 'h20', 
    code: 'WAT-08', 
    name: 'Heavy precipitation (rain, hail, snow/ice)', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 20, frequencyChange2100: 30 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 30, frequencyChange2100: 50 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 50, frequencyChange2100: 85 },
    }
  },
  { 
    id: 'h21', 
    code: 'WAT-09', 
    name: 'Flood (coastal, fluvial, pluvial, ground water)', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.40, intensity2100: 0.50, frequencyChange2050: 22, frequencyChange2100: 32 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.50, intensity2100: 0.70, frequencyChange2050: 32, frequencyChange2100: 52 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.65, intensity2100: 0.95, frequencyChange2050: 52, frequencyChange2100: 88 },
    },
    threshold: {
      hazardId: 'h21',
      metric: 'heavyPrecipitationFrequency',
      thresholdValue: 10,
      comparison: '>',
      unit: 'events/year',
      description: 'More than 10 heavy precipitation events per year indicates material flood risk'
    }
  },
  { 
    id: 'h22', 
    code: 'WAT-10', 
    name: 'Glacial lake outburst', 
    category: HazardCategory.WATER,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.25, intensity2100: 0.35, frequencyChange2050: 8, frequencyChange2100: 18 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.35, intensity2100: 0.55, frequencyChange2050: 18, frequencyChange2100: 38 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.50, intensity2100: 0.80, frequencyChange2050: 30, frequencyChange2100: 70 },
    }
  },
  // Solid Mass
  { 
    id: 'h23', 
    code: 'SOL-01', 
    name: 'Coastal erosion', 
    category: HazardCategory.SOLID_MASS,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.40, frequencyChange2050: 15, frequencyChange2100: 25 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.60, frequencyChange2050: 25, frequencyChange2100: 45 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 0.85, frequencyChange2050: 40, frequencyChange2100: 80 },
    }
  },
  { 
    id: 'h24', 
    code: 'SOL-02', 
    name: 'Soil degradation', 
    category: HazardCategory.SOLID_MASS,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 18, frequencyChange2100: 28 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 28, frequencyChange2100: 48 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 45, frequencyChange2100: 85 },
    }
  },
  { 
    id: 'h25', 
    code: 'SOL-03', 
    name: 'Soil erosion', 
    category: HazardCategory.SOLID_MASS,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.30, intensity2100: 0.40, frequencyChange2050: 12, frequencyChange2100: 22 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.40, intensity2100: 0.60, frequencyChange2050: 22, frequencyChange2100: 42 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.55, intensity2100: 0.85, frequencyChange2050: 38, frequencyChange2100: 78 },
    }
  },
  { 
    id: 'h26', 
    code: 'SOL-04', 
    name: 'Solifluction', 
    category: HazardCategory.SOLID_MASS,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.25, intensity2100: 0.35, frequencyChange2050: 8, frequencyChange2100: 18 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.35, intensity2100: 0.55, frequencyChange2050: 18, frequencyChange2100: 38 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.50, intensity2100: 0.80, frequencyChange2050: 30, frequencyChange2100: 70 },
    }
  },
  { 
    id: 'h27', 
    code: 'SOL-05', 
    name: 'Avalanche', 
    category: HazardCategory.SOLID_MASS,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.20, intensity2100: 0.25, frequencyChange2050: -5, frequencyChange2100: -15 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.25, intensity2100: 0.30, frequencyChange2050: -10, frequencyChange2100: -25 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.30, intensity2100: 0.35, frequencyChange2050: -15, frequencyChange2100: -35 },
    }
  },
  { 
    id: 'h28', 
    code: 'SOL-06', 
    name: 'Landslide', 
    category: HazardCategory.SOLID_MASS,
    scenarioProjections: {
      [ClimateScenario.SSP1_26]: { intensity2050: 0.35, intensity2100: 0.45, frequencyChange2050: 15, frequencyChange2100: 25 },
      [ClimateScenario.SSP2_45]: { intensity2050: 0.45, intensity2100: 0.65, frequencyChange2050: 25, frequencyChange2100: 45 },
      [ClimateScenario.SSP5_85]: { intensity2050: 0.60, intensity2100: 0.90, frequencyChange2050: 40, frequencyChange2100: 80 },
    }
  },
];

// Demo Clients with their operations
export const DEMO_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'EcoEnergy Iberia',
    country: 'Spain',
    sector: 'Renewable Energy',
    description: 'Leading renewable energy developer in the Iberian Peninsula',
    operations: []
  },
  {
    id: 'client-2',
    name: 'LogiCorp Europe',
    country: 'Spain',
    sector: 'Logistics & Warehousing',
    description: 'European logistics and warehousing solutions provider',
    operations: []
  },
  {
    id: 'client-3',
    name: 'North Sea Energy Consortium',
    country: 'Netherlands',
    sector: 'Offshore Wind',
    description: 'Consortium for offshore wind energy development',
    operations: []
  },
  {
    id: 'client-4',
    name: 'Mediterranean Port Authority',
    country: 'Spain',
    sector: 'Port Infrastructure',
    description: 'Public port authority managing Mediterranean ports',
    operations: []
  },
  {
    id: 'client-5',
    name: 'TechData Solutions',
    country: 'Spain',
    sector: 'Data Centers',
    description: 'Data center infrastructure provider',
    operations: []
  },
  {
    id: 'client-6',
    name: 'Iberian Infrastructure Fund',
    country: 'Spain',
    sector: 'Transport Infrastructure',
    description: 'Infrastructure investment fund',
    operations: []
  }
];

export const DEMO_OPERATIONS: Operation[] = [
  {
    id: 'op-1',
    clientId: 'client-1',
    name: 'Iberia Solar PV Portfolio',
    sectorNACE: 'D.35.11',
    country: 'Spain',
    capex: 45000000,
    dealPrice: 42000000, // Precio negociado del deal
    expectedReturn: 8.5, // Retorno esperado anual %
    riskWeightedCapital: 38000000,
    totalAAL: 1250000, // AAL total de la operación
    maxRiskBand: 'Moderate' as RiskBand,
    sustainabilityDiscount: 2.5, // Descuento por cumplimiento DNSH
    riskAdjustment: -1.2, // Ajuste negativo por riesgo climático
    status: 'Review',
    substantialContributionId: DnshObjective.MITIGATION,
    assets: [
      { 
        id: 'a1', 
        operationId: 'op-1', 
        name: 'Seville PV Plant A', 
        assetType: EUAssetType.SOLAR_PV, 
        lat: 37.3891, 
        lng: -5.9845, 
        exposedValue: 15000000,
        attributes: {
          elevationMeters: 12,
          distanceToCoastKm: 65,
          yearBuilt: 2021,
          floodProtectionLevel: 50,
          waterDependency: 'Low',
          temperatureToleranceC: 45,
          naceCode: 'D.35.11',
          taxonomyActivity: '4.1',
          substantialContribution: DnshObjective.MITIGATION,
          siteType: 'Greenfield',
          materials: ['Silicon PV Panels', 'Aluminum Frames', 'Steel Structures', 'Concrete Foundations'],
          constructionYear: 2020,
          operationalYear: 2021,
          capacity: 50,
          capacityUnit: 'MW',
          adaptationHazardScope: {
            'h2': 'In Scope', // Heat stress
            'h5': 'In Scope', // Heat wave
            'h7': 'Out of Scope', // Wildfire
            'h13': 'Out of Scope', // Changing precipitation
          },
          exposureKPIs: {
            'h2': {
              kpi: 'Temperature Increase',
              value: 2.5,
              unit: '°C',
              threshold: 3.0,
              thresholdUnit: '°C',
              status: 'Below Threshold',
              assessmentDate: '2024-01-15'
            },
            'h5': {
              kpi: 'Heat Wave Frequency',
              value: 8,
              unit: 'events/year',
              threshold: 10,
              thresholdUnit: 'events/year',
              status: 'Below Threshold',
              assessmentDate: '2024-01-15'
            }
          }
        },
        // Example DNSH evaluation - Compliant
        dnshEvaluation: {
          assetId: 'a1',
          evaluationDate: '2024-01-15T10:00:00Z',
          evaluator: 'Analyst User',
          mitigationStatus: 'Compliant',
          mitigationEvidence: ['EIA approved', 'No fossil fuel use'],
          adaptationStatus: 'Compliant',
          adaptationStatusPreMeasures: 'Conditional',
          adaptationStatusPostMeasures: 'Compliant',
          waterStatus: 'Compliant',
          waterEvidence: ['Water permit obtained'],
          circularStatus: 'Compliant',
          circularEvidence: ['Recycling plan'],
          pollutionStatus: 'Compliant',
          pollutionEvidence: ['No hazardous materials'],
          biodiversityStatus: 'Compliant',
          biodiversityEvidence: ['KBA assessment completed'],
          overallStatus: 'Compliant'
        }
      },
      { 
        id: 'a2', 
        operationId: 'op-1', 
        name: 'Cordoba PV Plant B', 
        assetType: EUAssetType.SOLAR_PV, 
        lat: 37.8882, 
        lng: -4.7794, 
        exposedValue: 12000000, 
        attributes: {
          elevationMeters: 120,
          distanceToCoastKm: 140,
          yearBuilt: 2022,
          floodProtectionLevel: 100,
          waterDependency: 'Low',
          temperatureToleranceC: 45,
          naceCode: 'D.35.11',
          taxonomyActivity: '4.1',
          substantialContribution: DnshObjective.MITIGATION,
          siteType: 'Brownfield',
          materials: ['Silicon PV Panels', 'Aluminum Frames', 'Steel Structures', 'Concrete Foundations'],
          constructionYear: 2021,
          operationalYear: 2022,
          capacity: 40,
          capacityUnit: 'MW',
          adaptationHazardScope: {
            'h2': 'In Scope', // Heat stress
            'h5': 'In Scope', // Heat wave
            'h13': 'In Scope', // Changing precipitation
            'h14': 'Out of Scope', // Hydrological variability
          },
          exposureKPIs: {
            'h2': {
              kpi: 'Temperature Increase',
              value: 3.2,
              unit: '°C',
              threshold: 3.0,
              thresholdUnit: '°C',
              status: 'Above Threshold',
              assessmentDate: '2024-01-20'
            },
            'h5': {
              kpi: 'Heat Wave Frequency',
              value: 12,
              unit: 'events/year',
              threshold: 10,
              thresholdUnit: 'events/year',
              status: 'Above Threshold',
              assessmentDate: '2024-01-20'
            }
          }
        },
        // Example DNSH evaluation - Non-Compliant (asymmetric case)
        dnshEvaluation: {
          assetId: 'a2',
          evaluationDate: '2024-01-20T14:00:00Z',
          evaluator: 'Analyst User',
          mitigationStatus: 'Compliant',
          mitigationEvidence: ['EIA approved'],
          adaptationStatus: 'Non-Compliant',
          adaptationStatusPreMeasures: 'Non-Compliant',
          adaptationRiskBand: 'High',
          waterStatus: 'Conditional',
          waterEvidence: ['Water permit pending'],
          circularStatus: 'Compliant',
          circularEvidence: [],
          pollutionStatus: 'Compliant',
          pollutionEvidence: [],
          biodiversityStatus: 'Compliant',
          biodiversityEvidence: [],
          overallStatus: 'Non-Compliant',
          overallNotes: 'High climate risk identified. Adaptation measures required.'
        }
      },
      { 
        id: 'a3', 
        operationId: 'op-1', 
        name: 'Malaga Substation', 
        assetType: EUAssetType.ELECTRICITY_GRID, 
        lat: 36.7212, 
        lng: -4.4214, 
        exposedValue: 5000000, 
        attributes: {
          elevationMeters: 5,
          distanceToCoastKm: 0.5,
          yearBuilt: 2015,
          floodProtectionLevel: 20,
          waterDependency: 'Low',
          temperatureToleranceC: 50,
          naceCode: 'D.35.12',
          taxonomyActivity: '4.2',
          siteType: 'Brownfield',
          materials: ['Steel Structures', 'Copper Conductors', 'Concrete Foundations', 'Insulation Materials'],
          constructionYear: 2014,
          operationalYear: 2015,
          capacity: 220,
          capacityUnit: 'kV',
          substantialContribution: DnshObjective.MITIGATION,
          adaptationHazardScope: {
            'h16': 'In Scope', // Flood
            'h17': 'In Scope', // Coastal flood
            'h18': 'Out of Scope', // Sea level rise
            'h2': 'Out of Scope', // Heat stress
          },
          exposureKPIs: {
            'h16': {
              kpi: 'Flood Depth',
              value: 0.8,
              unit: 'm',
              threshold: 1.0,
              thresholdUnit: 'm',
              status: 'Below Threshold',
              assessmentDate: '2024-01-10'
            },
            'h17': {
              kpi: 'Coastal Flood Frequency',
              value: 2,
              unit: 'events/year',
              threshold: 3,
              thresholdUnit: 'events/year',
              status: 'Below Threshold',
              assessmentDate: '2024-01-10'
            }
          }
        },
        // Example DNSH evaluation - Conditional
        dnshEvaluation: {
          assetId: 'a3',
          evaluationDate: '2024-01-25T09:00:00Z',
          evaluator: 'Analyst User',
          mitigationStatus: 'Compliant',
          mitigationEvidence: [],
          adaptationStatus: 'Conditional',
          adaptationStatusPreMeasures: 'Conditional',
          adaptationRiskBand: 'Moderate',
          waterStatus: 'Compliant',
          waterEvidence: [],
          circularStatus: 'Compliant',
          circularEvidence: [],
          pollutionStatus: 'Compliant',
          pollutionEvidence: [],
          biodiversityStatus: 'Compliant',
          biodiversityEvidence: [],
          overallStatus: 'Conditional'
        }
      },
    ]
  },
  {
    id: 'op-2',
    clientId: 'client-2',
    name: 'Valencia Logistics Hub',
    sectorNACE: 'H.52.10',
    country: 'Spain',
    capex: 120000000,
    dealPrice: 115000000,
    expectedReturn: 7.2,
    riskWeightedCapital: 108000000,
    totalAAL: 3200000,
    maxRiskBand: 'High' as RiskBand,
    sustainabilityDiscount: 1.8,
    riskAdjustment: -2.5,
    status: 'Draft',
    substantialContributionId: DnshObjective.ADAPTATION,
    assets: [
      { 
        id: 'a4', 
        operationId: 'op-2', 
        name: 'Warehouse Block A', 
        assetType: EUAssetType.WAREHOUSE, 
        lat: 39.4699, 
        lng: -0.3763, 
        exposedValue: 40000000, 
        attributes: {
          elevationMeters: 15,
          distanceToCoastKm: 4,
          yearBuilt: 2023,
          floodProtectionLevel: 100,
          waterDependency: 'Medium',
          temperatureToleranceC: 35,
          naceCode: 'H.52.10',
          taxonomyActivity: '7.7'
        }
      },
      { 
        id: 'a5', 
        operationId: 'op-2', 
        name: 'Warehouse Block B', 
        assetType: EUAssetType.WAREHOUSE, 
        lat: 39.4800, 
        lng: -0.3800, 
        exposedValue: 40000000, 
        attributes: {
          elevationMeters: 18,
          distanceToCoastKm: 4.5,
          yearBuilt: 2023,
          floodProtectionLevel: 100,
          waterDependency: 'Medium',
          temperatureToleranceC: 35,
          naceCode: 'H.52.10',
          taxonomyActivity: '7.7'
        }
      },
    ]
  },
  {
    id: 'op-3',
    clientId: 'client-3',
    name: 'North Sea Wind Offshore Farm',
    sectorNACE: 'D.35.11',
    country: 'Netherlands',
    capex: 850000000,
    dealPrice: 820000000,
    expectedReturn: 9.2,
    riskWeightedCapital: 780000000,
    totalAAL: 18500000,
    maxRiskBand: 'Very High' as RiskBand,
    sustainabilityDiscount: 3.0,
    riskAdjustment: -3.8,
    status: 'Review',
    substantialContributionId: DnshObjective.MITIGATION,
    assets: [
      { 
        id: 'a6', 
        operationId: 'op-3', 
        name: 'Wind Farm Alpha - Turbine Cluster 1', 
        assetType: EUAssetType.WIND_OFFSHORE, 
        lat: 53.5511, 
        lng: 6.2278, 
        exposedValue: 280000000, 
        attributes: {
          elevationMeters: -25, // Below sea level (offshore)
          distanceToCoastKm: 15,
          yearBuilt: 2024,
          floodProtectionLevel: 0, // N/A for offshore
          waterDependency: 'Low',
          temperatureToleranceC: 40,
          naceCode: 'D.35.11',
          taxonomyActivity: '4.1',
          substantialContribution: DnshObjective.MITIGATION
        }
      },
      { 
        id: 'a7', 
        operationId: 'op-3', 
        name: 'Offshore Substation Platform', 
        assetType: EUAssetType.ELECTRICITY_GRID, 
        lat: 53.5600, 
        lng: 6.2400, 
        exposedValue: 45000000, 
        attributes: {
          elevationMeters: -20,
          distanceToCoastKm: 15,
          yearBuilt: 2024,
          floodProtectionLevel: 0,
          waterDependency: 'Low',
          temperatureToleranceC: 45,
          naceCode: 'D.35.12',
          taxonomyActivity: '4.2'
        }
      },
    ]
  },
  {
    id: 'op-4',
    clientId: 'client-4',
    name: 'Barcelona Port Expansion',
    sectorNACE: 'H.52.22',
    country: 'Spain',
    capex: 320000000,
    dealPrice: 305000000,
    expectedReturn: 6.8,
    riskWeightedCapital: 290000000,
    totalAAL: 8500000,
    maxRiskBand: 'High' as RiskBand,
    sustainabilityDiscount: 2.0,
    riskAdjustment: -2.8,
    status: 'Review',
    substantialContributionId: DnshObjective.ADAPTATION,
    assets: [
      { 
        id: 'a8', 
        operationId: 'op-4', 
        name: 'Container Terminal A', 
        assetType: EUAssetType.PORT, 
        lat: 41.3542, 
        lng: 2.1474, 
        exposedValue: 180000000, 
        attributes: {
          elevationMeters: 2,
          distanceToCoastKm: 0,
          yearBuilt: 2025,
          floodProtectionLevel: 50,
          waterDependency: 'High',
          temperatureToleranceC: 35,
          naceCode: 'H.52.22',
          taxonomyActivity: '6.8'
        }
      },
      { 
        id: 'a9', 
        operationId: 'op-4', 
        name: 'Port Administration Building', 
        assetType: EUAssetType.COMMERCIAL_BUILDING, 
        lat: 41.3560, 
        lng: 2.1500, 
        exposedValue: 12000000, 
        attributes: {
          elevationMeters: 8,
          distanceToCoastKm: 0.2,
          yearBuilt: 2025,
          floodProtectionLevel: 100,
          waterDependency: 'Medium',
          temperatureToleranceC: 30,
          naceCode: 'H.52.22',
          taxonomyActivity: '7.7'
        }
      },
    ]
  },
  {
    id: 'op-5',
    clientId: 'client-5',
    name: 'Madrid Data Center Campus',
    sectorNACE: 'J.63.11',
    country: 'Spain',
    capex: 150000000,
    dealPrice: 145000000,
    expectedReturn: 7.5,
    riskWeightedCapital: 138000000,
    totalAAL: 2100000,
    maxRiskBand: 'Moderate' as RiskBand,
    sustainabilityDiscount: 2.2,
    riskAdjustment: -1.5,
    status: 'Draft',
    substantialContributionId: DnshObjective.MITIGATION,
    assets: [
      { 
        id: 'a10', 
        operationId: 'op-5', 
        name: 'Data Center Building 1', 
        assetType: EUAssetType.DATA_CENTER, 
        lat: 40.4168, 
        lng: -3.7038, 
        exposedValue: 75000000, 
        attributes: {
          elevationMeters: 650,
          distanceToCoastKm: 300,
          yearBuilt: 2023,
          floodProtectionLevel: 100,
          waterDependency: 'High', // Cooling systems
          temperatureToleranceC: 25, // Critical for servers
          naceCode: 'J.63.11',
          taxonomyActivity: '8.1'
        }
      },
      { 
        id: 'a11', 
        operationId: 'op-5', 
        name: 'Data Center Building 2', 
        assetType: EUAssetType.DATA_CENTER, 
        lat: 40.4180, 
        lng: -3.7050, 
        exposedValue: 75000000, 
        attributes: {
          elevationMeters: 650,
          distanceToCoastKm: 300,
          yearBuilt: 2024,
          floodProtectionLevel: 100,
          waterDependency: 'High',
          temperatureToleranceC: 25,
          naceCode: 'J.63.11',
          taxonomyActivity: '8.1'
        }
      },
    ]
  },
  {
    id: 'op-6',
    clientId: 'client-6',
    name: 'A-4 Highway Section',
    sectorNACE: 'H.49.41',
    country: 'Spain',
    capex: 280000000,
    dealPrice: 275000000,
    expectedReturn: 6.5,
    riskWeightedCapital: 260000000,
    totalAAL: 5200000,
    maxRiskBand: 'Moderate' as RiskBand,
    sustainabilityDiscount: 1.5,
    riskAdjustment: -1.8,
    status: 'Review',
    substantialContributionId: DnshObjective.ADAPTATION,
    assets: [
      { 
        id: 'a12', 
        operationId: 'op-6', 
        name: 'Highway Section A-4 (km 50-75)', 
        assetType: EUAssetType.HIGHWAY, 
        lat: 38.3452, 
        lng: -4.7794, 
        exposedValue: 280000000, 
        attributes: {
          elevationMeters: 200,
          distanceToCoastKm: 120,
          yearBuilt: 2018,
          floodProtectionLevel: 50,
          waterDependency: 'Low',
          temperatureToleranceC: 50,
          naceCode: 'H.49.41',
          taxonomyActivity: '6.6'
        }
      },
    ],
    evidenceDocuments: [
      {
        id: 'ev-1',
        operationId: 'op-1',
        name: 'Technical Due Diligence - Iberia Solar PV',
        type: EvidenceType.TECHNICAL_DUE_DILIGENCE,
        description: 'TDD completo realizado por consultora externa. Incluye análisis técnico, financiero y de riesgos climáticos.',
        uploadDate: '2024-01-15T10:00:00Z',
        uploadedBy: 'Analyst User',
        fileUrl: 'https://example.com/documents/tdd-iberia-solar.pdf',
        documentDate: '2024-01-10',
        author: 'Consultora XYZ',
        language: 'ES',
        relatedObjective: DnshObjective.MITIGATION,
        tags: ['TDD', 'Solar PV', 'Climate Risk']
      },
      {
        id: 'ev-2',
        operationId: 'op-1',
        assetId: 'a1',
        name: 'EIA - Seville PV Plant A',
        type: EvidenceType.ENVIRONMENTAL_IMPACT_ASSESSMENT,
        description: 'Estudio de Impacto Ambiental para la planta fotovoltaica de Sevilla. Aprobado por autoridad competente.',
        uploadDate: '2024-01-20T14:30:00Z',
        uploadedBy: 'Analyst User',
        fileUrl: 'https://example.com/documents/eia-seville-pv.pdf',
        documentDate: '2023-12-15',
        author: 'Environmental Consulting Group',
        language: 'ES',
        relatedObjective: DnshObjective.BIODIVERSITY,
        tags: ['EIA', 'Biodiversity', 'Environmental']
      }
    ]
  }
];

export const AVAILABLE_MEASURES: Measure[] = [
  { 
    id: 'm1', 
    name: 'Flood Barriers (0.5m)', 
    description: 'Install perimeter flood protection walls.', 
    cost: 500000, 
    reductionFactor: 0.8,
    mitigatesHazards: ['h21'], // Flood (coastal, fluvial, pluvial, ground water)
    riskReductionPercentage: 20
  },
  { 
    id: 'm2', 
    name: 'Enhanced Drainage System', 
    description: 'Upgrade storm water drainage capacity for 1-in-100yr events.', 
    cost: 250000, 
    reductionFactor: 0.6,
    mitigatesHazards: ['h21', 'h20'], // Flood, Heavy precipitation
    riskReductionPercentage: 40
  },
  { 
    id: 'm3', 
    name: 'Heat-Resistant Materials', 
    description: 'Use PV panels rated for higher operating temperatures.', 
    cost: 1000000, 
    reductionFactor: 0.4,
    mitigatesHazards: ['h2', 'h5', 'h1'], // Heat stress, Heat wave, Changing temperature
    riskReductionPercentage: 60
  },
  { 
    id: 'm4', 
    name: 'Vegetation Management', 
    description: 'Create fire breaks and manage surrounding vegetation.', 
    cost: 50000, 
    reductionFactor: 0.9,
    mitigatesHazards: ['h7'], // Wildfire
    riskReductionPercentage: 10
  },
  { 
    id: 'm5', 
    name: 'HVAC Upgrade', 
    description: 'Install high-efficiency cooling systems for extreme heat.', 
    cost: 750000, 
    reductionFactor: 0.7,
    mitigatesHazards: ['h2', 'h5', 'h1'], // Heat stress, Heat wave, Changing temperature
    riskReductionPercentage: 30
  },
  { 
    id: 'm6', 
    name: 'Coastal Reinforcement', 
    description: 'Reinforce sea walls and coastal foundations.', 
    cost: 2000000, 
    reductionFactor: 0.85,
    mitigatesHazards: ['h21', 'h17', 'h23'], // Flood, Sea level rise, Coastal erosion
    riskReductionPercentage: 15
  },
];

export const DNSH_CHECKLIST_TEMPLATES: DnshChecklistTemplate[] = [
  {
    objective: DnshObjective.MITIGATION,
    title: 'Climate Change Mitigation',
    description: 'Ensure the activity does not lead to significant greenhouse gas emissions.',
    questions: [
      { id: 'm1', text: 'Does the activity involve the combustion of fossil fuels?', guidance: 'Check for generators, vehicles, heating systems, or any direct fossil fuel consumption.' },
      { id: 'm2', text: 'Is the activity aligned with the 1.5 degree scenario?', guidance: 'Verify against sector-specific decarbonization pathways and EU Taxonomy technical screening criteria.' },
      { id: 'm3', text: 'Are GHG emissions quantified and within acceptable thresholds?', guidance: 'Review emissions inventory and compare against sector benchmarks and EU Taxonomy thresholds.' },
      { id: 'm4', text: 'Does the activity contribute to increased emissions elsewhere?', guidance: 'Assess indirect emissions and ensure no significant upstream or downstream emission increases.' },
      { id: 'm5', text: 'Are there plans to reduce emissions over time?', guidance: 'Check for decarbonization roadmap and interim targets aligned with Paris Agreement goals.' }
    ]
  },
  {
    objective: DnshObjective.ADAPTATION,
    title: 'Climate Change Adaptation',
    description: 'Ensure the activity does not adversely affect adaptation efforts or increase vulnerability to climate change.',
    questions: [
      { id: 'a1', text: 'Has a Physical Climate Risk Assessment (EP4 CRVA) been conducted?', guidance: 'Check for comprehensive EP4-aligned assessment of physical climate risks (hazards, exposure, vulnerability) across relevant time horizons (2030, 2050, 2100) and scenarios (SSP1-2.6, SSP2-4.5, SSP5-8.5).' },
      { id: 'a2', text: 'Are physical climate risks material (High or Very High risk band)?', guidance: 'Review risk assessment results. Material risks (High/Very High) require adaptation measures to achieve DNSH compliance.' },
      { id: 'a3', text: 'Have appropriate adaptation measures been implemented or planned?', guidance: 'Verify that EP4 adaptation measures address identified material risks and reduce vulnerability to acceptable levels (Low/Medium risk band).' },
      { id: 'a4', text: 'Does the activity avoid increasing vulnerability to climate change?', guidance: 'Ensure the activity does not exacerbate existing climate risks or create new vulnerabilities for the asset or surrounding areas.' },
      { id: 'a5', text: 'Is the activity resilient to projected climate scenarios?', guidance: 'Verify that adaptation measures consider multiple climate scenarios (SSP1-2.6, SSP2-4.5, SSP5-8.5) and time horizons (2030, 2050, 2100).' },
      { id: 'a6', text: 'Has residual risk been assessed and documented?', guidance: 'EP4 requires assessment of residual risk after adaptation measures. Document remaining risk level and justification.' },
      { id: 'a7', text: 'Is there a monitoring and review plan for adaptation measures?', guidance: 'EP4 requires ongoing monitoring. Verify plan for tracking effectiveness and updating measures as needed.' }
    ]
  },
  {
    objective: DnshObjective.WATER,
    title: 'Water & Marine Resources',
    description: 'Ensure the sustainable use and protection of water and marine resources.',
    questions: [
      { id: 'w1', text: 'Does the activity have a valid Water Extraction Permit?', guidance: 'Check compliance with local river basin management plans, water stress zones, and regulatory requirements.' },
      { id: 'w2', text: 'Are measures in place to prevent water quality deterioration?', guidance: 'Look for filtration systems, runoff management, wastewater treatment, and pollution prevention measures.' },
      { id: 'w3', text: 'Is the activity located in a water-stressed area?', guidance: 'Review WRI Aqueduct water stress indices, groundwater depletion rates, and local water availability data.' },
      { id: 'w4', text: 'Does the activity comply with Water Framework Directive (WFD) requirements?', guidance: 'Ensure no significant deterioration of water bodies status and compliance with WFD objectives.' },
      { id: 'w5', text: 'Are groundwater resources protected from overexploitation?', guidance: 'Check for monitoring systems, sustainable extraction limits, and recharge protection measures.' },
      { id: 'w6', text: 'Does the activity affect marine ecosystems?', guidance: 'If coastal or marine, assess impacts on marine biodiversity, water quality, and ecosystem services.' },
      { id: 'w7', text: 'Are water efficiency measures implemented?', guidance: 'Verify water-saving technologies, recycling systems, and efficiency targets are in place.' }
    ]
  },
  {
    objective: DnshObjective.CIRCULAR,
    title: 'Circular Economy',
    description: 'Promote the transition to a circular economy.',
    questions: [
      { id: 'c1', text: 'Is there a comprehensive Waste Management Plan in place?', guidance: 'Must prioritize waste hierarchy: prevention, reuse, recycling over disposal. Check for waste reduction targets.' },
      { id: 'c2', text: 'Does the activity use durable and recyclable materials?', guidance: 'Check material data sheets, recyclability rates, and design for disassembly principles.' },
      { id: 'c3', text: 'Is there a plan for end-of-life management?', guidance: 'Verify plans for decommissioning, material recovery, and circularity of components.' },
      { id: 'c4', text: 'Does the activity promote resource efficiency?', guidance: 'Assess material intensity, resource productivity, and circularity indicators.' },
      { id: 'c5', text: 'Are recycled or renewable materials prioritized?', guidance: 'Check material sourcing policies and percentage of recycled/renewable content.' },
      { id: 'c6', text: 'Does the activity avoid planned obsolescence?', guidance: 'Ensure products/systems are designed for longevity, repairability, and upgradability.' }
    ]
  },
  {
    objective: DnshObjective.POLLUTION,
    title: 'Pollution Prevention',
    description: 'Prevent and control pollution to air, water or land.',
    questions: [
      { id: 'p1', text: 'Do emissions exceed the Best Available Techniques (BAT) levels?', guidance: 'Compare against EU BAT Reference Documents (BREFs) and ensure compliance with BAT-associated emission levels (BAT-AELs).' },
      { id: 'p2', text: 'Are hazardous substances used or stored on site?', guidance: 'Ensure proper containment, safety protocols, spill prevention, and emergency response plans.' },
      { id: 'p3', text: 'Are air quality standards met?', guidance: 'Verify compliance with EU Air Quality Directive and local air quality standards for NOx, SOx, PM, VOCs.' },
      { id: 'p4', text: 'Is soil contamination prevented?', guidance: 'Check for impermeable surfaces, containment systems, and monitoring for soil contamination.' },
      { id: 'p5', text: 'Are noise emissions within acceptable limits?', guidance: 'Verify compliance with noise regulations and implementation of noise reduction measures.' },
      { id: 'p6', text: 'Is there a pollution prevention and control plan?', guidance: 'Check for comprehensive pollution management system, monitoring, and continuous improvement.' },
      { id: 'p7', text: 'Are emergency response procedures in place?', guidance: 'Verify spill response, accident prevention, and emergency preparedness plans.' }
    ]
  },
  {
    objective: DnshObjective.BIODIVERSITY,
    title: 'Biodiversity & Ecosystems',
    description: 'Protect and restore biodiversity and ecosystems.',
    questions: [
      { id: 'b1', text: 'Is the activity located in or near a protected area (Natura 2000, KBA, etc.)?', guidance: 'Check proximity to Key Biodiversity Areas (KBAs), Natura 2000 sites, and other protected areas. Requires Appropriate Assessment if within or near protected areas.' },
      { id: 'b2', text: 'Are invasive alien species managed?', guidance: 'Check for monitoring, prevention, and removal plans for invasive species.' },
      { id: 'b3', text: 'Does the activity avoid significant harm to threatened species or ecosystems?', guidance: 'Review IUCN Red List species, ecosystem assessments, and ensure no significant negative impacts on biodiversity.' },
      { id: 'b4', text: 'Is there a comprehensive biodiversity impact assessment?', guidance: 'Ensure assessment covers impacts on flora, fauna, habitats, ecosystem services, and connectivity.' },
      { id: 'b5', text: 'Are biodiversity offsets or compensation measures required?', guidance: 'If impacts cannot be avoided, verify appropriate offset or compensation measures following mitigation hierarchy.' },
      { id: 'b6', text: 'Does the activity contribute to ecosystem restoration?', guidance: 'Check for positive biodiversity contributions such as habitat restoration, native species planting, or ecosystem enhancement.' },
      { id: 'b7', text: 'Is there a biodiversity monitoring plan?', guidance: 'Verify ongoing monitoring of biodiversity indicators and adaptive management approach.' }
    ]
  }
];
