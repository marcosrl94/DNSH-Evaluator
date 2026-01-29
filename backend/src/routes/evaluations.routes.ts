/**
 * DNSH Evaluations Routes
 * Manage DNSH evaluations for assets
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
 * GET /evaluations/asset/:assetId
 * Get evaluation for an asset
 */
router.get('/asset/:assetId', async (req: any, res: Response) => {
  try {
    const { assetId } = req.params;

    // Get asset to check operation
    const assets = await query<{ operation_id: string }>(
      'SELECT operation_id FROM assets WHERE id = $1',
      [assetId]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const operationId = assets[0].operation_id;

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, operationId, 'view');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const evaluations = await query(
      `SELECT e.*, u.name as evaluator_name, u.email as evaluator_email
       FROM dnsh_evaluations e
       LEFT JOIN users u ON u.id = e.evaluator_id
       WHERE e.asset_id = $1
       ORDER BY e.evaluation_date DESC
       LIMIT 1`,
      [assetId]
    );

    if (evaluations.length === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    res.json(evaluations[0]);
  } catch (error: any) {
    logger.error('Get evaluation error:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
});

/**
 * POST /evaluations
 * Create or update evaluation for an asset
 */
router.post(
  '/',
  [
    body('assetId').isUUID(),
    body('mitigationStatus').optional().isIn(['Compliant', 'Non-Compliant', 'Conditional', 'Not Assessed']),
    body('adaptationStatus').optional().isIn(['Compliant', 'Non-Compliant', 'Conditional', 'Not Assessed']),
    body('overallStatus').optional().isIn(['Compliant', 'Non-Compliant', 'Conditional', 'Not Assessed'])
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { assetId, ...evaluationData } = req.body;

      // Get asset to check operation
      const assets = await query<{ operation_id: string }>(
        'SELECT operation_id FROM assets WHERE id = $1',
        [assetId]
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

      // Check if evaluation exists
      const existing = await query(
        'SELECT id FROM dnsh_evaluations WHERE asset_id = $1 ORDER BY evaluation_date DESC LIMIT 1',
        [assetId]
      );

      let evaluationId: string;

      if (existing.length > 0) {
        // Update existing evaluation
        evaluationId = existing[0].id;

        // Get current values for audit
        const current = await query('SELECT * FROM dnsh_evaluations WHERE id = $1', [evaluationId]);
        const changes: Record<string, { old: any; new: any }> = {};

        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
          'mitigationStatus', 'mitigationEvidence', 'mitigationNotes',
          'adaptationStatus', 'adaptationStatusPreMeasures', 'adaptationStatusPostMeasures',
          'adaptationRiskBand', 'adaptationRiskBandPreMeasures', 'adaptationRiskBandPostMeasures',
          'adaptationAAL', 'adaptationMeasures', 'adaptationNotes',
          'waterStatus', 'waterEvidence', 'waterNotes',
          'circularStatus', 'circularEvidence', 'circularNotes',
          'pollutionStatus', 'pollutionEvidence', 'pollutionNotes',
          'biodiversityStatus', 'biodiversityEvidence', 'biodiversityNotes',
          'overallStatus', 'overallNotes',
          'substantialContribution', 'substantialContributionNotes',
          'checklistAnswers'
        ];

        for (const field of allowedFields) {
          if (evaluationData[field] !== undefined) {
            const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
            updateFields.push(`${dbField} = $${paramIndex}`);
            
            if (field === 'checklistAnswers' || field === 'mitigationEvidence' || 
                field === 'waterEvidence' || field === 'circularEvidence' ||
                field === 'pollutionEvidence' || field === 'biodiversityEvidence' ||
                field === 'adaptationMeasures') {
              updateValues.push(Array.isArray(evaluationData[field]) 
                ? evaluationData[field] 
                : JSON.stringify(evaluationData[field]));
            } else {
              updateValues.push(evaluationData[field]);
            }

            changes[field] = {
              old: current[0][dbField],
              new: evaluationData[field]
            };
            paramIndex++;
          }
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = NOW()`);
          updateValues.push(evaluationId);
          await query(
            `UPDATE dnsh_evaluations SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
          );
        }

        // Create audit log
        if (Object.keys(changes).length > 0) {
          await query(
            `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id, changes)
             VALUES ($1, $2, $3, 'UPDATE', 'EVALUATION', $4, $5)`,
            [operationId, assetId, req.userId, evaluationId, JSON.stringify(changes)]
          );
        }
      } else {
        // Create new evaluation
        const result = await query<{ id: string }>(
          `INSERT INTO dnsh_evaluations (
            asset_id, evaluator_id, mitigation_status, adaptation_status,
            water_status, circular_status, pollution_status, biodiversity_status,
            overall_status, checklist_answers
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            assetId,
            req.userId,
            evaluationData.mitigationStatus || 'Not Assessed',
            evaluationData.adaptationStatus || 'Not Assessed',
            evaluationData.waterStatus || 'Not Assessed',
            evaluationData.circularStatus || 'Not Assessed',
            evaluationData.pollutionStatus || 'Not Assessed',
            evaluationData.biodiversityStatus || 'Not Assessed',
            evaluationData.overallStatus || 'Not Assessed',
            evaluationData.checklistAnswers ? JSON.stringify(evaluationData.checklistAnswers) : null
          ]
        );

        if (result.length === 0) {
          throw createError('Failed to create evaluation', 500);
        }

        evaluationId = result[0].id;

        // Create audit log
        await query(
          `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id, changes)
           VALUES ($1, $2, $3, 'CREATE', 'EVALUATION', $4, $5)`,
          [operationId, assetId, req.userId, evaluationId, JSON.stringify({ assetId })]
        );
      }

      // Emit real-time update
      emitToAsset(assetId, 'evaluation:updated', { assetId, evaluationId });
      emitToOperation(operationId, 'evaluation:updated', { assetId });

      res.json({ id: evaluationId, message: 'Evaluation saved successfully' });
    } catch (error: any) {
      logger.error('Save evaluation error:', error);
      res.status(500).json({ error: 'Failed to save evaluation' });
    }
  }
);

export default router;
