/**
 * Catalog Service
 * 
 * Centralized service for managing catalogs (measures, hazards, knowledge base)
 * with CRUD operations, versioning, and knowledge base integration
 */

import { Measure, HazardType } from '../types';
import { ExtendedMeasure, KnowledgeBaseEntry, CaseStudy, CatalogOperation } from '../types/catalog';
import { EPAdaptationMeasureCategory, EPAdaptationPathwayType } from '../constants/equatorPrinciples';

/**
 * In-memory storage (in production, this would be a database)
 */
class CatalogStorage {
  private measures: Map<string, ExtendedMeasure> = new Map();
  private knowledgeBase: Map<string, KnowledgeBaseEntry> = new Map();
  private caseStudies: Map<string, CaseStudy> = new Map();
  private operations: CatalogOperation[] = [];

  // Initialize with default measures
  constructor() {
    // Will be populated from constants or database
  }

  // Measures
  getMeasure(id: string): ExtendedMeasure | undefined {
    return this.measures.get(id);
  }

  getAllMeasures(): ExtendedMeasure[] {
    return Array.from(this.measures.values());
  }

  addMeasure(measure: ExtendedMeasure): void {
    this.measures.set(measure.id, measure);
  }

  updateMeasure(id: string, updates: Partial<ExtendedMeasure>): ExtendedMeasure | null {
    const existing = this.measures.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.measures.set(id, updated);
    return updated;
  }

  deleteMeasure(id: string): boolean {
    return this.measures.delete(id);
  }

  // Knowledge Base
  getKnowledgeEntry(id: string): KnowledgeBaseEntry | undefined {
    return this.knowledgeBase.get(id);
  }

  getAllKnowledgeEntries(): KnowledgeBaseEntry[] {
    return Array.from(this.knowledgeBase.values());
  }

  addKnowledgeEntry(entry: KnowledgeBaseEntry): void {
    this.knowledgeBase.set(entry.id, entry);
  }

  // Case Studies
  getCaseStudy(id: string): CaseStudy | undefined {
    return this.caseStudies.get(id);
  }

  getAllCaseStudies(): CaseStudy[] {
    return Array.from(this.caseStudies.values());
  }

  addCaseStudy(caseStudy: CaseStudy): void {
    this.caseStudies.set(caseStudy.id, caseStudy);
  }

  // Operations
  addOperation(operation: CatalogOperation): void {
    this.operations.push(operation);
  }

  getOperations(): CatalogOperation[] {
    return this.operations;
  }
}

// Singleton instance
const catalogStorage = new CatalogStorage();

/**
 * Convert basic Measure to ExtendedMeasure
 */
export const extendMeasure = (measure: Measure, extensions?: Partial<ExtendedMeasure>): ExtendedMeasure => {
  return {
    ...measure,
    category: extensions?.category || EPAdaptationMeasureCategory.STRUCTURAL,
    pathwayType: extensions?.pathwayType || EPAdaptationPathwayType.REDUCE,
    implementationTime: extensions?.implementationTime || {
      planning: 3,
      execution: 6,
      total: 9
    },
    maintenanceRequired: extensions?.maintenanceRequired || false,
    applicableHazards: measure.mitigatesHazards,
    version: extensions?.version || '1.0.0',
    status: extensions?.status || 'approved',
    tags: extensions?.tags || [],
    ...extensions
  };
};

/**
 * Get measures by hazard with specific mitigation details
 */
export const getMeasuresByHazard = (hazardId: string): ExtendedMeasure[] => {
  return catalogStorage.getAllMeasures().filter(m => {
    // Check if measure has specific hazard mitigation
    if (m.hazardMitigation && m.hazardMitigation.some(hm => hm.hazardId === hazardId)) {
      return true;
    }
    // Fallback to legacy fields
    return m.applicableHazards.includes(hazardId) || m.mitigatesHazards.includes(hazardId);
  });
};

/**
 * Get measures by hazard sorted by effectiveness for that specific hazard
 */
