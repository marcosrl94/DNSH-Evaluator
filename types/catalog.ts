/**
 * Catalog Management Types
 * 
 * Extended types for scalable catalog management system
 */

import { Measure, HazardType, DnshObjective } from '../types';
import { EPAdaptationMeasureCategory, EPAdaptationPathwayType } from '../constants/equatorPrinciples';

/**
 * Extended Measure with full metadata and knowledge base integration
 */
export interface ExtendedMeasure extends Measure {
  // Categorization
  category: EPAdaptationMeasureCategory;
  pathwayType: EPAdaptationPathwayType;
  
  // Knowledge base
  knowledgeBaseId?: string; // Reference to knowledge base entry
  caseStudies?: string[]; // IDs of case studies where this measure was used
  effectivenessEvidence?: {
    source: string;
    effectivenessRange: { min: number; max: number };
    confidence: 'high' | 'medium' | 'low';
    studyDate?: string;
  }[];
  
  // Implementation details
  implementationTime: {
    planning: number; // months
    execution: number; // months
    total: number; // months
  };
  maintenanceRequired: boolean;
  maintenanceCost?: number; // annual
  maintenanceFrequency?: 'monthly' | 'quarterly' | 'annually' | 'as-needed';
  
  // Technical specifications
  technicalSpecs?: {
    standards?: string[]; // e.g., ['ISO 14001', 'EN 1990']
    certifications?: string[];
    materials?: string[];
    dimensions?: Record<string, number>;
  };
  
  // Applicability
  applicableAssetTypes?: string[];
  applicableRegions?: string[];
  applicableHazards: string[]; // Extended from mitigatesHazards
  
  // Specific Hazard Mitigation - Detailed linkage
  hazardMitigation: Array<{
    hazardId: string;
    hazardCode: string; // e.g., 'TEMP-02', 'WAT-17'
    mitigationMechanism: string; // How this measure mitigates this specific hazard
    effectiveness: {
      vulnerabilityReduction: number; // 0-100% reduction in vulnerability score
      exposureReduction?: number; // 0-100% reduction in exposure (if applicable)
      intensityReduction?: number; // 0-100% reduction in hazard intensity (if applicable)
      overallRiskReduction: number; // 0-100% overall risk reduction for this hazard
    };
    applicabilityConditions?: string[]; // Conditions under which this measure is effective for this hazard
    evidence?: {
      source: string;
      effectiveness: number;
      confidence: 'high' | 'medium' | 'low';
    }[];
  }>;
  
  // Environmental Risk Mitigation - Beyond climate hazards
  environmentalRiskMitigation?: Array<{
    riskType: 'water_quality' | 'air_quality' | 'soil_contamination' | 'biodiversity_loss' | 
              'noise_pollution' | 'waste_generation' | 'resource_depletion' | 'ecosystem_degradation';
    riskDescription: string;
    mitigationMechanism: string;
    effectiveness: number; // 0-100%
    applicableStandards?: string[]; // e.g., ['EU WFD', 'ISO 14001']
  }>;
  
  // Cost breakdown
  costBreakdown?: {
    materials?: number;
    labor?: number;
    equipment?: number;
    permits?: number;
    contingency?: number; // percentage
  };
  
  // Environmental impact
  environmentalImpact?: {
    co2Reduction?: number; // tons CO2/year
    waterSavings?: number; // m3/year
    biodiversityImpact?: 'positive' | 'neutral' | 'negative';
    notes?: string;
  };
  
  // Documentation
  documentation?: {
    technicalManual?: string;
    installationGuide?: string;
    maintenanceGuide?: string;
    caseStudies?: string[];
  };
  
  // Metadata
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  version: string;
  status: 'draft' | 'approved' | 'deprecated';
  tags: string[];
  notes?: string;
}

/**
 * Knowledge Base Entry
 * Stores reusable knowledge from previous projects
 */
export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  type: 'measure' | 'hazard' | 'case-study' | 'best-practice' | 'lesson-learned';
  description: string;
  content: string; // Rich text or markdown
  
  // Association
  relatedMeasures?: string[]; // Measure IDs
  relatedHazards?: string[]; // Hazard IDs
  relatedObjectives?: DnshObjective[];
  
  // Context
  projectContext?: {
    operationId?: string;
    assetId?: string;
    sector?: string;
    region?: string;
  };
  
  // Evidence
  supportingDocuments?: string[]; // Evidence document IDs
  effectiveness?: {
    metric: string;
    value: number;
    unit: string;
    beforeValue?: number;
    afterValue?: number;
  };
  
  // Metadata
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  views?: number;
  rating?: number; // 1-5
}

/**
 * Case Study
 * Real-world implementation example
 */
export interface CaseStudy {
  id: string;
  title: string;
  description: string;
  
  // Context
  operationId?: string;
  assetId?: string;
  sector: string;
  region: string;
  country: string;
  
  // Implementation
  measuresApplied: string[]; // Measure IDs
  hazardsAddressed: string[]; // Hazard IDs
  implementationPeriod: {
    start: string;
    end: string;
  };
  
  // Results
  results: {
    riskReduction: number; // percentage
    costActual: number;
    costEstimated: number;
    effectiveness: number; // percentage
    lessonsLearned: string[];
    challenges: string[];
  };
  
  // Documentation
  documents?: string[]; // Evidence document IDs
  images?: string[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
}

/**
 * Catalog Version Control
 */
export interface CatalogVersion {
  id: string;
  catalogType: 'measures' | 'hazards' | 'knowledge-base';
  version: string;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  releaseNotes: string;
  releasedBy: string;
  releasedAt: string;
  status: 'draft' | 'released' | 'deprecated';
}

/**
 * Catalog Management Operations
 */
export interface CatalogOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'deprecate';
  catalogType: 'measure' | 'hazard' | 'knowledge-base' | 'case-study';
  itemId: string;
  changes?: Record<string, any>;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
}
