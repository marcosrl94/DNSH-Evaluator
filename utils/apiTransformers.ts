/**
 * API Data Transformers
 * 
 * Centralized utilities for transforming API responses to frontend types
 * Eliminates code duplication across data management services
 */

import { Operation, Client, Asset, AssetDnshEvaluation } from '../types';
import { logger } from './logger';

/**
 * Transform API operation response to Operation type
 */
export function transformApiOperation(op: any): Operation {
  return {
    id: op.id || op.operation_id,
    clientId: op.client_id || op.clientId,
    name: op.name || 'Unnamed Operation',
    sectorNACE: op.sector_nace || op.sectorNACE || '',
    country: op.country || '',
    capex: parseFloat(op.capex) || 0,
    dealPrice: parseOptionalFloat(op.deal_price, op.dealPrice),
    expectedReturn: parseOptionalFloat(op.expected_return, op.expectedReturn),
    riskWeightedCapital: parseOptionalFloat(op.risk_weighted_capital, op.riskWeightedCapital),
    totalAAL: parseOptionalFloat(op.total_aal, op.totalAAL),
    maxRiskBand: op.max_risk_band || op.maxRiskBand,
    sustainabilityDiscount: parseOptionalFloat(op.sustainability_discount, op.sustainabilityDiscount),
    riskAdjustment: parseOptionalFloat(op.risk_adjustment, op.riskAdjustment),
    status: (op.status || 'Draft') as 'Draft' | 'Review' | 'Compliant' | 'Non-Compliant',
    substantialContributionId: op.substantial_contribution_id || op.substantialContributionId,
    assets: Array.isArray(op.assets) ? op.assets : [],
    evidenceDocuments: Array.isArray(op.evidenceDocuments) 
      ? op.evidenceDocuments 
      : (Array.isArray(op.evidence_documents) ? op.evidence_documents : []),
    archived: op.archived,
    archivedAt: op.archived_at || op.archivedAt,
    archivedBy: op.archived_by || op.archivedBy,
    archiveReason: op.archive_reason || op.archiveReason,
  };
}

/**
 * Transform API client response to Client type
 */
export function transformApiClient(c: any): Client {
  return {
    id: c.id,
    name: c.name,
    country: c.country,
    sector: c.sector,
    description: c.description,
    operations: Array.isArray(c.operations) ? c.operations : [],
  };
}

/**
 * Transform API asset response to Asset type
 */
export function transformApiAsset(assetData: any): Asset {
  return {
    id: assetData.id,
    operationId: assetData.operation_id || assetData.operationId,
    name: assetData.name,
    assetType: assetData.asset_type || assetData.assetType,
    lat: parseFloat(assetData.lat),
    lng: parseFloat(assetData.lng),
    exposedValue: parseFloat(assetData.exposed_value || assetData.exposedValue) || 0,
    attributes: assetData.attributes || {},
    dnshEvaluation: assetData.dnshEvaluation || assetData.dnsh_evaluation || undefined,
  };
}

/**
 * Parse optional float value from API response
 * Handles both snake_case and camelCase field names
 */
function parseOptionalFloat(snakeCase?: any, camelCase?: any): number | undefined {
  const value = snakeCase !== undefined ? snakeCase : camelCase;
  if (value === undefined || value === null) return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Safe API call wrapper with fallback
 * Logs errors and returns fallback value on failure
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallback: T,
  errorContext: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    logger.warn(`${errorContext}, using fallback:`, error);
    return fallback;
  }
}

/**
 * Validate API response structure
 */
export function validateApiResponse(response: any, expectedFields: string[]): boolean {
  if (!response) {
    logger.warn('Invalid API response: response is null or undefined');
    return false;
  }
  
  for (const field of expectedFields) {
    if (!(field in response)) {
      logger.warn(`Invalid API response: missing field '${field}'`);
      return false;
    }
  }
  
  return true;
}
