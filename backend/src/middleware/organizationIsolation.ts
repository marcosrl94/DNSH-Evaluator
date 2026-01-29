/**
 * Organization Isolation Middleware
 * Ensures users only access data from their organization
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Get user's organization ID from request
 */
export async function getUserOrganization(userId: string): Promise<string | null> {
  try {
    // Get user's default organization or first organization
    const orgs = await query<{ organization_id: string }>(
      `SELECT organization_id 
       FROM user_organizations 
       WHERE user_id = $1 
       ORDER BY joined_at ASC 
       LIMIT 1`,
      [userId]
    );

    if (orgs.length > 0) {
      return orgs[0].organization_id;
    }

    // Check if user has a default organization
    const users = await query<{ default_organization_id: string | null }>(
      'SELECT default_organization_id FROM users WHERE id = $1',
      [userId]
    );

    return users[0]?.default_organization_id || null;
  } catch (error: any) {
    logger.error('Error getting user organization:', error);
    return null;
  }
}

/**
 * Middleware to enforce organization isolation
 * Adds organizationId to request and ensures data access is scoped
 */
export const enforceOrganizationIsolation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id || (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's organization
    const organizationId = await getUserOrganization(userId);

    if (!organizationId) {
      // For admin users, allow access without organization (for system-wide operations)
      if (userRole === 'Admin') {
        (req as any).organizationId = null;
        return next();
      }
      return res.status(403).json({ 
        error: 'No organization assigned. Please contact your administrator.' 
      });
    }

    // Attach organization ID to request
    (req as any).organizationId = organizationId;

    // Verify user belongs to organization
    const membership = await query(
      'SELECT 1 FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
      [userId, organizationId]
    );

    if (membership.length === 0 && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    next();
  } catch (error: any) {
    logger.error('Organization isolation error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};

/**
 * Middleware to verify resource belongs to user's organization
 */
export const verifyResourceOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = (req as any).organizationId;
    const userRole = (req as any).user?.role;

    // Admins can access any organization
    if (userRole === 'Admin' || !organizationId) {
      return next();
    }

    // Check if resource belongs to organization
    const resourceId = req.params.id || req.params.operationId || req.params.clientId;
    const resourceType = req.path.split('/')[1]; // operations, clients, etc.

    if (!resourceId) {
      return next();
    }

    let tableName: string;
    let idColumn: string = 'id';

    switch (resourceType) {
      case 'operations':
        tableName = 'operations';
        break;
      case 'clients':
        tableName = 'clients';
        break;
      case 'assets':
        tableName = 'assets';
        break;
      default:
        return next(); // Unknown resource type, skip check
    }

    const resources = await query(
      `SELECT id FROM ${tableName} WHERE ${idColumn} = $1 AND organization_id = $2`,
      [resourceId, organizationId]
    );

    if (resources.length === 0) {
      logger.warn(
        `Access denied: User attempted to access ${resourceType} ${resourceId} from different organization`
      );
      return res.status(403).json({ error: 'Resource does not belong to your organization' });
    }

    next();
  } catch (error: any) {
    logger.error('Resource organization verification error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};
