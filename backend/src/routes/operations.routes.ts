/**
 * Operations Routes
 * CRUD operations for deals/operations
 */

import { Router, Request, Response } from 'express';
import { body, validationResult, query as queryValidator } from 'express-validator';
import { query, transaction } from '../config/database';
import { authenticate, checkOperationPermission } from '../middleware/auth';
import { enforceOperationIsolation } from '../middleware/dataIsolation';
import { enforceOrganizationIsolation } from '../middleware/organizationIsolation';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { emitToOperation } from '../config/socketio';
import { checkLimit, recordUsage } from '../services/subscriptionService';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Apply organization isolation to all routes
router.use(enforceOrganizationIsolation);

// Apply operation isolation middleware to routes with :id parameter
router.use('/:id', enforceOperationIsolation);
router.use('/:id/*', enforceOperationIsolation);

/**
 * @swagger
 * /api/v1/operations:
 *   get:
 *     summary: Obtener todas las operaciones
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Límite de resultados
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por estado
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filtrar por cliente
 *     responses:
 *       200:
 *         description: Lista de operaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Operation'
 *                 pagination:
 *                   type: object
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '50');
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const clientId = req.query.clientId;

    const organizationId = req.organizationId;
    
    let sql = `
      SELECT o.*, c.name as client_name,
             COUNT(DISTINCT a.id) as asset_count,
             COUNT(DISTINCT e.id) as evaluation_count
      FROM operations o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN assets a ON a.operation_id = o.id
      LEFT JOIN dnsh_evaluations e ON e.asset_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by organization (if not admin)
    if (organizationId && req.user.role !== 'Admin') {
      sql += ` AND o.organization_id = $${paramIndex}`;
      params.push(organizationId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      sql += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by client
    if (clientId) {
      sql += ` AND o.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    // Check permissions - only show operations user has access to
    if (req.user.role !== 'Admin') {
      sql += ` AND (
        o.created_by = $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM user_operation_permissions uop
          WHERE uop.operation_id = o.id AND uop.user_id = $${paramIndex} AND uop.can_view = true
        )
      )`;
      params.push(req.userId);
      paramIndex++;
    }

    sql += ` GROUP BY o.id, c.name ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const operations = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM operations WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    // Filter by organization in count query
    if (organizationId && req.user.role !== 'Admin') {
      countSql += ` AND organization_id = $${countParamIndex}`;
      countParams.push(organizationId);
      countParamIndex++;
    }

    if (status) {
      countSql += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (clientId) {
      countSql += ` AND client_id = $${countParamIndex}`;
      countParams.push(clientId);
      countParamIndex++;
    }

    if (req.user.role !== 'Admin') {
      countSql += ` AND (
        created_by = $${countParamIndex} OR
        EXISTS (
          SELECT 1 FROM user_operation_permissions uop
          WHERE uop.operation_id = operations.id AND uop.user_id = $${countParamIndex} AND uop.can_view = true
        )
      )`;
      countParams.push(req.userId);
    }

    const countResult = await query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult[0].total);

    res.json({
      operations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Get operations error:', error);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

/**
 * GET /operations/:id
 * Get operation by ID
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, id, 'view');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const operations = await query<{
      id: string;
      client_id: string;
      name: string;
      sector_nace: string;
      country: string;
      capex: number;
      status: string;
      substantial_contribution_id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT o.*, c.name as client_name, c.country as client_country, c.sector as client_sector
       FROM operations o
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (operations.length === 0) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Get assets
    const assets = await query(
      `SELECT a.*, aa.*, e.overall_status as evaluation_status
       FROM assets a
       LEFT JOIN asset_attributes aa ON aa.asset_id = a.id
       LEFT JOIN dnsh_evaluations e ON e.asset_id = a.id
       WHERE a.operation_id = $1
       ORDER BY a.name`,
      [id]
    );

    // Get evidence documents
    const evidence = await query(
      `SELECT * FROM evidence_documents WHERE operation_id = $1 ORDER BY upload_date DESC`,
      [id]
    );

    res.json({
      ...operations[0],
      assets,
      evidenceDocuments: evidence
    });
  } catch (error: any) {
    logger.error('Get operation error:', error);
    res.status(500).json({ error: 'Failed to fetch operation' });
  }
});

/**
 * POST /operations
 * Create new operation
 */
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Operation name is required'),
    body('clientId').isUUID().withMessage('Invalid client ID format'),
    body('country').trim().isLength({ min: 1 }).withMessage('Country is required')
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        clientId,
        name,
        sectorNACE,
        country,
        capex,
        dealPrice,
        expectedReturn,
        substantialContributionId
      } = req.body;

      const userId = req.userId;
      const userRole = req.user.role;
      const organizationId = req.organizationId;

      // Check operation limit before creating
      if (organizationId) {
        const limitCheck = await checkLimit(organizationId, 'operations', 1);
        if (!limitCheck.allowed) {
          return res.status(403).json({
            error: 'Operation limit exceeded',
            reason: limitCheck.reason,
            current: limitCheck.current,
            limit: limitCheck.limit,
          });
        }
      }

      // Verify client exists
      const clients = await query(
        'SELECT id, created_by FROM clients WHERE id = $1',
        [clientId]
      );
      if (clients.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Verify user has access to this client (creator or admin)
      if (userRole !== 'Admin' && clients[0].created_by !== userId) {
        // Check if user has access via operation permissions
        const hasAccess = await query(
          `SELECT 1 FROM operations o
           JOIN user_operation_permissions uop ON uop.operation_id = o.id
           WHERE o.client_id = $1 AND uop.user_id = $2`,
          [clientId, userId]
        );
        if (hasAccess.length === 0) {
          return res.status(403).json({ error: 'Access denied to this client' });
        }
      }

      const operations = await query<{ id: string }>(
        `INSERT INTO operations (
          client_id, name, sector_nace, country, capex, deal_price,
          expected_return, substantial_contribution_id, created_by, status, organization_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Draft', $10)
        RETURNING id`,
        [
          clientId,
          name,
          sectorNACE || null,
          country,
          capex || null,
          dealPrice || null,
          expectedReturn || null,
          substantialContributionId || null,
          userId,
          organizationId
        ]
      );

      if (operations.length === 0) {
        throw createError('Failed to create operation', 500);
      }

      const operationId = operations[0].id;

      // Grant creator full permissions
      await query(
        `INSERT INTO user_operation_permissions (
          user_id, operation_id, can_view, can_edit, can_review, can_approve, can_delete, granted_by
        )
        VALUES ($1, $2, true, true, true, true, true, $1)`,
        [req.userId, operationId]
      );

      // Create audit log
      await query(
        `INSERT INTO audit_logs (operation_id, user_id, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'CREATE', 'OPERATION', $1, $3)`,
        [operationId, req.userId, JSON.stringify({ name, country })]
      );

      // Record usage
      if (organizationId) {
        await recordUsage(organizationId, 'operations', 1);
      }

      // Emit real-time update
      emitToOperation(operationId, 'operation:created', { operationId });

      res.status(201).json({ id: operationId, message: 'Operation created successfully' });
    } catch (error: any) {
      logger.error('Create operation error:', error);
      res.status(500).json({ error: 'Failed to create operation' });
    }
  }
);

