/**
 * Subscription Service
 * Handles subscription management, plan limits, and usage tracking
 */

import { query } from '../config/database';
import { logger } from '../utils/logger';

export interface PlanLimits {
  maxOperations: number;
  maxUsers: number;
  maxStorageGb: number;
  maxApiCallsPerMonth: number;
  features: Record<string, boolean>;
}

export interface UsageMetrics {
  operations: number;
  users: number;
  storageBytes: number;
  apiCalls: number;
}

/**
 * Get plan limits
 */
export async function getPlanLimits(plan: string): Promise<PlanLimits | null> {
  try {
    const limits = await query<{
      plan: string;
      max_operations: number;
      max_users: number;
      max_storage_gb: number;
      max_api_calls_per_month: number;
      features: Record<string, boolean>;
    }>(
      'SELECT * FROM plan_limits WHERE plan = $1',
      [plan]
    );

    if (limits.length === 0) {
      return null;
    }

    const limit = limits[0];
    return {
      maxOperations: limit.max_operations,
      maxUsers: limit.max_users,
      maxStorageGb: limit.max_storage_gb,
      maxApiCallsPerMonth: limit.max_api_calls_per_month,
      features: limit.features || {},
    };
  } catch (error: any) {
    logger.error('Error getting plan limits:', error);
    throw error;
  }
}

/**
 * Get current usage for an organization
 */
export async function getCurrentUsage(organizationId: string): Promise<UsageMetrics> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get operations count
    const operationsCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM operations WHERE organization_id = $1 AND status != $2',
      [organizationId, 'Archived']
    );

    // Get users count
    const usersCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM user_organizations WHERE organization_id = $1',
      [organizationId]
    );

    // Get storage (estimate from evidence documents)
    const storageResult = await query<{ total_bytes: string }>(
      `SELECT COALESCE(SUM(file_size), 0) as total_bytes 
       FROM evidence_documents 
       WHERE organization_id = $1`,
      [organizationId]
    );

    // Get API calls for current month
    const apiCallsResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(metric_value::bigint), 0) as total
       FROM usage_metrics
       WHERE organization_id = $1 
       AND metric_type = 'api_calls'
       AND period_start >= $2 
       AND period_end <= $3`,
      [organizationId, monthStart, monthEnd]
    );

    return {
      operations: parseInt(operationsCount[0]?.count || '0'),
      users: parseInt(usersCount[0]?.count || '0'),
      storageBytes: parseInt(storageResult[0]?.total_bytes || '0'),
      apiCalls: parseInt(apiCallsResult[0]?.total || '0'),
    };
  } catch (error: any) {
    logger.error('Error getting current usage:', error);
    throw error;
  }
}

/**
 * Check if organization can perform an action based on plan limits
 */
export async function checkLimit(
  organizationId: string,
  limitType: 'operations' | 'users' | 'storage' | 'api_calls',
  value: number = 1
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
  try {
    // Get organization's plan
    const orgs = await query<{ subscription_plan: string }>(
      'SELECT subscription_plan FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgs.length === 0) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const plan = orgs[0].subscription_plan;
    const limits = await getPlanLimits(plan);

    if (!limits) {
      return { allowed: false, reason: 'Plan limits not found' };
    }

    // Get current usage
    const usage = await getCurrentUsage(organizationId);

    let current: number;
    let limit: number;

    switch (limitType) {
      case 'operations':
        current = usage.operations;
        limit = limits.maxOperations;
        break;
      case 'users':
        current = usage.users;
        limit = limits.maxUsers;
        break;
      case 'storage':
        current = Math.ceil(usage.storageBytes / (1024 * 1024 * 1024)); // Convert to GB
        limit = limits.maxStorageGb;
        break;
      case 'api_calls':
        current = usage.apiCalls;
        limit = limits.maxApiCallsPerMonth;
        break;
      default:
        return { allowed: false, reason: 'Invalid limit type' };
    }

    // 0 means unlimited
    if (limit === 0) {
      return { allowed: true, current, limit: 0 };
    }

    const allowed = current + value <= limit;

    return {
      allowed,
      current,
      limit,
      reason: allowed ? undefined : `Limit exceeded. Current: ${current}, Limit: ${limit}`,
    };
  } catch (error: any) {
    logger.error('Error checking limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Record usage metric
 */
export async function recordUsage(
  organizationId: string,
  metricType: 'operations' | 'users' | 'storage_bytes' | 'api_calls',
  value: number
): Promise<void> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Check if metric exists for this period
    const existing = await query(
      `SELECT id FROM usage_metrics 
       WHERE organization_id = $1 
       AND metric_type = $2 
       AND period_start = $3 
       AND period_end = $4`,
      [organizationId, metricType, monthStart, monthEnd]
    );

    if (existing.length > 0) {
      // Update existing metric
      await query(
        `UPDATE usage_metrics 
         SET metric_value = metric_value + $1 
         WHERE id = $2`,
        [value, existing[0].id]
      );
    } else {
      // Create new metric
      await query(
        `INSERT INTO usage_metrics (organization_id, metric_type, metric_value, period_start, period_end)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, metricType, value, monthStart, monthEnd]
      );
    }
  } catch (error: any) {
    logger.error('Error recording usage:', error);
    // Don't throw - usage tracking shouldn't break the main flow
  }
}

/**
 * Get organization subscription info
 */
export async function getOrganizationSubscription(organizationId: string) {
  try {
    const orgs = await query<{
      id: string;
      subscription_plan: string;
      subscription_status: string;
      subscription_ends_at: Date | null;
      trial_ends_at: Date | null;
    }>(
      'SELECT id, subscription_plan, subscription_status, subscription_ends_at, trial_ends_at FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgs.length === 0) {
      return null;
    }

    const org = orgs[0];
    const limits = await getPlanLimits(org.subscription_plan);
    const usage = await getCurrentUsage(organizationId);

    return {
      organizationId: org.id,
      plan: org.subscription_plan,
      status: org.subscription_status,
      subscriptionEndsAt: org.subscription_ends_at,
      trialEndsAt: org.trial_ends_at,
      limits: limits || undefined,
      usage,
    };
  } catch (error: any) {
    logger.error('Error getting organization subscription:', error);
    throw error;
  }
}
