/**
 * Adaptation Decision Tree Service
 * 
 * Implements an "Árbol de Oportunidades y Soluciones" (Tree of Opportunities and Solutions)
 * to guide users through adaptation measure selection based on:
 * - Identified climate risks (root causes)
 * - Asset characteristics
 * - Cost-effectiveness
 * - Residual risk tolerance
 */

import { Asset, HazardType, Measure, RiskBand, ClimateScenario } from '../types';
import { EPAdaptationPathwayType, EPAdaptationMeasureCategory, EPResidualRisk, EPRiskAssessmentOutcome } from '../constants/equatorPrinciples';
import { getAllMeasures } from '../constants/extendedMeasures';
import { mapRiskBandToEP4Outcome } from '../constants/equatorPrinciples';

export interface DecisionNode {
  id: string;
  type: 'problem' | 'cause' | 'solution';
  label: string;
  description: string;
  children?: DecisionNode[];
  measures?: string[]; // Measure IDs
  criteria?: {
    costRange?: { min: number; max: number };
    effectiveness?: number; // 0-100
    implementationTime?: 'short' | 'medium' | 'long';
    residualRiskLevel?: EPRiskAssessmentOutcome;
  };
}

export interface AdaptationDecisionTree {
  hazardId: string;
  hazardName: string;
  rootProblem: DecisionNode;
  pathways: Array<{
    type: EPAdaptationPathwayType;
    nodes: DecisionNode[];
    measures: Measure[];
    effectiveness: number;
    cost: number;
    residualRisk: EPResidualRisk;
  }>;
}

/**
 * Build decision tree for a specific hazard and asset
 */
export const buildAdaptationDecisionTree = (
  hazard: HazardType,
  asset: Asset,
  riskBand: RiskBand,
  scenario: ClimateScenario
): AdaptationDecisionTree => {
  // Get relevant measures for this hazard
  const relevantMeasures = getAllMeasures().filter(m => 
    (m.mitigatesHazards || m.applicableHazards || []).includes(hazard.id)
  );

  // Root problem: The identified climate risk
  const rootProblem: DecisionNode = {
    id: `problem-${hazard.id}`,
    type: 'problem',
    label: hazard.name,
    description: `Identified climate risk: ${hazard.name}. Risk level: ${riskBand}.`,
    children: []
  };

  // Identify root causes based on hazard category and asset characteristics
  const rootCauses = identifyRootCauses(hazard, asset);
  
  // Build pathways for each adaptation type
  const pathways = [
    buildPathway('Avoid', hazard, asset, relevantMeasures, riskBand),
    buildPathway('Reduce', hazard, asset, relevantMeasures, riskBand),
    buildPathway('Transfer', hazard, asset, relevantMeasures, riskBand),
    buildPathway('Accept', hazard, asset, relevantMeasures, riskBand),
  ].filter(p => p !== null) as NonNullable<ReturnType<typeof buildPathway>>[];

  // Attach root causes to root problem
  rootProblem.children = rootCauses.map(cause => ({
    ...cause,
    children: pathways
      .filter(p => p.type === 'Reduce') // Focus on Reduce pathway for causes
      .flatMap(p => p.nodes)
  }));

  return {
    hazardId: hazard.id,
    hazardName: hazard.name,
    rootProblem,
    pathways
  };
};

/**
 * Identify root causes of climate risk for a specific asset
 */
function identifyRootCauses(hazard: HazardType, asset: Asset): DecisionNode[] {
  const causes: DecisionNode[] = [];

  // Cause 1: Location-based exposure
  if (hazard.category === 'Water-related' && asset.attributes.distanceToCoastKm < 10) {
    causes.push({
      id: `cause-location-${hazard.id}`,
      type: 'cause',
      label: 'Coastal Exposure',
      description: `Asset located ${asset.attributes.distanceToCoastKm}km from coast, increasing exposure to ${hazard.name}`,
    });
  }

  // Cause 2: Asset vulnerability
  if (hazard.category === 'Temperature-related' && asset.attributes.temperatureToleranceC < 35) {
    causes.push({
      id: `cause-vulnerability-${hazard.id}`,
      type: 'cause',
      label: 'Low Temperature Tolerance',
      description: `Asset has low temperature tolerance (${asset.attributes.temperatureToleranceC}°C), making it vulnerable to heat stress`,
    });
  }

  // Cause 3: Lack of protective infrastructure
  if (hazard.category === 'Water-related' && asset.attributes.floodProtectionLevel < 50) {
    causes.push({
      id: `cause-protection-${hazard.id}`,
      type: 'cause',
      label: 'Insufficient Flood Protection',
      description: `Asset has flood protection level of ${asset.attributes.floodProtectionLevel} years, below recommended threshold`,
    });
  }

  // Cause 4: High water dependency
  if (hazard.category === 'Water-related' && asset.attributes.waterDependency === 'High') {
    causes.push({
      id: `cause-water-dependency-${hazard.id}`,
      type: 'cause',
      label: 'High Water Dependency',
      description: 'Asset has high water dependency, making it vulnerable to water scarcity and drought',
    });
  }

  return causes;
}

