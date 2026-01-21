
export enum HazardCategory {
  TEMPERATURE = "Temperature-related",
  WIND = "Wind-related",
  WATER = "Water-related",
  SOLID_MASS = "Solid mass-related"
}

export enum DnshObjective {
  MITIGATION = "Climate Change Mitigation",
  ADAPTATION = "Climate Change Adaptation",
  WATER = "Water & Marine Resources",
  CIRCULAR = "Circular Economy",
  POLLUTION = "Pollution Prevention",
  BIODIVERSITY = "Biodiversity & Ecosystems"
}

export type UserRole = 'Analyst' | 'Manager' | 'Admin' | 'Viewer';

// Permissions for fine-grained access control
export interface UserPermissions {
  canViewOperations: boolean;
  canEditOperations: boolean;
  canDeleteOperations: boolean;
  canEvaluateDNSH: boolean;
  canApproveEvaluations: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManageEvidence: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  // Security fields
  passwordHash?: string; // In real app, never store plain passwords
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  // Permissions
  permissions: UserPermissions;
  // Organization/Department
  organization?: string;
  department?: string;
}

// Climate Scenarios - SSP (Shared Socioeconomic Pathways)
export enum ClimateScenario {
  SSP1_26 = 'SSP1-2.6', // Optimistic - Low emissions, sustainable development
  SSP2_45 = 'SSP2-4.5', // Baseline - Intermediate emissions, middle-of-the-road
  SSP5_85 = 'SSP5-8.5', // Pessimistic - High emissions, fossil-fueled development
}

export interface ClimateMetrics {
  // Temperature metrics
  temperatureIncrease: number; // °C
  maxTemperatureIncrease: number; // °C (extreme events)
  heatWaveFrequency: number; // events/year
  heatWaveIntensity: number; // °C above baseline
  coldWaveFrequency: number; // events/year
  
  // Precipitation metrics
  precipitationChange: number; // % change
  heavyPrecipitationFrequency: number; // events/year
  heavyPrecipitationIntensity: number; // mm/day
  droughtFrequency: number; // events/year
  droughtSeverity: number; // 0-1 scale
  
  // Sea level & coastal
  seaLevelRise: number; // cm
  coastalErosionRate: number; // m/year
  stormSurgeHeight: number; // m
  
  // Wind metrics
  windSpeedIncrease: number; // % change
  extremeWindFrequency: number; // events/year
  cycloneFrequency: number; // events/year
  
  // Other metrics
  wildfireRisk: number; // 0-1 scale
  soilMoistureChange: number; // % change
  permafrostThawDepth: number; // m (for relevant regions)
  oceanAcidification: number; // pH change
}

export interface ClimateScenarioConfig {
  id: ClimateScenario;
  label: string;
  description: string;
  rcpEquivalent?: string; // For backward compatibility
  temperatureIncrease2050: number; // °C increase by 2050
  temperatureIncrease2100: number; // °C increase by 2100
  seaLevelRise2050: number; // cm by 2050
  seaLevelRise2100: number; // cm by 2100
  precipitationChange2050: number; // % change by 2050 (region-dependent)
  color: string; // UI color
  // Expanded metrics for 2030, 2050, 2100
  metrics2030: ClimateMetrics;
  metrics2050: ClimateMetrics;
  metrics2100: ClimateMetrics;
}

export interface HazardThreshold {
  hazardId: string;
  metric: keyof ClimateMetrics;
  thresholdValue: number;
  comparison: '>' | '<' | '>=' | '<=' | '==';
  unit: string;
  description: string;
}

export interface HazardType {
  id: string;
  code: string;
  name: string;
  category: HazardCategory;
  // Scenario-specific projections
  scenarioProjections?: {
    [scenario in ClimateScenario]?: {
      intensity2050: number; // 0-1 normalized intensity
      intensity2100: number; // 0-1 normalized intensity
      frequencyChange2050: number; // % change in frequency
      frequencyChange2100: number; // % change in frequency
      spatialExtent?: string; // Affected regions
    };
  };
  // Threshold for materiality determination
  threshold?: HazardThreshold;
}

// Key Biodiversity Area (KBA) - Global standard for biodiversity conservation
export enum KBACriteria {
  A1 = 'A1', // Threatened species
  A2 = 'A2', // Restricted-range species
  A3 = 'A3', // Species assemblages
  A4 = 'A4', // Biome-restricted species
  B1 = 'B1', // Threatened ecosystem types
  B2 = 'B2', // Threatened ecosystem assemblages
  B3 = 'B3', // Ecological integrity
  D1 = 'D1', // Ecological integrity (quantitative)
  D2 = 'D2', // Ecological integrity (qualitative)
}

export enum KBADesignation {
  GLOBAL = 'Global KBA',
  REGIONAL = 'Regional KBA',
  NATIONAL = 'National KBA',
  PROPOSED = 'Proposed KBA',
}

