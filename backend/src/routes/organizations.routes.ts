/**
 * Organizations Routes
 * Manage organizations (tenants)
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../config/database';
import { authenticate } from '../middleware/auth';
import { enforceOrganizationIsolation, getUserOrganization } from '../middleware/organizationIsolation';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /organizations/current
 * Get current user's organization
 */
router.get('/current', enforceOrganizationIsolation, async (req: any, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(404).json({ error: 'No organization found' });
    }

    const orgs = await query<{
      id: string;
      name: string;
      slug: string;
      domain: string | null;
      logo_url: string | null;
      subscription_plan: string;
      subscription_status: string;
      settings: Record<string, any>;
    }>(
      `SELECT id, name, slug, domain, logo_url, subscription_plan, subscription_status, settings
       FROM organizations
       WHERE id = $1`,
      [organizationId]
    );

    if (orgs.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get organization members
    const members = await query(
      `SELECT u.id, u.email, u.name, u.avatar_url, uo.role, uo.joined_at
       FROM user_organizations uo
       JOIN users u ON u.id = uo.user_id
       WHERE uo.organization_id = $1
       ORDER BY uo.joined_at ASC`,
      [organizationId]
    );

    res.json({
      organization: orgs[0],
      members,
    });
  } catch (error: any) {
    logger.error('Get current organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * POST /organizations
 * Create new organization (for admin or during signup)
 */
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Organization name is required'),
    body('slug').optional().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, slug, domain } = req.body;
      const userId = req.userId;

      // Generate slug if not provided
      const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Check if slug is unique
      const existing = await query('SELECT id FROM organizations WHERE slug = $1', [orgSlug]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Organization slug already exists' });
      }

      await transaction(async (client) => {
        // Create organization
        const orgs = await query<{ id: string }>(
          `INSERT INTO organizations (name, slug, domain, created_by, subscription_plan, subscription_status)
           VALUES ($1, $2, $3, $4, 'free', 'active')
           RETURNING id`,
          [name, orgSlug, domain || null, userId],
          client
        );

        if (orgs.length === 0) {
          throw createError('Failed to create organization', 500);
        }

        const organizationId = orgs[0].id;

        // Add creator as owner
        await query(
          `INSERT INTO user_organizations (user_id, organization_id, role)
           VALUES ($1, $2, 'Owner')`,
          [userId, organizationId],
          client
        );

        // Set as user's default organization
        await query(
          'UPDATE users SET default_organization_id = $1 WHERE id = $2',
          [organizationId, userId],
          client
        );

        res.status(201).json({
          id: organizationId,
          slug: orgSlug,
          message: 'Organization created successfully',
        });
      });
    } catch (error: any) {
      logger.error('Create organization error:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

/**
 * PUT /organizations/:id
 * Update organization settings
 */
router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ min: 1 }),
    body('domain').optional().isString(),
    body('logoUrl').optional().isURL(),
  ],
  enforceOrganizationIsolation,
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.organizationId;

      // Verify user has permission (owner or admin)
      const membership = await query(
        `SELECT role FROM user_organizations 
         WHERE user_id = $1 AND organization_id = $2`,
        [req.userId, organizationId]
      );

      if (membership.length === 0 || (membership[0].role !== 'Owner' && membership[0].role !== 'Admin')) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const updates = req.body;
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex}`);
        updateValues.push(updates.name);
        paramIndex++;
      }

      if (updates.domain !== undefined) {
        updateFields.push(`domain = $${paramIndex}`);
        updateValues.push(updates.domain || null);
        paramIndex++;
      }

      if (updates.logoUrl !== undefined) {
        updateFields.push(`logo_url = $${paramIndex}`);
        updateValues.push(updates.logoUrl || null);
        paramIndex++;
      }

      if (updates.settings) {
        updateFields.push(`settings = $${paramIndex}`);
        updateValues.push(JSON.stringify(updates.settings));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      await query(
        `UPDATE organizations SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );

      res.json({ message: 'Organization updated successfully' });
    } catch (error: any) {
      logger.error('Update organization error:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

/**
 * POST /organizations/:id/members
 * Add member to organization
 */
router.post(
  '/:id/members',
  [
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('role').optional().isIn(['Admin', 'Member', 'Viewer']),
  ],
  enforceOrganizationIsolation,
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const organizationId = req.organizationId;
      const { userId: newUserId, role = 'Member' } = req.body;

      // Verify requester has permission
      const membership = await query(
        `SELECT role FROM user_organizations 
         WHERE user_id = $1 AND organization_id = $2`,
        [req.userId, organizationId]
      );

      if (membership.length === 0 || (membership[0].role !== 'Owner' && membership[0].role !== 'Admin')) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Check if user already in organization
      const existing = await query(
        'SELECT 1 FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
        [newUserId, organizationId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already in organization' });
      }

      await query(
        `INSERT INTO user_organizations (user_id, organization_id, role)
         VALUES ($1, $2, $3)`,
        [newUserId, organizationId, role]
      );

      res.status(201).json({ message: 'Member added successfully' });
    } catch (error: any) {
      logger.error('Add member error:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
);

/**
 * DELETE /organizations/:id/members/:userId
 * Remove member from organization
 */
router.delete('/:id/members/:userId', enforceOrganizationIsolation, async (req: any, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const organizationId = req.organizationId;

    // Cannot remove yourself
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    // Verify requester has permission
    const membership = await query(
      `SELECT role FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2`,
      [req.userId, organizationId]
    );

    if (membership.length === 0 || (membership[0].role !== 'Owner' && membership[0].role !== 'Admin')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await query(
      'DELETE FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
      [targetUserId, organizationId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    logger.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
