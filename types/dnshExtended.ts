/**
 * Extended DNSH Evaluation Types
 * Enhanced model for comprehensive DNSH evaluation with:
 * - Substantial contribution tracking
 * - Scenario reference comparisons
 * - Asset grouping capabilities
 * - Structured evidence linking
 */

import { DnshObjective, ClimateScenario, Asset, Operation, EvidenceDocument } from '../types';

/**
 * Substantial Contribution Assessment
 * Tracks how an asset/portfolio contributes to environmental objectives
 */
export interface SubstantialContribution {
  objective: DnshObjective;
  contributionType: 'Primary' | 'Secondary' | 'Enabling';
  contributionLevel: 'High' | 'Medium' | 'Low';
  justification: string;
  evidenceIds: string[]; // Links to evidence documents
  assessedBy: string;
  assessedDate: string;
  // EU Taxonomy alignment
  taxonomyActivityCode?: string;
  taxonomyCriteria?: string[];
  // Quantitative indicators (if applicable)
  quantitativeIndicators?: {
    [key: string]: {
      value: number;
      unit: string;
      benchmark?: number;
      benchmarkSource?: string;
    };
  };
}

/**
 * Scenario Reference Comparison
 * Compares asset/portfolio performance against reference scenarios
 */
export interface ScenarioReferenceComparison {
  objective: DnshObjective;
  scenario: ClimateScenario;
  timeHorizon: '2030' | '2050' | '2100';
  comparisonType: 'Adaptation' | 'Water' | 'Biodiversity' | 'Mitigation' | 'Other';
  
  // Reference values from scenario
  referenceMetrics: {
    [metricKey: string]: {
      value: number;
      unit: string;
      source: string;
    };
  };
  
  // Asset/portfolio actual values
  actualValues: {
    [metricKey: string]: {
      value: number;
      unit: string;
      assessmentDate: string;
    };
  };
  
  // Comparison result
  comparisonResult: {
    status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
    deviation: number; // Percentage deviation from reference
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    notes?: string;
  };
  
  assessedBy: string;
  assessedDate: string;
}

/**
 * Asset Group Configuration
 * Defines how assets are grouped for evaluation
 */
export interface AssetGroup {
  id: string;
  name: string;
  groupType: 'Homogeneous' | 'ByAssetType' | 'ByLocation' | 'ByRiskProfile' | 'Custom';
  description?: string;
  
  // Grouping criteria
  criteria: {
    assetTypes?: string[]; // EUAssetType values
    location?: {
      country?: string;
      region?: string;
      coordinates?: { lat: number; lng: number; radiusKm: number };
    };
    riskProfile?: {
      minRiskBand?: string;
      maxRiskBand?: string;
    };
    customFilter?: (asset: Asset) => boolean;
  };
  
  // Aggregated evaluation approach
  evaluationApproach: 'Aggregated' | 'Granular' | 'Hybrid';
  aggregationMethod?: 'WorstCase' | 'Average' | 'Weighted' | 'Majority';
  
  // Assets in this group
  assetIds: string[];
  
  // Group-level evaluation
  groupEvaluation?: GroupDnshEvaluation;
}

/**
 * Group-level DNSH Evaluation
 * Evaluation at group level (for homogeneous portfolios)
 */
export interface GroupDnshEvaluation {
  groupId: string;
  evaluationDate: string;
  evaluator: string;
  
  // Per-objective status
  objectiveStatuses: {
    [objective in DnshObjective]: {
      status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
      complianceRate: number; // Percentage of assets compliant
      aggregatedJustification: string;
      evidenceIds: string[];
      scenarioComparisons?: ScenarioReferenceComparison[];
    };
  };
  
  // Overall status
  overallStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  overallNotes?: string;
  
  // Aggregation metadata
  aggregationMetadata: {
    totalAssets: number;
    assessedAssets: number;
    aggregationMethod: string;
    aggregationDate: string;
  };
}