export interface KeyBiodiversityArea {
  id: string;
  name: string;
  country: string;
  region?: string;
  designation: KBADesignation;
  criteria: KBACriteria[];
  areaKm2: number;
  // Polygon coordinates (simplified for visualization)
  polygon: [number, number][]; // [lat, lng] pairs
  // Center point for marker
  centerLat: number;
  centerLng: number;
  // Conservation status
  protectedStatus?: 'Fully Protected' | 'Partially Protected' | 'Unprotected' | 'Unknown';
  // Key species/ecosystems
  keySpecies?: string[];
  keyEcosystems?: string[];
  // IUCN Red List species count
  threatenedSpeciesCount?: number;
  // Link to Natura 2000 if applicable
  natura2000SiteId?: string;
  // Description
  description?: string;
  // Distance from asset (calculated)
  distanceFromAssetKm?: number;
}

// Water Risk Zones - For Water & Marine Resources objective
export enum WaterRiskType {
  WATER_STRESS = 'Water Stress',
  DROUGHT = 'Drought',
  GROUNDWATER_DEPLETION = 'Groundwater Depletion',
  WATER_QUALITY_DEGRADATION = 'Water Quality Degradation',
  PROTECTED_WATER_AREA = 'Protected Water Area',
  RIVER_BASIN = 'River Basin',
  AQUIFER = 'Aquifer',
  WETLAND = 'Wetland',
}

export enum WaterRiskLevel {
  VERY_HIGH = 'Very High',
  HIGH = 'High',
  MODERATE = 'Moderate',
  LOW = 'Low',
  UNKNOWN = 'Unknown',
}

export interface WaterRiskZone {
  id: string;
  name: string;
  country: string;
  region?: string;
  riskType: WaterRiskType;
  riskLevel: WaterRiskLevel;
  // Polygon coordinates for visualization
  polygon: [number, number][]; // [lat, lng] pairs
  // Center point
  centerLat: number;
  centerLng: number;
  // Area in km²
  areaKm2: number;
  // Water stress index (0-5, where 5 is highest stress)
  waterStressIndex?: number;
  // Groundwater level change (cm/year, negative = depletion)
  groundwaterChangeCmPerYear?: number;
  // Protected status
  protectedStatus?: 'Protected' | 'Partially Protected' | 'Unprotected';
  // River basin or aquifer name
  basinName?: string;
  aquiferName?: string;
  // Water quality indicators
  waterQualityStatus?: 'Good' | 'Moderate' | 'Poor' | 'Bad';
  // Description
  description?: string;
  // Distance from asset (calculated)
  distanceFromAssetKm?: number;
  // Related EU directives
  wfdStatus?: string; // Water Framework Directive status
  nrdStatus?: string; // Nitrates Directive status
}

// EU Taxonomy Asset Types (aligned with EU Taxonomy Regulation)
export enum EUAssetType {
  // Energy
  SOLAR_PV = 'Solar PV',
  WIND_ONSHORE = 'Wind Onshore',
  WIND_OFFSHORE = 'Wind Offshore',
  HYDROELECTRIC = 'Hydroelectric',
  GEOTHERMAL = 'Geothermal',
  BIOMASS = 'Biomass',
  NUCLEAR = 'Nuclear',
  
  // Infrastructure
  DATA_CENTER = 'Data Center',
  TELECOMMUNICATIONS = 'Telecommunications',
  ELECTRICITY_GRID = 'Electricity Grid',
  GAS_GRID = 'Gas Grid',
  WATER_INFRASTRUCTURE = 'Water Infrastructure',
  WASTE_WATER_TREATMENT = 'Waste Water Treatment',
  
  // Transport
  RAILWAY = 'Railway',
  HIGHWAY = 'Highway',
  PORT = 'Port',
  AIRPORT = 'Airport',
  URBAN_TRANSPORT = 'Urban Transport',
  
  // Real Estate & Buildings
  RESIDENTIAL_BUILDING = 'Residential Building',
  COMMERCIAL_BUILDING = 'Commercial Building',
  INDUSTRIAL_BUILDING = 'Industrial Building',
  WAREHOUSE = 'Warehouse',
  
  // Industry
  MANUFACTURING = 'Manufacturing',
  CHEMICAL_PLANT = 'Chemical Plant',
  STEEL_PLANT = 'Steel Plant',
  CEMENT_PLANT = 'Cement Plant',
  
  // Other
  AGRICULTURE = 'Agriculture',
  FORESTRY = 'Forestry',
  OTHER = 'Other'
}

