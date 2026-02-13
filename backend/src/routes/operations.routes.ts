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
    let countSql = 'SELECT COUNT(*) as total FROM operations o WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    // Filter by organization in count query
    if (organizationId && req.user.role !== 'Admin') {
      countSql += ` AND o.organization_id = $${countParamIndex}`;
      countParams.push(organizationId);
      countParamIndex++;
    }

    if (status) {
      countSql += ` AND o.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (clientId) {
      countSql += ` AND o.client_id = $${countParamIndex}`;
      countParams.push(clientId);
      countParamIndex++;
    }

    if (req.user.role !== 'Admin') {
      countSql += ` AND (
        o.created_by = $${countParamIndex} OR
        EXISTS (
          SELECT 1 FROM user_operation_permissions uop
          WHERE uop.operation_id = o.id AND uop.user_id = $${countParamIndex} AND uop.can_view = true
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

    // Get assets with full DNSH evaluation (latest per asset)
    const assetsRaw = await query(
      `SELECT a.*, aa.elevation_meters, aa.distance_to_coast_km, aa.year_built,
              aa.flood_protection_level, aa.water_dependency, aa.temperature_tolerance_c,
              aa.nace_code, aa.taxonomy_activity, aa.substantial_contribution, aa.site_type,
              aa.materials, aa.construction_year, aa.operational_year, aa.capacity, aa.capacity_unit,
              aa.adaptation_hazard_scope,
              e.id as eval_id, e.overall_status, e.mitigation_status, e.adaptation_status,
              e.adaptation_status_pre_measures, e.adaptation_status_post_measures,
              e.adaptation_risk_band, e.water_status, e.circular_status, e.pollution_status,
              e.biodiversity_status, e.overall_notes, e.evaluation_date, e.mitigation_evidence,
              e.adaptation_measures, e.water_evidence, e.circular_evidence, e.pollution_evidence,
              e.biodiversity_evidence
       FROM assets a
       LEFT JOIN asset_attributes aa ON aa.asset_id = a.id
       LEFT JOIN LATERAL (
         SELECT * FROM dnsh_evaluations WHERE asset_id = a.id
         ORDER BY evaluation_date DESC LIMIT 1
       ) e ON true
       WHERE a.operation_id = $1
       ORDER BY a.name`,
      [id]
    );

    // Transform assets with attributes object and dnshEvaluation for frontend
    const assets = assetsRaw.map((row: any) => {
      const attrs: Record<string, any> = {};
      if (row.elevation_meters != null) attrs.elevationMeters = parseFloat(row.elevation_meters);
      if (row.distance_to_coast_km != null) attrs.distanceToCoastKm = parseFloat(row.distance_to_coast_km);
      if (row.year_built != null) attrs.yearBuilt = row.year_built;
      if (row.flood_protection_level != null) attrs.floodProtectionLevel = row.flood_protection_level;
      if (row.water_dependency != null) attrs.waterDependency = row.water_dependency;
      if (row.temperature_tolerance_c != null) attrs.temperatureToleranceC = parseFloat(row.temperature_tolerance_c);
      if (row.nace_code != null) attrs.naceCode = row.nace_code;
      if (row.taxonomy_activity != null) attrs.taxonomyActivity = row.taxonomy_activity;
      if (row.substantial_contribution != null) attrs.substantialContribution = row.substantial_contribution;
      if (row.site_type != null) attrs.siteType = row.site_type;
      if (row.materials != null) attrs.materials = row.materials;
      if (row.construction_year != null) attrs.constructionYear = row.construction_year;
      if (row.operational_year != null) attrs.operationalYear = row.operational_year;
      if (row.capacity != null) attrs.capacity = parseFloat(row.capacity);
      if (row.capacity_unit != null) attrs.capacityUnit = row.capacity_unit;
      if (row.adaptation_hazard_scope != null) attrs.adaptationHazardScope = row.adaptation_hazard_scope;

      const asset: any = {
        id: row.id,
        operation_id: row.operation_id,
        name: row.name,
        asset_type: row.asset_type,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        exposed_value: parseFloat(row.exposed_value || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
        attributes: attrs,
      };
      if (row.eval_id) {
        asset.dnshEvaluation = {
          assetId: row.id,
          evaluationDate: row.evaluation_date,
          evaluator: 'Analyst User',
          mitigationStatus: row.mitigation_status,
          adaptationStatus: row.adaptation_status,
          adaptationStatusPreMeasures: row.adaptation_status_pre_measures,
          adaptationStatusPostMeasures: row.adaptation_status_post_measures,
          adaptationRiskBand: row.adaptation_risk_band,
          waterStatus: row.water_status,
          circularStatus: row.circular_status,
          pollutionStatus: row.pollution_status,
          biodiversityStatus: row.biodiversity_status,
          overallStatus: row.overall_status,
          overallNotes: row.overall_notes,
          mitigationEvidence: row.mitigation_evidence || [],
          adaptationMeasures: row.adaptation_measures || [],
          waterEvidence: row.water_evidence || [],
          circularEvidence: row.circular_evidence || [],
          pollutionEvidence: row.pollution_evidence || [],
          biodiversityEvidence: row.biodiversity_evidence || [],
        };
      }
      return asset;
    });

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
        substantialContributionId,
        assets: assetsPayload
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

      const operationId = await transaction(async (client) => {
        const opsResult = await client.query<{ id: string }>(
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

        if (opsResult.rows.length === 0) {
          throw createError('Failed to create operation', 500);
        }

        const opId = opsResult.rows[0].id;

        // Create assets when provided
        const assets = Array.isArray(assetsPayload) ? assetsPayload : [];
        for (const a of assets) {
          const an = a.name?.trim?.();
          const at = (a.assetType || a.asset_type)?.trim?.();
          const alat = parseFloat(a.lat);
          const alng = parseFloat(a.lng);
          if (!an || !at || isNaN(alat) || isNaN(alng)) continue;
          const assetResult = await client.query<{ id: string }>(
            `INSERT INTO assets (operation_id, name, asset_type, lat, lng, exposed_value)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [opId, an, at, alat, alng, a.exposedValue ?? a.exposed_value ?? null]
          );
          const assetId = assetResult.rows[0]?.id;
          if (!assetId) continue;
          const attrs = a.attributes || {};
          const hasAttrs = attrs.elevationMeters != null || attrs.distanceToCoastKm != null ||
            attrs.yearBuilt != null || attrs.siteType != null || attrs.capacity != null || attrs.capacityUnit != null;
          if (hasAttrs) {
            await client.query(
              `INSERT INTO asset_attributes (
                asset_id, elevation_meters, distance_to_coast_km, year_built,
                site_type, capacity, capacity_unit
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                assetId,
                attrs.elevationMeters ?? attrs.elevation_meters ?? null,
                attrs.distanceToCoastKm ?? attrs.distance_to_coast_km ?? null,
                attrs.yearBuilt ?? attrs.year_built ?? null,
                attrs.siteType ?? attrs.site_type ?? null,
                attrs.capacity ?? null,
                attrs.capacityUnit ?? attrs.capacity_unit ?? null
              ]
            );
          }
        }

        return opId;
      });

      // Grant creator full permissions (outside transaction for clarity)
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