export const getMeasuresByHazardSorted = (hazardId: string): Array<{ measure: ExtendedMeasure; effectiveness: number }> => {
  return catalogStorage.getAllMeasures()
    .map(measure => {
      // Get specific effectiveness for this hazard
      const mitigation = measure.hazardMitigation?.find(hm => hm.hazardId === hazardId);
      const effectiveness = mitigation?.effectiveness.overallRiskReduction || 
                           (measure.applicableHazards.includes(hazardId) || measure.mitigatesHazards.includes(hazardId) 
                             ? measure.riskReductionPercentage 
                             : 0);
      
      return { measure, effectiveness };
    })
    .filter(item => item.effectiveness > 0)
    .sort((a, b) => b.effectiveness - a.effectiveness);
};

/**
 * Get measures by category
 */
export const getMeasuresByCategory = (category: EPAdaptationMeasureCategory): ExtendedMeasure[] => {
  return catalogStorage.getAllMeasures().filter(m => m.category === category);
};

/**
 * Search measures
 */
export const searchMeasures = (query: string): ExtendedMeasure[] => {
  const lowerQuery = query.toLowerCase();
  return catalogStorage.getAllMeasures().filter(m =>
    m.name.toLowerCase().includes(lowerQuery) ||
    m.description.toLowerCase().includes(lowerQuery) ||
    m.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get knowledge base entries related to a measure
 */
export const getKnowledgeForMeasure = (measureId: string): KnowledgeBaseEntry[] => {
  return catalogStorage.getAllKnowledgeEntries().filter(entry =>
    entry.relatedMeasures?.includes(measureId)
  );
};

/**
 * Get case studies for a measure
 */
export const getCaseStudiesForMeasure = (measureId: string): CaseStudy[] => {
  return catalogStorage.getAllCaseStudies().filter(study =>
    study.measuresApplied.includes(measureId)
  );
};

/**
 * Create a new measure with approval workflow
 */
export const createMeasure = (
  measure: Omit<ExtendedMeasure, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
  requestedBy: string
): { measure: ExtendedMeasure; operation: CatalogOperation } => {
  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  
  const newMeasure: ExtendedMeasure = {
    ...measure,
    id,
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    createdBy: requestedBy,
    status: 'draft'
  };

  const operation: CatalogOperation = {
    id: `op-${Date.now()}`,
    type: 'create',
    catalogType: 'measure',
    itemId: id,
    requestedBy,
    requestedAt: now,
    status: 'pending'
  };

  catalogStorage.addMeasure(newMeasure);
  catalogStorage.addOperation(operation);

  return { measure: newMeasure, operation };
};

/**
 * Approve a catalog operation
 */
export const approveOperation = (
  operationId: string,
  approvedBy: string,
  comments?: string
): boolean => {
  const operation = catalogStorage.getOperations().find(op => op.id === operationId);
  if (!operation || operation.status !== 'pending') return false;

  operation.status = 'approved';
  operation.approvedBy = approvedBy;
  operation.approvedAt = new Date().toISOString();
  if (comments) operation.comments = comments;

  // Update item status based on operation type
  if (operation.type === 'create' || operation.type === 'update') {
    const measure = catalogStorage.getMeasure(operation.itemId);
    if (measure) {
      catalogStorage.updateMeasure(operation.itemId, { status: 'approved' });
    }
  }

  return true;
};

/**
 * Initialize catalog with default measures from constants
 */
export const initializeCatalog = (defaultMeasures: Measure[]): void => {
  // Clear existing measures
  catalogStorage.getAllMeasures().forEach(m => {
    catalogStorage.deleteMeasure(m.id);
  });
  
  // Import and add extended measures directly
  const { EXTENDED_MEASURES } = require('../constants/extendedMeasures');
  EXTENDED_MEASURES.forEach((measure: ExtendedMeasure) => {
    catalogStorage.addMeasure(measure);
  });
  defaultMeasures.forEach(measure => {
    const extended = extendMeasure(measure, {
      status: 'approved',
      tags: ['standard']
    });
    catalogStorage.addMeasure(extended);
  });
};

/**
 * Export catalog for backup/version control
 */
export const exportCatalog = (): {
  measures: ExtendedMeasure[];
  knowledgeBase: KnowledgeBaseEntry[];
  caseStudies: CaseStudy[];
  exportDate: string;
} => {
  return {
    measures: catalogStorage.getAllMeasures(),
    knowledgeBase: catalogStorage.getAllKnowledgeEntries(),
    caseStudies: catalogStorage.getAllCaseStudies(),
    exportDate: new Date().toISOString()
  };
};

/**
 * Import catalog from backup
 */
export const importCatalog = (data: {
  measures?: ExtendedMeasure[];
  knowledgeBase?: KnowledgeBaseEntry[];
  caseStudies?: CaseStudy[];
}): void => {
  if (data.measures) {
    data.measures.forEach(measure => catalogStorage.addMeasure(measure));
  }
  if (data.knowledgeBase) {
    data.knowledgeBase.forEach(entry => catalogStorage.addKnowledgeEntry(entry));
  }
  if (data.caseStudies) {
    data.caseStudies.forEach(study => catalogStorage.addCaseStudy(study));
  }
};

/**
 * Calculate what risk band would result from applying measures
 * Uses the same logic as calculatePostMeasuresStatus in DnshAdaptation.tsx
 */
export const calculatePostMeasuresRiskBand = (
  currentRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low',
  currentTotalScore: number,
  currentVulnerabilityScore: number, // Vulnerability score (0-5)
  measures: ExtendedMeasure[],
  hazardId: string
): {
  riskBand: 'Very High' | 'High' | 'Moderate' | 'Low';
  totalScore: number;
  dnshStatus: 'Compliant' | 'Non-Compliant' | 'Conditional';
  effectiveness: number;
} => {
  if (measures.length === 0) {
    const dnshStatus = currentRiskBand === 'Very High' || currentRiskBand === 'High' 
      ? 'Non-Compliant' 
      : currentRiskBand === 'Moderate' 
      ? 'Conditional' 
      : 'Compliant';
    return {
      riskBand: currentRiskBand,
      totalScore: currentTotalScore,
      dnshStatus,
      effectiveness: 0
    };
  }

  // Calculate total vulnerability reduction from all measures
  let totalVulnerabilityReduction = 0;
  let totalEffectiveness = 0;

  measures.forEach(measure => {
    const mitigation = measure.hazardMitigation?.find(hm => hm.hazardId === hazardId);
    if (mitigation) {
      // Use specific vulnerability reduction for this hazard
      totalVulnerabilityReduction += mitigation.effectiveness.vulnerabilityReduction / 100;
      totalEffectiveness += mitigation.effectiveness.overallRiskReduction;
    } else if (measure.applicableHazards.includes(hazardId) || measure.mitigatesHazards.includes(hazardId)) {
      // Fallback to general risk reduction
      totalVulnerabilityReduction += measure.riskReductionPercentage / 100;
      totalEffectiveness += measure.riskReductionPercentage;
    }
  });

  // Cap total reduction at 100%
  const effectiveReduction = Math.min(1, totalVulnerabilityReduction);
  const avgEffectiveness = measures.length > 0 ? totalEffectiveness / measures.length : 0;

  // Apply reduction to vulnerability score (same logic as DnshAdaptation.tsx)
  const newVulnerabilityScore = Math.max(0, currentVulnerabilityScore - Math.ceil(effectiveReduction * currentVulnerabilityScore));
  
  // Recalculate total score (assuming hazard and exposure scores remain constant)
  // Total = Hazard + Exposure + Vulnerability
  const hazardAndExposureScore = currentTotalScore - currentVulnerabilityScore;
  const newTotalScore = hazardAndExposureScore + newVulnerabilityScore;

  // Determine new risk band
  let newRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low';
  if (newTotalScore >= 13) newRiskBand = 'Very High';
  else if (newTotalScore >= 10) newRiskBand = 'High';
  else if (newTotalScore >= 5) newRiskBand = 'Moderate';
  else newRiskBand = 'Low';

  const dnshStatus = newRiskBand === 'Very High' || newRiskBand === 'High' 
    ? 'Non-Compliant' 
    : newRiskBand === 'Moderate' 
    ? 'Conditional' 
    : 'Compliant';

  return {
    riskBand: newRiskBand,
    totalScore: newTotalScore,
    dnshStatus,
    effectiveness: avgEffectiveness
  };
};

/**
 * Find measures that can change DNSH status from Non-Compliant/Conditional to Compliant
 */
export const findMeasuresForCompliance = (
  hazardId: string,
  currentRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low',
  currentTotalScore: number,
  currentVulnerabilityScore: number,
  options?: {
    maxMeasures?: number;
    maxCost?: number;
    preferHighEffectiveness?: boolean;
  }
): Array<{
  measures: ExtendedMeasure[];
  combination: string[]; // Measure IDs
  postMeasuresStatus: 'Compliant' | 'Non-Compliant' | 'Conditional';
  postMeasuresRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low';
  totalCost: number;
  totalEffectiveness: number;
  canAchieveCompliant: boolean;
}> => {
  const allMeasures = getMeasuresByHazardSorted(hazardId);
  const maxMeasures = options?.maxMeasures || 3;
  const maxCost = options?.maxCost || Infinity;
  
  // If already compliant, return empty
  if (currentRiskBand === 'Low') {
    return [];
  }

  const results: Array<{
    measures: ExtendedMeasure[];
    combination: string[];
    postMeasuresStatus: 'Compliant' | 'Non-Compliant' | 'Conditional';
    postMeasuresRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low';
    totalCost: number;
    totalEffectiveness: number;
    canAchieveCompliant: boolean;
  }> = [];

  // Try single measures first
  for (const { measure } of allMeasures) {
    if (measure.cost > maxCost) continue;
    
    const result = calculatePostMeasuresRiskBand(
      currentRiskBand,
      currentTotalScore,
      currentVulnerabilityScore,
      [measure],
      hazardId
    );

    results.push({
      measures: [measure],
      combination: [measure.id],
      postMeasuresStatus: result.dnshStatus,
      postMeasuresRiskBand: result.riskBand,
      totalCost: measure.cost,
      totalEffectiveness: result.effectiveness,
      canAchieveCompliant: result.dnshStatus === 'Compliant'
    });
  }

  // Try combinations of 2-3 measures
  for (let comboSize = 2; comboSize <= maxMeasures; comboSize++) {
    // Generate combinations
    for (let i = 0; i < allMeasures.length; i++) {
      for (let j = i + 1; j < allMeasures.length; j++) {
        if (comboSize === 2) {
          const measure1 = allMeasures[i].measure;
          const measure2 = allMeasures[j].measure;
          const totalCost = measure1.cost + measure2.cost;
          
          if (totalCost > maxCost) continue;

          const result = calculatePostMeasuresRiskBand(
            currentRiskBand,
            currentTotalScore,
            currentVulnerabilityScore,
            [measure1, measure2],
            hazardId
          );

          results.push({
            measures: [measure1, measure2],
            combination: [measure1.id, measure2.id],
            postMeasuresStatus: result.dnshStatus,
            postMeasuresRiskBand: result.riskBand,
            totalCost,
            totalEffectiveness: result.effectiveness,
            canAchieveCompliant: result.dnshStatus === 'Compliant'
          });
        } else if (comboSize === 3) {
          for (let k = j + 1; k < allMeasures.length; k++) {
            const measure1 = allMeasures[i].measure;
            const measure2 = allMeasures[j].measure;
            const measure3 = allMeasures[k].measure;
            const totalCost = measure1.cost + measure2.cost + measure3.cost;
            
            if (totalCost > maxCost) continue;

            const result = calculatePostMeasuresRiskBand(
              currentRiskBand,
              currentTotalScore,
              currentVulnerabilityScore,
              [measure1, measure2, measure3],
              hazardId
            );

            results.push({
              measures: [measure1, measure2, measure3],
              combination: [measure1.id, measure2.id, measure3.id],
              postMeasuresStatus: result.dnshStatus,
              postMeasuresRiskBand: result.riskBand,
              totalCost,
              totalEffectiveness: result.effectiveness,
              canAchieveCompliant: result.dnshStatus === 'Compliant'
            });
          }
        }
      }
    }
  }

  // Sort results: prioritize compliant solutions, then by cost-effectiveness
  results.sort((a, b) => {
    // First priority: can achieve compliant
    if (a.canAchieveCompliant && !b.canAchieveCompliant) return -1;
    if (!a.canAchieveCompliant && b.canAchieveCompliant) return 1;
    
    // Second priority: lower cost
    if (a.canAchieveCompliant && b.canAchieveCompliant) {
      return a.totalCost - b.totalCost;
    }
    
    // Third priority: higher effectiveness
    return b.totalEffectiveness - a.totalEffectiveness;
  });

  return results.slice(0, 20); // Return top 20 recommendations
};

/**
 * Calculate combined effectiveness of multiple measures
 * Accounts for diminishing returns when combining measures
 */
export const calculateCombinedEffectiveness = (
  measures: ExtendedMeasure[],
  hazardId: string
): {
  totalVulnerabilityReduction: number;
  totalEffectiveness: number;
  combinedRiskReduction: number;
} => {
  if (measures.length === 0) {
    return {
      totalVulnerabilityReduction: 0,
      totalEffectiveness: 0,
      combinedRiskReduction: 0
    };
  }

  let totalVulnerabilityReduction = 0;
  let totalEffectiveness = 0;

  measures.forEach(measure => {
    const mitigation = measure.hazardMitigation?.find(hm => hm.hazardId === hazardId);
    if (mitigation) {
      totalVulnerabilityReduction += mitigation.effectiveness.vulnerabilityReduction / 100;
      totalEffectiveness += mitigation.effectiveness.overallRiskReduction;
    } else if (measure.applicableHazards.includes(hazardId) || measure.mitigatesHazards.includes(hazardId)) {
      totalVulnerabilityReduction += measure.riskReductionPercentage / 100;
      totalEffectiveness += measure.riskReductionPercentage;
    }
  });

  // Cap total reduction at 100%
  const effectiveVulnerabilityReduction = Math.min(1, totalVulnerabilityReduction);
  
  // Average effectiveness (simple average, could be improved with weighted average)
  const avgEffectiveness = measures.length > 0 ? totalEffectiveness / measures.length : 0;
  
  // Combined risk reduction accounts for diminishing returns
  // Formula: 1 - (1-r1)(1-r2)...(1-rn) for independent measures
  // Simplified: use average effectiveness with diminishing returns factor
  const diminishingReturnsFactor = measures.length > 1 ? 0.9 : 1.0; // 10% reduction per additional measure
  const combinedRiskReduction = Math.min(100, avgEffectiveness * (1 - (measures.length - 1) * 0.1));

  return {
    totalVulnerabilityReduction: effectiveVulnerabilityReduction * 100,
    totalEffectiveness: avgEffectiveness,
    combinedRiskReduction
  };
};

/**
 * Get recommended measures for achieving DNSH compliance
 * Returns measures sorted by their ability to achieve Compliant status
 */
export const getRecommendedMeasuresForCompliance = (
  hazardId: string,
  currentRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low',
  currentTotalScore: number,
  currentVulnerabilityScore: number,
  currentDnshStatus: 'Compliant' | 'Non-Compliant' | 'Conditional'
): Array<{
  measure: ExtendedMeasure;
  effectiveness: number;
  canAchieveCompliant: boolean;
  postMeasuresStatus: 'Compliant' | 'Non-Compliant' | 'Conditional';
  postMeasuresRiskBand: 'Very High' | 'High' | 'Moderate' | 'Low';
  priority: 'high' | 'medium' | 'low';
}> => {
  if (currentDnshStatus === 'Compliant') {
    return [];
  }

  const measuresWithEffectiveness = getMeasuresByHazardSorted(hazardId);
  
  return measuresWithEffectiveness.map(({ measure, effectiveness }) => {
    const result = calculatePostMeasuresRiskBand(
      currentRiskBand,
      currentTotalScore,
      currentVulnerabilityScore,
      [measure],
      hazardId
    );

    // Determine priority
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (result.dnshStatus === 'Compliant') {
      priority = 'high';
    } else if (result.dnshStatus === 'Conditional' && currentDnshStatus === 'Non-Compliant') {
      priority = 'high';
    } else if (effectiveness >= 60) {
      priority = 'high';
    } else if (effectiveness < 30) {
      priority = 'low';
    }

    return {
      measure,
      effectiveness,
      canAchieveCompliant: result.dnshStatus === 'Compliant',
      postMeasuresStatus: result.dnshStatus,
      postMeasuresRiskBand: result.riskBand,
      priority
    };
  }).sort((a, b) => {
    // Sort by: can achieve compliant first, then by effectiveness
    if (a.canAchieveCompliant && !b.canAchieveCompliant) return -1;
    if (!a.canAchieveCompliant && b.canAchieveCompliant) return 1;
    return b.effectiveness - a.effectiveness;
  });
};

// Export storage instance for direct access if needed
export { catalogStorage };