export interface AssetAttributes {
  elevationMeters: number;      // Critical for Flood/Sea Level
  distanceToCoastKm: number;    // Critical for Coastal/Saline
  yearBuilt: number;            // Affects vulnerability (codes change)
  floodProtectionLevel: number; // Return period protection (e.g., 100 years)
  waterDependency: 'Low' | 'Medium' | 'High'; // For Drought
  temperatureToleranceC: number; // Max operating temp before efficiency loss
  // Additional EU Taxonomy relevant attributes
  naceCode?: string;            // NACE code for the specific asset activity
  taxonomyActivity?: string;    // EU Taxonomy activity code (e.g., 4.1, 4.2)
  substantialContribution?: DnshObjective; // Primary objective for this asset
  // Extended asset information
  siteType?: 'Brownfield' | 'Greenfield'; // Site development type (optional for backward compatibility)
  materials?: string[]; // Key construction/operational materials
  constructionYear?: number; // Year construction started
  operationalYear?: number; // Year operations started
  capacity?: number; // Capacity (MW for energy, m² for buildings, etc.)
  capacityUnit?: string; // Unit for capacity (MW, m², etc.)
  // Adaptation-specific: Hazard scope
  adaptationHazardScope?: {
    [hazardId: string]: 'In Scope' | 'Out of Scope' | 'Not Assessed';
  };
  // Exposure evaluation KPIs and thresholds
  exposureKPIs?: {
    [hazardId: string]: {
      kpi: string; // KPI name (e.g., "Temperature Increase", "Flood Depth")
      value: number;
      unit: string;
      threshold: number;
      thresholdUnit: string;
      status: 'Below Threshold' | 'At Threshold' | 'Above Threshold';
      assessmentDate?: string;
    };
  };
}

export interface Asset {
  id: string;
  operationId: string;
  name: string;
  assetType: EUAssetType;      // Updated to use EU taxonomy types
  lat: number;                  // Latitude - critical for climate risk assessment
  lng: number;                  // Longitude - critical for climate risk assessment
  exposedValue: number;         // In EUR
  attributes: AssetAttributes;
  // DNSH Evaluation per asset
  dnshEvaluation?: AssetDnshEvaluation;
}

// DNSH Evaluation at Asset Level (EU Regulation compliant)
export interface AssetDnshEvaluation {
  assetId: string;
  evaluationDate: string;
  evaluator: string;
  
  // Objective 1: Climate Change Mitigation
  mitigationStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  mitigationEvidence: string[];
  mitigationNotes?: string;
  
  // Objective 2: Climate Change Adaptation
  adaptationStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  adaptationStatusPreMeasures: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  adaptationStatusPostMeasures?: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  adaptationRiskBand?: RiskBand;
  adaptationRiskBandPreMeasures?: RiskBand;
  adaptationRiskBandPostMeasures?: RiskBand;
  adaptationAAL?: number; // Reference only
  adaptationMeasures?: string[]; // Applied measure IDs
  adaptationNotes?: string;
  
  // Objective 3: Water & Marine Resources
  waterStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  waterEvidence: string[];
  waterNotes?: string;
  
  // Objective 4: Circular Economy
  circularStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  circularEvidence: string[];
  circularNotes?: string;
  
  // Objective 5: Pollution Prevention
  pollutionStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  pollutionEvidence: string[];
  pollutionNotes?: string;
  
  // Objective 6: Biodiversity & Ecosystems
  biodiversityStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  biodiversityEvidence: string[];
  biodiversityNotes?: string;
  
  // Overall DNSH Status
  overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  overallNotes?: string;
  
  // Extended fields for enhanced evaluation
  substantialContribution?: {
    objective: DnshObjective;
    contributionType: 'Primary' | 'Secondary' | 'Enabling';
    justification: string;
    evidenceIds: string[];
  };
  
  // Checklist answers per objective
  checklistAnswers?: {
    [objective in DnshObjective]?: {
      [questionId: string]: {
        response: 'Yes' | 'No' | 'N/A';
        evidence: string;
        evidenceIds: string[];
        assessedDate: string;
      };
    };
  };
  
  // Scenario comparison references
  scenarioComparisons?: {
    [objective in DnshObjective]?: {
      scenario: ClimateScenario;
      timeHorizon: '2030' | '2050' | '2100';
      comparisonResult: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
      notes?: string;
    }[];
  };
}

// Evidence/Document Types
export enum EvidenceType {
  TECHNICAL_DUE_DILIGENCE = 'Technical Due Diligence (TDD)',
  ENVIRONMENTAL_IMPACT_ASSESSMENT = 'Environmental Impact Assessment (EIA)',
  DNSH_ASSESSMENT_THIRD_PARTY = 'DNSH Assessment (Third Party)',
  CLIMATE_RISK_ASSESSMENT = 'Climate Risk Assessment',
  ADAPTATION_PLAN = 'Adaptation Plan',
  ENVIRONMENTAL_PERMIT = 'Environmental Permit',
  WATER_PERMIT = 'Water Permit',
  BIODIVERSITY_STUDY = 'Biodiversity Study',
  WASTE_MANAGEMENT_PLAN = 'Waste Management Plan',
  EMISSION_REPORT = 'Emission Report',
  OTHER = 'Other'
}

