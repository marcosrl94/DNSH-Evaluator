/**
 * Default Hazard Mitigation Generator
 * 
 * Helper function to generate default hazardMitigation entries
 * based on existing hazard linkages
 */

import { ExtendedMeasure } from '../types/catalog';
import { EU_TAXONOMY_HAZARDS } from '../constants';

/**
 * Generate default hazard mitigation entries for a measure
 * based on its mitigatesHazards/applicableHazards
 */
export const generateDefaultHazardMitigation = (
  measure: ExtendedMeasure
): ExtendedMeasure['hazardMitigation'] => {
  // If already has hazardMitigation, return it
  if (measure.hazardMitigation && measure.hazardMitigation.length > 0) {
    return measure.hazardMitigation;
  }

  // Get hazards from applicableHazards or mitigatesHazards
  const hazardIds = measure.applicableHazards || measure.mitigatesHazards || [];
  
  return hazardIds.map(hazardId => {
    const hazard = EU_TAXONOMY_HAZARDS.find(h => h.id === hazardId);
    
    // Default effectiveness based on measure's riskReductionPercentage
    const baseEffectiveness = measure.riskReductionPercentage || 30;
    
    return {
      hazardId,
      hazardCode: hazard?.code || 'UNKNOWN',
      mitigationMechanism: `${measure.name} mitigates ${hazard?.name || hazardId} by reducing vulnerability and exposure to this hazard.`,
      effectiveness: {
        vulnerabilityReduction: baseEffectiveness,
        overallRiskReduction: baseEffectiveness
      },
      applicabilityConditions: [
        `Effective for ${hazard?.category || 'general'} hazards`,
        'Effectiveness may vary based on local conditions'
      ]
    };
  });
};

/**
 * Ensure all measures have hazardMitigation entries
 */
export const ensureHazardMitigation = (measure: ExtendedMeasure): ExtendedMeasure => {
  if (!measure.hazardMitigation || measure.hazardMitigation.length === 0) {
    return {
      ...measure,
      hazardMitigation: generateDefaultHazardMitigation(measure)
    };
  }
  return measure;
};
