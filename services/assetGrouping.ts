/**
 * Asset Grouping Service
 * Provides flexible asset grouping for DNSH evaluation
 */

import { Asset, Operation, EUAssetType, DnshObjective } from '../types';
import { AssetGroup, GroupDnshEvaluation } from '../types/dnshExtended';

/**
 * Group assets by asset type
 */
export const groupAssetsByType = (assets: Asset[]): Map<EUAssetType, Asset[]> => {
  const groups = new Map<EUAssetType, Asset[]>();
  
  assets.forEach(asset => {
    const type = asset.assetType;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(asset);
  });
  
  return groups;
};

/**
 * Group assets by location (country/region)
 */
export const groupAssetsByLocation = (assets: Asset[]): Map<string, Asset[]> => {
  const groups = new Map<string, Asset[]>();
  
  assets.forEach(asset => {
    // Find operation to get country
    const locationKey = `${asset.operationId}_location`; // Simplified - would need operation reference
    if (!groups.has(locationKey)) {
      groups.set(locationKey, []);
    }
    groups.get(locationKey)!.push(asset);
  });
  
  return groups;
};

/**
 * Group assets by risk profile
 */
export const groupAssetsByRiskProfile = (assets: Asset[]): Map<string, Asset[]> => {
  const groups = new Map<string, Asset[]>();
  
  const riskBands = ['Very High', 'High', 'Moderate', 'Low', 'Not Assessed'];
  
  riskBands.forEach(band => {
    groups.set(band, []);
  });
  
  assets.forEach(asset => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) {
      groups.get('Not Assessed')!.push(asset);
      return;
    }
    
    // Use adaptation risk band as primary indicator
    const riskBand = evaluation.adaptationRiskBand || 'Not Assessed';
    const groupKey = riskBand === 'Very High' ? 'Very High' :
                     riskBand === 'High' ? 'High' :
                     riskBand === 'Moderate' ? 'Moderate' :
                     riskBand === 'Low' ? 'Low' : 'Not Assessed';
    
    groups.get(groupKey)!.push(asset);
  });
  
  return groups;
};

/**
 * Determine if a portfolio is homogeneous
 */
export const isHomogeneousPortfolio = (assets: Asset[]): {
  isHomogeneous: boolean;
  homogeneityType?: 'SameAssetType' | 'SameLocation' | 'SameRiskProfile';
  dominantType?: EUAssetType;
  homogeneityScore: number; // 0-1, where 1 is perfectly homogeneous
} => {
  if (assets.length === 0) {
    return { isHomogeneous: false, homogeneityScore: 0 };
  }
  
  // Check asset type homogeneity
  const typeGroups = groupAssetsByType(assets);
  const dominantType = Array.from(typeGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)[0];
  
  const typeHomogeneityScore = dominantType[1].length / assets.length;
  
  if (typeHomogeneityScore >= 0.8) {
    return {
      isHomogeneous: true,
      homogeneityType: 'SameAssetType',
      dominantType: dominantType[0],
      homogeneityScore: typeHomogeneityScore
    };
  }
  
  // Check risk profile homogeneity
  const riskGroups = groupAssetsByRiskProfile(assets);
  const dominantRisk = Array.from(riskGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)[0];
  
  const riskHomogeneityScore = dominantRisk[1].length / assets.length;
  
  if (riskHomogeneityScore >= 0.8) {
    return {
      isHomogeneous: true,
      homogeneityType: 'SameRiskProfile',
      homogeneityScore: riskHomogeneityScore
    };
  }
  
  return {
    isHomogeneous: false,
    homogeneityScore: Math.max(typeHomogeneityScore, riskHomogeneityScore)
  };
};

/**
 * Create asset groups for a portfolio
 */
