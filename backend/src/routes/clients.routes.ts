/**
 * Clients Routes
 * CRUD operations for clients
 */

import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { enforceClientIsolation } from '../middleware/dataIsolation';
import { logger } from '../utils/logger';

const router = Router();

// Apply isolation middleware to routes with :id parameter
router.use('/:id', authenticate as any, enforceClientIsolation);
router.use('/:id/*', authenticate as any, enforceClientIsolation);

/**
 * GET /clients
 * List all clients accessible by the user
 */
router.get('/', authenticate as any, async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.userId;
    const userRole = req.user?.role;

    let clients;
    if (userRole === 'Admin') {
      // Admins can see all clients
      clients = await query(
        `SELECT c.*, 
                u1.name as created_by_name,
                u2.name as updated_by_name
         FROM clients c
         LEFT JOIN users u1 ON c.created_by = u1.id
         LEFT JOIN users u2 ON c.updated_by = u2.id
         ORDER BY c.created_at DESC`
      );
    } else {
      // Regular users see clients they created or have access via operations
      clients = await query(
        `SELECT DISTINCT c.*, 
                u1.name as created_by_name,
                u2.name as updated_by_name
         FROM clients c
         LEFT JOIN users u1 ON c.created_by = u1.id
         LEFT JOIN users u2 ON c.updated_by = u2.id
         LEFT JOIN operations o ON o.client_id = c.id
         LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
         WHERE c.created_by = $1 OR uop.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      );
    }

    res.json({ clients });
  } catch (error: any) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * GET /clients/:id
 * Get a specific client
 */
router.get('/:id', 
  authenticate as any,
  [param('id').isUUID().withMessage('Invalid client ID format')],
  async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId || req.user?.id || req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    // Check access
    let clients;
    if (userRole === 'Admin') {
      clients = await query(
        `SELECT c.*, 
                u1.name as created_by_name,
                u2.name as updated_by_name
         FROM clients c
         LEFT JOIN users u1 ON c.created_by = u1.id
         LEFT JOIN users u2 ON c.updated_by = u2.id
         WHERE c.id = $1`,
        [id]
      );
    } else {
      clients = await query(
        `SELECT DISTINCT c.*, 
                u1.name as created_by_name,
                u2.name as updated_by_name
         FROM clients c
         LEFT JOIN users u1 ON c.created_by = u1.id
         LEFT JOIN users u2 ON c.updated_by = u2.id
         LEFT JOIN operations o ON o.client_id = c.id
         LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
         WHERE c.id = $1 AND (c.created_by = $2 OR uop.user_id = $2)`,
        [id, userId]
      );
    }

    if (clients.length === 0) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    res.json({ client: clients[0] });
  } catch (error: any) {
    logger.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * POST /clients
 * Create a new client
 */
router.post(
  '/',
  authenticate as any,
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('country').optional().trim(),
    body('sector').optional().trim(),
    body('description').optional().trim()
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const { name, country, sector, description } = req.body;

      const clients = await query(
        `INSERT INTO clients (name, country, sector, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, country || null, sector || null, description || null, userId]
      );

      logger.info(`Client created: ${name} by user ${userId}`);
      res.status(201).json({ client: clients[0] });
    } catch (error: any) {
      logger.error('Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  }
);

/**
 * PUT /clients/:id
 * Update a client
 */
router.put(
  '/:id',
  authenticate as any,
  [
    param('id').isUUID().withMessage('Invalid client ID format'),
    body('name').optional().trim().isLength({ min: 1 }),
    body('country').optional().trim(),
    body('sector').optional().trim(),
    body('description').optional().trim()
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId || req.user?.id || req.user?.userId;
      const userRole = req.user?.role;
      const { id } = req.params;
      const { name, country, sector, description } = req.body;

      // Check permission (creator or admin)
      const existingClients = await query(
        'SELECT created_by FROM clients WHERE id = $1',
        [id]
      );

      if (existingClients.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      if (existingClients[0].created_by !== userId && userRole !== 'Admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Update client
      const updated = await query(
        `UPDATE clients 
         SET name = COALESCE($1, name),
             country = COALESCE($2, country),
             sector = COALESCE($3, sector),
             description = COALESCE($4, description),
             updated_by = $5,
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, country, sector, description, userId, id]
      );

      logger.info(`Client updated: ${id} by user ${userId}`);
      res.json({ client: updated[0] });
    } catch (error: any) {
      logger.error('Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  }
);

/**
 * DELETE /clients/:id
 * Delete a client (cascades to operations)
 */
router.delete('/:id', 
  authenticate as any,
  [param('id').isUUID().withMessage('Invalid client ID format')],
  async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId || req.user?.id || req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    // Check if client has operations (warn user)
    const operationCount = await query(
      'SELECT COUNT(*) as count FROM operations WHERE client_id = $1',
      [id]
    );
    const hasOperations = parseInt(operationCount[0]?.count || '0') > 0;

    // Check permission
    const existingClients = await query(
      'SELECT created_by FROM clients WHERE id = $1',
      [id]
    );

    if (existingClients.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (existingClients[0].created_by !== userId && userRole !== 'Admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete (CASCADE will handle operations)
    await query('DELETE FROM clients WHERE id = $1', [id]);

    logger.info(`Client deleted: ${id} by user ${userId}${hasOperations ? ` (with ${operationCount[0]?.count} operations)` : ''}`);
    res.json({ 
      message: 'Client deleted successfully',
      operationsDeleted: hasOperations ? parseInt(operationCount[0]?.count || '0') : 0
    });
  } catch (error: any) {
    logger.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
