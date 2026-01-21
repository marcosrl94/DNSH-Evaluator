/**
 * Measure-Hazard Linkage Service
 * 
 * Utilities for working with specific measure-hazard linkages
 * and environmental risk mitigation
 */

import { ExtendedMeasure } from '../types/catalog';
import { HazardType } from '../types';

/**
 * Get specific mitigation details for a measure-hazard pair
 */
export const getMeasureHazardMitigation = (
  measure: ExtendedMeasure,
  hazardId: string
): ExtendedMeasure['hazardMitigation'][0] | null => {
  return measure.hazardMitigation?.find(m => m.hazardId === hazardId) || null;
};

/**
 * Get all measures that specifically mitigate a hazard with effectiveness above threshold
 */
export const getEffectiveMeasuresForHazard = (
  measures: ExtendedMeasure[],
  hazardId: string,
  minEffectiveness: number = 50
): ExtendedMeasure[] => {
  return measures.filter(measure => {
    const mitigation = getMeasureHazardMitigation(measure, hazardId);
    return mitigation && mitigation.effectiveness.overallRiskReduction >= minEffectiveness;
  });
};

/**
 * Get measures sorted by effectiveness for a specific hazard
 */
export const getMeasuresByEffectiveness = (
  measures: ExtendedMeasure[],
  hazardId: string
): Array<{ measure: ExtendedMeasure; effectiveness: number }> => {
  return measures
    .map(measure => {
      const mitigation = getMeasureHazardMitigation(measure, hazardId);
      return {
        measure,
        effectiveness: mitigation?.effectiveness.overallRiskReduction || 0
      };
    })
    .filter(item => item.effectiveness > 0)
    .sort((a, b) => b.effectiveness - a.effectiveness);
};

/**
 * Get environmental risks mitigated by a measure
 */
export const getEnvironmentalRisksMitigated = (
  measure: ExtendedMeasure
): ExtendedMeasure['environmentalRiskMitigation'] => {
  return measure.environmentalRiskMitigation || [];
};

/**
 * Check if a measure mitigates a specific environmental risk type
 */
export const mitigatesEnvironmentalRisk = (
  measure: ExtendedMeasure,
  riskType: ExtendedMeasure['environmentalRiskMitigation'][0]['riskType']
): boolean => {
  return measure.environmentalRiskMitigation?.some(r => r.riskType === riskType) || false;
};

/**
 * Get comprehensive mitigation summary for a measure
 */
export const getMeasureMitigationSummary = (measure: ExtendedMeasure): {
  hazardsMitigated: Array<{
    hazardId: string;
    hazardCode: string;
    effectiveness: number;
    mechanism: string;
  }>;
  environmentalRisksMitigated: Array<{
    riskType: string;
    effectiveness: number;
  }>;
  totalHazards: number;
  totalEnvironmentalRisks: number;
} => {
  const hazardsMitigated = (measure.hazardMitigation || []).map(m => ({
    hazardId: m.hazardId,
    hazardCode: m.hazardCode,
    effectiveness: m.effectiveness.overallRiskReduction,
    mechanism: m.mitigationMechanism
  }));

  const environmentalRisksMitigated = (measure.environmentalRiskMitigation || []).map(r => ({
    riskType: r.riskType,
    effectiveness: r.effectiveness
  }));

  return {
    hazardsMitigated,
    environmentalRisksMitigated,
    totalHazards: hazardsMitigated.length,
    totalEnvironmentalRisks: environmentalRisksMitigated.length
  };
};

/**
 * Validate measure-hazard linkage completeness
 */
export const validateMeasureLinkage = (measure: ExtendedMeasure): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check if hazardMitigation exists
  if (!measure.hazardMitigation || measure.hazardMitigation.length === 0) {
    issues.push('No hazard mitigation details defined');
  }

  // Check if all applicableHazards have mitigation details
  if (measure.applicableHazards && measure.hazardMitigation) {
    const mitigatedHazardIds = new Set(measure.hazardMitigation.map(m => m.hazardId));
    measure.applicableHazards.forEach(hazardId => {
      if (!mitigatedHazardIds.has(hazardId)) {
        issues.push(`Hazard ${hazardId} listed in applicableHazards but no mitigation details provided`);
      }
    });
  }

  // Check effectiveness values are valid (0-100)
  measure.hazardMitigation?.forEach((mitigation, index) => {
    const eff = mitigation.effectiveness.overallRiskReduction;
    if (eff < 0 || eff > 100) {
      issues.push(`Hazard ${mitigation.hazardId}: effectiveness out of range (${eff}%)`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
};