/**
 * Enhanced Asset DNSH Evaluation
 * Extends base AssetDnshEvaluation with additional structured data
 */
export interface EnhancedAssetDnshEvaluation {
  // Base evaluation
  baseEvaluation: Asset['dnshEvaluation'];
  
  // Substantial contribution assessment
  substantialContribution?: SubstantialContribution;
  
  // Scenario comparisons (per objective)
  scenarioComparisons?: {
    [objective in DnshObjective]?: ScenarioReferenceComparison[];
  };
  
  // Structured evidence linking
  structuredEvidence: {
    [objective in DnshObjective]: {
      evidenceIds: string[];
      evidenceSummary: string;
      evidenceQuality: 'High' | 'Medium' | 'Low';
      lastUpdated: string;
    };
  };
  
  // Checklist answers
  checklistAnswers?: {
    [questionId: string]: {
      response: 'Yes' | 'No' | 'N/A';
      evidence: string;
      evidenceIds: string[];
      assessedBy: string;
      assessedDate: string;
    };
  };
  
  // Evaluation metadata
  evaluationMetadata: {
    evaluationVersion: string;
    evaluationFramework: 'EU_Taxonomy' | 'Equator_Principles' | 'Custom';
    lastReviewDate?: string;
    nextReviewDate?: string;
    reviewFrequency?: 'Annual' | 'Biannual' | 'AsNeeded';
  };
}

/**
 * Portfolio DNSH Evaluation Configuration
 * Defines how a portfolio should be evaluated
 */
export interface PortfolioEvaluationConfig {
  portfolioId: string; // Operation ID or Client ID
  portfolioType: 'Operation' | 'Client';
  
  // Evaluation strategy
  evaluationStrategy: {
    approach: 'Homogeneous' | 'Heterogeneous' | 'Mixed';
    groupingStrategy: 'ByAssetType' | 'ByLocation' | 'ByRiskProfile' | 'Custom' | 'None';
    groups?: AssetGroup[];
  };
  
  // Evaluation scope
  evaluationScope: {
    objectives: DnshObjective[];
    includeSubstantialContribution: boolean;
    includeScenarioComparison: boolean;
    scenarioComparisonObjectives?: DnshObjective[];
    referenceScenarios?: ClimateScenario[];
    timeHorizons?: ('2030' | '2050' | '2100')[];
  };
  
  // Evaluation settings
  evaluationSettings: {
    requireEvidence: boolean;
    evidenceQualityThreshold: 'High' | 'Medium' | 'Low';
    allowConditionalCompliance: boolean;
    reviewRequired: boolean;
  };
  
  // Metadata
  configVersion: string;
  createdBy: string;
  createdDate: string;
  lastModified?: string;
}

/**
 * DNSH Evaluation View Configuration
 * Controls what is displayed in the evaluation UI
 */
export interface DnshEvaluationViewConfig {
  // View mode
  viewMode: 'Portfolio' | 'Group' | 'Asset' | 'Comparison';
  
  // Display sections (modular)
  displaySections: {
    overview: boolean;
    substantialContribution: boolean;
    objectiveEvaluations: boolean;
    checklist: boolean;
    evidence: boolean;
    scenarioComparison: boolean;
    adaptationDetails: boolean;
    map: boolean;
  };
  
  // Grouping display
  groupingDisplay: {
    showGroups: boolean;
    groupBy: 'AssetType' | 'Location' | 'RiskProfile' | 'Status' | 'None';
    expandGroups: boolean;
  };
  
  // Asset display
  assetDisplay: {
    showAllAssets: boolean;
    filterByStatus?: ('Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed')[];
    sortBy?: 'Name' | 'Status' | 'Value' | 'Risk';
  };
  
  // Comparison settings
  comparisonSettings?: {
    compareWith?: 'Benchmark' | 'PreviousEvaluation' | 'OtherPortfolio';
    comparisonId?: string;
    showDifferences: boolean;
  };
}