/**
 * PUT /operations/:id
 * Update operation
 */
router.put(
  '/:id',
  [body('name').optional().trim().isLength({ min: 1 })],
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;

      // Check permissions
      const hasPermission = await checkOperationPermission(req.userId, id, 'edit');
      if (!hasPermission && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates = req.body;
      const allowedFields = [
        'name', 'sectorNACE', 'country', 'capex', 'dealPrice', 'expectedReturn',
        'riskWeightedCapital', 'totalAAL', 'maxRiskBand', 'sustainabilityDiscount',
        'riskAdjustment', 'status', 'substantialContributionId'
      ];

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      // Get current values for audit log
      const current = await query('SELECT * FROM operations WHERE id = $1', [id]);
      if (current.length === 0) {
        return res.status(404).json({ error: 'Operation not found' });
      }

      const changes: Record<string, { old: any; new: any }> = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push(updates[field]);
          
          // Track changes for audit
          changes[field] = {
            old: current[0][dbField],
            new: updates[field]
          };
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(req.userId);
      paramIndex++;
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      await query(
        `UPDATE operations SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );

      // Create audit log
      if (Object.keys(changes).length > 0) {
        await query(
          `INSERT INTO audit_logs (operation_id, user_id, action, entity_type, entity_id, changes)
           VALUES ($1, $2, 'UPDATE', 'OPERATION', $1, $3)`,
          [id, req.userId, JSON.stringify(changes)]
        );
      }

      // Emit real-time update
      emitToOperation(id, 'operation:updated', { operationId: id, changes });

      res.json({ message: 'Operation updated successfully' });
    } catch (error: any) {
      logger.error('Update operation error:', error);
      res.status(500).json({ error: 'Failed to update operation' });
    }
  }
);

/**
 * DELETE /operations/:id
 * Delete operation (soft delete by setting status)
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, id, 'approve');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete - archive instead of hard delete
    await query('UPDATE operations SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3', ['Archived', req.userId, id]);

    // Create audit log
    await query(
      `INSERT INTO audit_logs (operation_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, 'DELETE', 'OPERATION', $1)`,
      [id, req.userId]
    );

    // Emit real-time update
    emitToOperation(id, 'operation:deleted', { operationId: id });

    res.json({ message: 'Operation deleted successfully' });
  } catch (error: any) {
    logger.error('Delete operation error:', error);
    res.status(500).json({ error: 'Failed to delete operation' });
  }
});

export default router;