/**
 * Build adaptation pathway
 */
function buildPathway(
  type: EPAdaptationPathwayType,
  hazard: HazardType,
  asset: Asset,
  measures: Measure[],
  riskBand: RiskBand
): {
  type: EPAdaptationPathwayType;
  nodes: DecisionNode[];
  measures: Measure[];
  effectiveness: number;
  cost: number;
  residualRisk: EPResidualRisk;
} | null {
  let pathwayMeasures: Measure[] = [];
  let nodes: DecisionNode[] = [];

  switch (type) {
    case 'Avoid':
      // Avoid: Relocation or project cancellation
      nodes = [{
        id: `avoid-${hazard.id}`,
        type: 'solution',
        label: 'Avoid Exposure',
        description: 'Relocate asset or avoid high-risk location',
        criteria: {
          costRange: { min: asset.exposedValue * 0.1, max: asset.exposedValue * 0.3 },
          effectiveness: 100,
          implementationTime: 'long',
          residualRiskLevel: EPRiskAssessmentOutcome.LOW
        }
      }];
      break;

    case 'Reduce':
      // Reduce: Apply adaptation measures
      pathwayMeasures = measures.filter(m => {
        // Filter measures that are most effective for this risk level
        if (riskBand === 'Very High' || riskBand === 'High') {
          return m.riskReductionPercentage >= 40;
        }
        return m.riskReductionPercentage >= 20;
      });

      nodes = pathwayMeasures.map(measure => ({
        id: `reduce-${measure.id}`,
        type: 'solution',
        label: measure.name,
        description: measure.description,
        measures: [measure.id],
        criteria: {
          costRange: { min: measure.cost * 0.8, max: measure.cost * 1.2 },
          effectiveness: measure.riskReductionPercentage,
          implementationTime: measure.cost > 1000000 ? 'long' : measure.cost > 500000 ? 'medium' : 'short',
        }
      }));
      break;

    case 'Transfer':
      // Transfer: Insurance or contractual risk transfer
      nodes = [{
        id: `transfer-${hazard.id}`,
        type: 'solution',
        label: 'Risk Transfer',
        description: 'Transfer risk through insurance or contractual arrangements',
        criteria: {
          costRange: { min: asset.exposedValue * 0.01, max: asset.exposedValue * 0.05 },
          effectiveness: 50, // Insurance doesn't reduce physical risk, but transfers financial risk
          implementationTime: 'short',
        }
      }];
      break;

    case 'Accept':
      // Accept: Accept residual risk (only for low/moderate risks)
      if (riskBand === 'Very High' || riskBand === 'High') {
        return null; // Don't recommend accepting high risks
      }
      nodes = [{
        id: `accept-${hazard.id}`,
        type: 'solution',
        label: 'Accept Residual Risk',
        description: 'Accept current risk level with monitoring',
        criteria: {
          costRange: { min: 0, max: 0 },
          effectiveness: 0,
          implementationTime: 'short',
        }
      }];
      break;
  }

  // Calculate pathway effectiveness and cost
  const effectiveness = nodes.reduce((max, node) => 
    Math.max(max, node.criteria?.effectiveness || 0), 0
  );
  const cost = nodes.reduce((sum, node) => 
    sum + (node.criteria?.costRange?.max || 0), 0
  );

  // Calculate residual risk
  const residualRisk = calculateResidualRisk(riskBand, effectiveness, type);

  return {
    type,
    nodes,
    measures: pathwayMeasures,
    effectiveness,
    cost,
    residualRisk
  };
}

/**
 * Calculate residual risk after adaptation measures
 */
