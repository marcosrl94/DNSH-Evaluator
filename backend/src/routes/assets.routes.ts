/**
 * Assets Routes
 * CRUD operations for assets
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../config/database';
import { authenticate, checkOperationPermission } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { emitToAsset, emitToOperation } from '../config/socketio';

const router = Router();

router.use(authenticate as any);

/**
 * GET /assets/:id
 * Get asset by ID
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const assets = await query(
      `SELECT a.*, aa.*, o.id as operation_id, o.name as operation_name
       FROM assets a
       LEFT JOIN asset_attributes aa ON aa.asset_id = a.id
       LEFT JOIN operations o ON o.id = a.operation_id
       WHERE a.id = $1`,
      [id]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = assets[0];

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, asset.operation_id, 'view');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get evaluation
    const evaluations = await query(
      'SELECT * FROM dnsh_evaluations WHERE asset_id = $1 ORDER BY evaluation_date DESC LIMIT 1',
      [id]
    );

    // Get evidence
    const evidence = await query(
      'SELECT * FROM evidence_documents WHERE asset_id = $1 ORDER BY upload_date DESC',
      [id]
    );

    res.json({
      ...asset,
      dnshEvaluation: evaluations[0] || null,
      evidenceDocuments: evidence
    });
  } catch (error: any) {
    logger.error('Get asset error:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

/**
 * POST /assets
 * Create new asset
 */
router.post(
  '/',
  [
    body('operationId').isUUID(),
    body('name').trim().isLength({ min: 1 }),
    body('assetType').trim().isLength({ min: 1 }),
    body('lat').isFloat(),
    body('lng').isFloat()
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { operationId, name, assetType, lat, lng, exposedValue, attributes } = req.body;

      // Check permissions
      const hasPermission = await checkOperationPermission(req.userId, operationId, 'edit');
      if (!hasPermission && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await transaction(async (client) => {
        // Create asset
        const assetResult = await client.query<{ id: string }>(
          `INSERT INTO assets (operation_id, name, asset_type, lat, lng, exposed_value)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [operationId, name, assetType, lat, lng, exposedValue || null]
        );

        if (assetResult.rows.length === 0) {
          throw createError('Failed to create asset', 500);
        }

        const assetId = assetResult.rows[0].id;

        // Create asset attributes if provided
        if (attributes) {
          await client.query(
            `INSERT INTO asset_attributes (
              asset_id, elevation_meters, distance_to_coast_km, year_built,
              flood_protection_level, water_dependency, temperature_tolerance_c,
              nace_code, taxonomy_activity, substantial_contribution, site_type,
              materials, construction_year, operational_year, capacity, capacity_unit,
              adaptation_hazard_scope
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              assetId,
              attributes.elevationMeters || null,
              attributes.distanceToCoastKm || null,
              attributes.yearBuilt || null,
              attributes.floodProtectionLevel || null,
              attributes.waterDependency || null,
              attributes.temperatureToleranceC || null,
              attributes.naceCode || null,
              attributes.taxonomyActivity || null,
              attributes.substantialContribution || null,
              attributes.siteType || null,
              attributes.materials || null,
              attributes.constructionYear || null,
              attributes.operationalYear || null,
              attributes.capacity || null,
              attributes.capacityUnit || null,
              attributes.adaptationHazardScope ? JSON.stringify(attributes.adaptationHazardScope) : null
            ]
          );
        }

        // Create audit log
        await client.query(
          `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id, changes)
           VALUES ($1, $2, $3, 'CREATE', 'ASSET', $2, $4)`,
          [operationId, assetId, req.userId, JSON.stringify({ name, assetType })]
        );

        return assetId;
      });

      // Emit real-time update
      emitToOperation(io, operationId, 'asset:created', { assetId: result });

      res.status(201).json({ id: result, message: 'Asset created successfully' });
    } catch (error: any) {
      logger.error('Create asset error:', error);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }
);

/**
 * PUT /assets/:id
 * Update asset
 */
router.put(
  '/:id',
  [body('name').optional().trim().isLength({ min: 1 })],
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get asset to check operation
      const assets = await query<{ operation_id: string }>(
        'SELECT operation_id FROM assets WHERE id = $1',
        [id]
      );

      if (assets.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const operationId = assets[0].operation_id;

      // Check permissions
      const hasPermission = await checkOperationPermission(req.userId, operationId, 'edit');
      if (!hasPermission && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get current values
      const current = await query('SELECT * FROM assets WHERE id = $1', [id]);
      const changes: Record<string, { old: any; new: any }> = {};

      // Update asset fields
      const assetFields = ['name', 'assetType', 'lat', 'lng', 'exposedValue'];
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      for (const field of assetFields) {
        if (updates[field] !== undefined) {
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push(updates[field]);
          changes[field] = {
            old: current[0][dbField],
            new: updates[field]
          };
          paramIndex++;
        }
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        await query(
          `UPDATE assets SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateValues
        );
      }

      // Update attributes if provided
      if (updates.attributes) {
        const attrFields = [
          'elevationMeters', 'distanceToCoastKm', 'yearBuilt', 'floodProtectionLevel',
          'waterDependency', 'temperatureToleranceC', 'naceCode', 'taxonomyActivity',
          'substantialContribution', 'siteType', 'materials', 'constructionYear',
          'operationalYear', 'capacity', 'capacityUnit', 'adaptationHazardScope'
        ];

        const attrUpdateFields: string[] = [];
        const attrUpdateValues: any[] = [];
        let attrParamIndex = 1;

        for (const field of attrFields) {
          if (updates.attributes[field] !== undefined) {
            const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
            attrUpdateFields.push(`${dbField} = $${attrParamIndex}`);
            
            if (field === 'adaptationHazardScope') {
              attrUpdateValues.push(JSON.stringify(updates.attributes[field]));
            } else {
              attrUpdateValues.push(updates.attributes[field]);
            }
            attrParamIndex++;
          }
        }

        if (attrUpdateFields.length > 0) {
          attrUpdateFields.push(`updated_at = NOW()`);
          attrUpdateValues.push(id);
          await query(
            `UPDATE asset_attributes SET ${attrUpdateFields.join(', ')} WHERE asset_id = $${attrParamIndex}`,
            attrUpdateValues
          );
        }
      }

      // Create audit log
      if (Object.keys(changes).length > 0) {
        await query(
          `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id, changes)
           VALUES ($1, $2, $3, 'UPDATE', 'ASSET', $2, $4)`,
          [operationId, id, req.userId, JSON.stringify(changes)]
        );
      }

      // Emit real-time update
      emitToAsset(id, 'asset:updated', { assetId: id, changes });
      emitToOperation(operationId, 'asset:updated', { assetId: id });

      res.json({ message: 'Asset updated successfully' });
    } catch (error: any) {
      logger.error('Update asset error:', error);
      res.status(500).json({ error: 'Failed to update asset' });
    }
  }
);

/**
 * DELETE /assets/:id
 * Delete asset
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Get asset to check operation
    const assets = await query<{ operation_id: string }>(
      'SELECT operation_id FROM assets WHERE id = $1',
      [id]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const operationId = assets[0].operation_id;

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, operationId, 'edit');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM assets WHERE id = $1', [id]);

    // Create audit log
    await query(
      `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, $3, 'DELETE', 'ASSET', $2)`,
      [operationId, id, req.userId]
    );

    // Emit real-time update
    emitToOperation(operationId, 'asset:deleted', { assetId: id });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error: any) {
    logger.error('Delete asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
