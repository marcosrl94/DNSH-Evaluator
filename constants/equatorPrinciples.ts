/**
 * Equator Principles Terminology and Standards
 * 
 * The Equator Principles (EP) are a risk management framework adopted by financial institutions
 * for determining, assessing and managing environmental and social risk in projects.
 * 
 * This file provides terminology and standards aligned with EP4 (Equator Principles IV)
 * for Physical Climate Risk Assessment and Adaptation Planning.
 */

/**
 * EP4 Physical Climate Risk Assessment Categories
 */
export enum EPPhysicalRiskCategory {
  ACUTE = 'Acute', // Event-driven risks (storms, floods, wildfires)
  CHRONIC = 'Chronic' // Longer-term shifts (sea level rise, temperature changes)
}

/**
 * EP4 Risk Assessment Outcome
 */
export enum EPRiskAssessmentOutcome {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

/**
 * EP4 Adaptation Pathway Types
 * Based on EP4 guidance for adaptation planning
 */
export enum EPAdaptationPathwayType {
  AVOID = 'Avoid', // Avoid exposure to climate risk
  REDUCE = 'Reduce', // Reduce vulnerability or exposure
  TRANSFER = 'Transfer', // Transfer risk (insurance, contracts)
  ACCEPT = 'Accept' // Accept residual risk
}

/**
 * EP4 Adaptation Measure Categories
 */
export enum EPAdaptationMeasureCategory {
  STRUCTURAL = 'Structural', // Physical infrastructure (sea walls, drainage)
  NATURE_BASED = 'Nature-Based', // Ecosystem-based solutions (wetlands, forests)
  INSTITUTIONAL = 'Institutional', // Policies, procedures, governance
  TECHNOLOGICAL = 'Technological', // Technology solutions (early warning systems)
  BEHAVIORAL = 'Behavioral' // Changes in operations or practices
}

/**
 * EP4 Residual Risk Assessment
 * Risk remaining after adaptation measures are implemented
 */
export interface EPResidualRisk {
  level: EPRiskAssessmentOutcome;
  description: string;
  justification: string; // Why this level of residual risk is acceptable
  monitoringRequired: boolean;
  reviewFrequency?: 'Annual' | 'Biannual' | 'Every 3 Years' | 'As Needed';
}

/**
 * EP4 Adaptation Pathway
 * Structured approach to adaptation planning
 */
export interface EPAdaptationPathway {
  id: string;
  name: string;
  type: EPAdaptationPathwayType;
  description: string;
  measures: string[]; // Measure IDs
  implementationTimeline: {
    shortTerm: string[]; // 0-5 years
    mediumTerm: string[]; // 5-15 years
    longTerm: string[]; // 15+ years
  };
  residualRisk: EPResidualRisk;
  costEstimate?: {
    total: number;
    shortTerm: number;
    mediumTerm: number;
    longTerm: number;
  };
  effectivenessRating: number; // 0-100, percentage of risk reduction
}

/**
 * EP4 Physical Climate Risk Assessment Result
 */
export interface EPPhysicalRiskAssessment {
  assetId: string;
  assessmentDate: string;
  assessor: string;
  
  // Risk Identification
  identifiedHazards: Array<{
    hazardId: string;
    category: EPPhysicalRiskCategory;
    currentRisk: EPRiskAssessmentOutcome;
    projectedRisk2050: EPRiskAssessmentOutcome;
    projectedRisk2100: EPRiskAssessmentOutcome;
    materiality: boolean;
  }>;
  
  // Adaptation Planning
  adaptationPathways: EPAdaptationPathway[];
  selectedPathwayId?: string;
  
  // Residual Risk
  residualRisk: EPResidualRisk;
  
  // Compliance
  ep4Compliant: boolean;
  complianceNotes?: string;
  
  // Monitoring & Review
  nextReviewDate: string;
  monitoringPlan?: {
    indicators: string[];
    frequency: string;
    responsibleParty: string;
  };
}

/**
 * EP4 Terminology Mapping
 * Maps internal terminology to EP4 standard terms
 */
export const EP4_TERMINOLOGY = {
  // Risk Assessment
  'Physical Climate Risk Assessment': 'EP4 Physical Climate Risk Assessment',
  'Climate Risk & Vulnerability Assessment': 'EP4 Physical Climate Risk Assessment',
  'CRVA': 'EP4 Physical Climate Risk Assessment',
  
  // Adaptation
  'Adaptation Measures': 'EP4 Adaptation Measures',
  'Adaptation Pathway': 'EP4 Adaptation Pathway',
  'Residual Risk': 'EP4 Residual Risk',
  
  // Risk Categories
  'Acute Risk': EPPhysicalRiskCategory.ACUTE,
  'Chronic Risk': EPPhysicalRiskCategory.CHRONIC,
  
  // Outcomes
  'Low Risk': EPRiskAssessmentOutcome.LOW,
  'Medium Risk': EPRiskAssessmentOutcome.MEDIUM,
  'High Risk': EPRiskAssessmentOutcome.HIGH,
  'Critical Risk': EPRiskAssessmentOutcome.CRITICAL,
  
  // Adaptation Types
  'Avoid': EPAdaptationPathwayType.AVOID,
  'Reduce': EPAdaptationPathwayType.REDUCE,
  'Transfer': EPAdaptationPathwayType.TRANSFER,
  'Accept': EPAdaptationPathwayType.ACCEPT,
} as const;

/**
 * Get EP4-compliant terminology for display
 */
export const getEP4Term = (internalTerm: string): string => {
  return EP4_TERMINOLOGY[internalTerm as keyof typeof EP4_TERMINOLOGY] || internalTerm;
};

/**
 * Map Risk Band to EP4 Risk Assessment Outcome
 */
export const mapRiskBandToEP4Outcome = (riskBand: 'Low' | 'Moderate' | 'High' | 'Very High'): EPRiskAssessmentOutcome => {
  switch (riskBand) {
    case 'Low':
      return EPRiskAssessmentOutcome.LOW;
    case 'Moderate':
      return EPRiskAssessmentOutcome.MEDIUM;
    case 'High':
      return EPRiskAssessmentOutcome.HIGH;
    case 'Very High':
      return EPRiskAssessmentOutcome.CRITICAL;
    default:
      return EPRiskAssessmentOutcome.MEDIUM;
  }
};

/**
 * Map EP4 Outcome to Risk Band
 */
export const mapEP4OutcomeToRiskBand = (outcome: EPRiskAssessmentOutcome): 'Low' | 'Moderate' | 'High' | 'Very High' => {
  switch (outcome) {
    case EPRiskAssessmentOutcome.LOW:
      return 'Low';
    case EPRiskAssessmentOutcome.MEDIUM:
      return 'Moderate';
    case EPRiskAssessmentOutcome.HIGH:
      return 'High';
    case EPRiskAssessmentOutcome.CRITICAL:
      return 'Very High';
  }
};
