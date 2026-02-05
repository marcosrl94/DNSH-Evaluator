/**
 * Users Routes
 * User management and permissions
 */

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate as any);

/**
 * GET /users
 * Get all users (admin only)
 */
router.get('/', authorize('Admin'), async (_req: any, res: Response) => {
  try {
    const users = await query(
      `SELECT id, email, name, role, is_active, last_login_at, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users });
  } catch (error: any) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /users/:id
 * Get user by ID
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    if (id !== req.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await query(
      `SELECT id, email, name, role, avatar_url, is_active, last_login_at, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: users[0] });
  } catch (error: any) {
    logger.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /users/:id/permissions/:operationId
 * Grant permissions to user for an operation
 */
router.post(
  '/:id/permissions/:operationId',
  authorize('Admin'),
  [
    body('canView').optional().isBoolean(),
    body('canEdit').optional().isBoolean(),
    body('canReview').optional().isBoolean(),
    body('canApprove').optional().isBoolean()
  ],
  async (req: any, res: Response) => {
    try {
      const { id: userId, operationId } = req.params;
      const { canView, canEdit, canReview, canApprove } = req.body;

      // Check if permission already exists
      const existing = await query(
        'SELECT * FROM user_operation_permissions WHERE user_id = $1 AND operation_id = $2',
        [userId, operationId]
      );

      if (existing.length > 0) {
        // Update existing permissions
        await query(
          `UPDATE user_operation_permissions
           SET can_view = $1, can_edit = $2, can_review = $3, can_approve = $4,
               granted_by = $5, granted_at = NOW()
           WHERE user_id = $6 AND operation_id = $7`,
          [
            canView !== undefined ? canView : existing[0].can_view,
            canEdit !== undefined ? canEdit : existing[0].can_edit,
            canReview !== undefined ? canReview : existing[0].can_review,
            canApprove !== undefined ? canApprove : existing[0].can_approve,
            req.userId,
            userId,
            operationId
          ]
        );
      } else {
        // Create new permissions
        await query(
          `INSERT INTO user_operation_permissions (
            user_id, operation_id, can_view, can_edit, can_review, can_approve, granted_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            operationId,
            canView !== undefined ? canView : true,
            canEdit !== undefined ? canEdit : false,
            canReview !== undefined ? canReview : false,
            canApprove !== undefined ? canApprove : false,
            req.userId
          ]
        );
      }

      res.json({ message: 'Permissions updated successfully' });
    } catch (error: any) {
      logger.error('Update permissions error:', error);
      res.status(500).json({ error: 'Failed to update permissions' });
    }
  }
);

export default router;