function calculateResidualRisk(
  initialRisk: RiskBand,
  effectiveness: number,
  pathwayType: EPAdaptationPathwayType
): EPResidualRisk {
  const initialEPRisk = mapRiskBandToEP4Outcome(initialRisk);
  
  // Avoid pathway: minimal residual risk
  if (pathwayType === 'Avoid') {
    return {
      level: EPRiskAssessmentOutcome.LOW,
      description: 'Risk avoided through relocation or project modification',
      justification: 'Asset relocated to low-risk location',
      monitoringRequired: true,
      reviewFrequency: 'Annual'
    };
  }

  // Calculate residual risk based on effectiveness
  let residualLevel: EPRiskAssessmentOutcome;
  if (effectiveness >= 80) {
    residualLevel = initialEPRisk === EPRiskAssessmentOutcome.CRITICAL 
      ? EPRiskAssessmentOutcome.MEDIUM 
      : EPRiskAssessmentOutcome.LOW;
  } else if (effectiveness >= 50) {
    residualLevel = initialEPRisk === EPRiskAssessmentOutcome.CRITICAL
      ? EPRiskAssessmentOutcome.HIGH
      : initialEPRisk === EPRiskAssessmentOutcome.HIGH
      ? EPRiskAssessmentOutcome.MEDIUM
      : EPRiskAssessmentOutcome.LOW;
  } else if (effectiveness >= 20) {
    residualLevel = initialEPRisk === EPRiskAssessmentOutcome.CRITICAL
      ? EPRiskAssessmentOutcome.HIGH
      : initialEPRisk;
  } else {
    residualLevel = initialEPRisk; // Minimal reduction
  }

  return {
    level: residualLevel,
    description: `Residual risk after ${effectiveness}% effectiveness adaptation measures`,
    justification: `Adaptation measures reduce risk by ${effectiveness}%, resulting in ${residualLevel} residual risk`,
    monitoringRequired: residualLevel !== EPRiskAssessmentOutcome.LOW,
    reviewFrequency: residualLevel === EPRiskAssessmentOutcome.CRITICAL || residualLevel === EPRiskAssessmentOutcome.HIGH
      ? 'Annual'
      : 'Every 3 Years'
  };
}

/**
 * Recommend best adaptation pathway based on multiple criteria
 */
export const recommendAdaptationPathway = (
  tree: AdaptationDecisionTree,
  priorities: {
    costSensitive?: boolean;
    effectivenessPriority?: boolean;
    quickImplementation?: boolean;
  } = {}
): {
  recommendedPathway: EPAdaptationPathwayType;
  reasoning: string;
  alternativePathways: Array<{ type: EPAdaptationPathwayType; reason: string }>;
} => {
  const { costSensitive, effectivenessPriority, quickImplementation } = priorities;

  // Score each pathway
  const scoredPathways = tree.pathways.map(pathway => {
    let score = 0;
    
    // Effectiveness score (0-40 points)
    if (effectivenessPriority) {
      score += pathway.effectiveness * 0.4;
    } else {
      score += pathway.effectiveness * 0.2;
    }

    // Cost score (0-30 points, lower cost = higher score)
    if (costSensitive) {
      score += (1 - Math.min(pathway.cost / 10000000, 1)) * 30; // Normalize to 10M max
    } else {
      score += (1 - Math.min(pathway.cost / 10000000, 1)) * 15;
    }

    // Residual risk score (0-30 points, lower risk = higher score)
    const riskScore = {
      [EPRiskAssessmentOutcome.LOW]: 30,
      [EPRiskAssessmentOutcome.MEDIUM]: 20,
      [EPRiskAssessmentOutcome.HIGH]: 10,
      [EPRiskAssessmentOutcome.CRITICAL]: 0
    }[pathway.residualRisk.level];
    score += riskScore;

    return {
      ...pathway,
      score
    };
  });

  // Sort by score
  scoredPathways.sort((a, b) => b.score - a.score);

  const recommended = scoredPathways[0];
  const alternatives = scoredPathways.slice(1).map(p => ({
    type: p.type,
    reason: `Alternative option with ${p.effectiveness}% effectiveness and ${p.residualRisk.level} residual risk`
  }));

  return {
    recommendedPathway: recommended.type,
    reasoning: `Recommended pathway: ${recommended.type}. Effectiveness: ${recommended.effectiveness}%, Residual Risk: ${recommended.residualRisk.level}, Cost: €${recommended.cost.toLocaleString()}`,
    alternativePathways: alternatives
  };
};