export const createAssetGroups = (
  assets: Asset[],
  groupingStrategy: 'ByAssetType' | 'ByLocation' | 'ByRiskProfile' | 'Auto'
): AssetGroup[] => {
  const groups: AssetGroup[] = [];
  
  // Auto-detect best grouping strategy
  let strategy = groupingStrategy;
  if (strategy === 'Auto') {
    const homogeneity = isHomogeneousPortfolio(assets);
    if (homogeneity.isHomogeneous && homogeneity.homogeneityType === 'SameAssetType') {
      strategy = 'ByAssetType';
    } else {
      strategy = 'ByAssetType'; // Default to asset type for heterogeneous
    }
  }
  
  let assetGroups: Map<string, Asset[]>;
  
  switch (strategy) {
    case 'ByAssetType':
      assetGroups = groupAssetsByType(assets);
      break;
    case 'ByLocation':
      assetGroups = groupAssetsByLocation(assets);
      break;
    case 'ByRiskProfile':
      assetGroups = groupAssetsByRiskProfile(assets);
      break;
    default:
      assetGroups = groupAssetsByType(assets);
  }
  
  let groupIndex = 0;
  assetGroups.forEach((groupAssets, key) => {
    if (groupAssets.length === 0) return;
    
    const homogeneity = isHomogeneousPortfolio(groupAssets);
    
    groups.push({
      id: `group-${groupIndex++}`,
      name: key,
      groupType: homogeneity.isHomogeneous ? 'Homogeneous' : 'ByAssetType',
      description: `${groupAssets.length} assets grouped by ${strategy}`,
      criteria: {
        assetTypes: strategy === 'ByAssetType' ? [key as EUAssetType] : undefined,
      },
      evaluationApproach: homogeneity.isHomogeneous ? 'Aggregated' : 'Granular',
      aggregationMethod: homogeneity.isHomogeneous ? 'WorstCase' : undefined,
      assetIds: groupAssets.map(a => a.id)
    });
  });
  
  return groups;
};

/**
 * Calculate group-level DNSH evaluation
 */
export const calculateGroupEvaluation = (
  group: AssetGroup,
  assets: Asset[],
  objective: DnshObjective
): GroupDnshEvaluation['objectiveStatuses'][DnshObjective] => {
  const groupAssets = assets.filter(a => group.assetIds.includes(a.id));
  
  if (groupAssets.length === 0) {
    return {
      status: 'Not Assessed',
      complianceRate: 0,
      aggregatedJustification: 'No assets in group',
      evidenceIds: []
    };
  }
  
  let compliantCount = 0;
  let assessedCount = 0;
  const evidenceIds: string[] = [];
  
  groupAssets.forEach(asset => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) return;
    
    let status: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed' = 'Not Assessed';
    
    switch (objective) {
      case DnshObjective.MITIGATION:
        status = evaluation.mitigationStatus;
        if (evaluation.mitigationEvidence) {
          evidenceIds.push(...evaluation.mitigationEvidence);
        }
        break;
      case DnshObjective.ADAPTATION:
        status = evaluation.adaptationStatus || evaluation.adaptationStatusPreMeasures;
        break;
      case DnshObjective.WATER:
        status = evaluation.waterStatus;
        if (evaluation.waterEvidence) {
          evidenceIds.push(...evaluation.waterEvidence);
        }
        break;
      case DnshObjective.CIRCULAR:
        status = evaluation.circularStatus;
        if (evaluation.circularEvidence) {
          evidenceIds.push(...evaluation.circularEvidence);
        }
        break;
      case DnshObjective.POLLUTION:
        status = evaluation.pollutionStatus;
        if (evaluation.pollutionEvidence) {
          evidenceIds.push(...evaluation.pollutionEvidence);
        }
        break;
      case DnshObjective.BIODIVERSITY:
        status = evaluation.biodiversityStatus;
        if (evaluation.biodiversityEvidence) {
          evidenceIds.push(...evaluation.biodiversityEvidence);
        }
        break;
    }
    
    if (status !== 'Not Assessed') {
      assessedCount++;
      if (status === 'Compliant') {
        compliantCount++;
      }
    }
  });
  
  const complianceRate = assessedCount > 0 
    ? Math.round((compliantCount / assessedCount) * 100) 
    : 0;
  
  // Determine aggregated status
  let aggregatedStatus: 'Compliant' | 'Non-Compliant' | 'Conditional' | 'Not Assessed';
  if (assessedCount === 0) {
    aggregatedStatus = 'Not Assessed';
  } else if (compliantCount === assessedCount) {
    aggregatedStatus = 'Compliant';
  } else if (compliantCount === 0) {
    aggregatedStatus = 'Non-Compliant';
  } else {
    aggregatedStatus = 'Conditional';
  }
  
  return {
    status: aggregatedStatus,
    complianceRate,
    aggregatedJustification: group.evaluationApproach === 'Aggregated' 
      ? `Aggregated evaluation for ${groupAssets.length} homogeneous assets`
      : `Granular evaluation: ${compliantCount}/${assessedCount} assets compliant`,
    evidenceIds: Array.from(new Set(evidenceIds))
  };
};