export interface EvidenceDocument {
  id: string;
  operationId: string;
  assetId?: string; // Optional: if evidence is asset-specific
  name: string;
  type: EvidenceType;
  description?: string;
  uploadDate: string;
  uploadedBy: string;
  fileUrl?: string; // URL to document (in real app, would be storage URL)
  fileSize?: number; // in bytes
  mimeType?: string;
  version?: string;
  // Metadata
  documentDate?: string; // Date of the document itself
  author?: string; // Author/organization that created the document
  language?: string;
  // Association with DNSH evaluation
  relatedObjective?: DnshObjective;
  relatedQuestionId?: string; // If linked to specific DNSH question
  tags?: string[];
}

export interface Client {
  id: string;
  name: string;
  country?: string;
  sector?: string;
  description?: string;
  operations: Operation[];
}

export interface Operation {
  id: string;
  clientId: string; // Reference to parent client
  name: string;
  sectorNACE: string;
  country: string;
  capex: number;
  status: 'Draft' | 'Review' | 'Compliant' | 'Non-Compliant';
  substantialContributionId: DnshObjective;
  assets: Asset[];
  evidenceDocuments?: EvidenceDocument[]; // Registry of evidence documents
  // Financial metrics
  dealPrice?: number; // Precio del deal (puede diferir de capex)
  expectedReturn?: number; // Retorno esperado anual (%)
  riskWeightedCapital?: number; // Capital ponderado por riesgo
  // Risk metrics
  totalAAL?: number; // Annual Average Loss total de la operación
  maxRiskBand?: RiskBand; // Mayor nivel de riesgo identificado
  // Sustainability impact
  sustainabilityDiscount?: number; // Descuento aplicado por cumplimiento DNSH (%)
  riskAdjustment?: number; // Ajuste de riesgo aplicado (%)
  // Enhanced evaluation configuration
  evaluationConfig?: {
    groupingStrategy?: 'ByAssetType' | 'ByLocation' | 'ByRiskProfile' | 'Auto';
    evaluationApproach?: 'Aggregated' | 'Granular' | 'Hybrid';
    requireEvidence?: boolean;
    includeScenarioComparison?: boolean;
    scenarioComparisonObjectives?: DnshObjective[];
  };
}

export interface RiskResult {
  hazardTypeId: string;
  assetId: string;
  intensity: number; 
  damageRatio: number; 
  aal: number; 
  aalAfterMeasure?: number;
}

// BBVA Methodology Types
export type RiskBand = 'Low' | 'Moderate' | 'High' | 'Very High';

export interface AdaptationAssessment {
  hazardTypeId: string;
  // BBVA Scoring H+E+V
  scoreHazard: number; // 0-5
  scoreExposure: number; // 0-5
  scoreVulnerability: number; // 0-5
  totalScore: number; // 0-15
  riskBand: RiskBand;
  
  materiality: boolean; // True if Band is High or Very High
  maxIntensity: number; // Kept for UI display
  totalAAL: number; // Kept for reference but not primary focus
  
  measuresRequired: boolean;
  status: 'Pass' | 'Fail' | 'Conditional';
  
  // DNSH Diagnosis Pre/Post Measures
  dnshStatusPreMeasures: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  dnshStatusPostMeasures?: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  selectedMeasures?: string[]; // Measure IDs
  riskBandPostMeasures?: RiskBand;
  totalScorePostMeasures?: number;
}

export interface Measure {
  id: string;
  name: string;
  description: string;
  cost: number;
  reductionFactor: number; // 0-1, where 0.8 means 20% reduction (1-0.8=0.2)
  mitigatesHazards: string[]; // Array of hazard IDs that this measure mitigates
  riskReductionPercentage: number; // Explicit percentage reduction (e.g., 20 for 20%)
}

export interface DnshQuestion {
  id: string;
  text: string;
  guidance: string;
}

export interface DnshChecklistTemplate {
  objective: DnshObjective;
  title: string;
  description: string;
  questions: DnshQuestion[];
  // Asset-type specific questions (EU Taxonomy alignment)
  assetTypeSpecific?: {
    [key in EUAssetType]?: DnshQuestion[];
  };
}

  // Asset-level DNSH Answer
export interface AssetDnshAnswer {
  assetId: string;
  questionId: string;
  objective: DnshObjective;
  response: 'Yes' | 'No' | 'N/A' | null;
  evidence: string;
  supportingDocuments?: string[]; // Evidence document IDs
  assessedBy?: string;
  assessedDate?: string;
}
