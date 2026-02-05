/**
 * Evidence Routes
 * Upload, download, and manage evidence documents
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { query, transaction } from '../config/database';
import { authenticate, checkOperationPermission } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../services/s3Service';
import { emitToOperation } from '../config/socketio';
import { uploadRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate as any);
router.use('/upload', uploadRateLimiter); // Rate limit uploads

// Configure multer for file uploads (temporary storage before S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'application/pdf,image/jpeg,image/png').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * POST /evidence/upload
 * Upload evidence document
 */
router.post(
  '/upload',
  upload.single('file'),
  [
    body('operationId').isUUID(),
    body('name').trim().isLength({ min: 1 }),
    body('type').trim().isLength({ min: 1 })
  ],
  async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        operationId,
        assetId,
        name,
        type,
        description,
        relatedObjective,
        relatedQuestionId,
        tags
      } = req.body;

      // Check permissions
      const hasPermission = await checkOperationPermission(req.userId, operationId, 'edit');
      if (!hasPermission && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Upload to S3
      const fileKey = `evidence/${operationId}/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

      // Save to database
      const result = await query<{ id: string }>(
        `INSERT INTO evidence_documents (
          operation_id, asset_id, name, type, description, file_url,
          file_size, mime_type, related_objective, related_question_id,
          tags, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          operationId,
          assetId || null,
          name,
          type,
          description || null,
          fileUrl,
          req.file.size,
          req.file.mimetype,
          relatedObjective || null,
          relatedQuestionId || null,
          tags ? (Array.isArray(tags) ? tags : [tags]) : null,
          req.userId
        ]
      );

      if (result.length === 0) {
        throw createError('Failed to save evidence', 500);
      }

      const evidenceId = result[0].id;

      // Create audit log
      await query(
        `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id, changes)
         VALUES ($1, $2, $3, 'CREATE', 'EVIDENCE', $4, $5)`,
        [
          operationId,
          assetId || null,
          req.userId,
          evidenceId,
          JSON.stringify({ name, type })
        ]
      );

      // Emit real-time update
      emitToOperation(operationId, 'evidence:uploaded', { evidenceId, operationId });

      res.status(201).json({
        id: evidenceId,
        fileUrl,
        message: 'Evidence uploaded successfully'
      });
    } catch (error: any) {
      logger.error('Upload evidence error:', error);
      res.status(500).json({ error: 'Failed to upload evidence' });
    }
  }
);

/**
 * GET /evidence/:id/download
 * Get signed URL for downloading evidence
 */
router.get('/:id/download', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const evidence = await query<{
      operation_id: string;
      asset_id: string | null;
      file_url: string;
      name: string;
    }>(
      'SELECT operation_id, asset_id, file_url, name FROM evidence_documents WHERE id = $1',
      [id]
    );

    if (evidence.length === 0) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    const ev = evidence[0];

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, ev.operation_id, 'view');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(ev.file_url, 3600);

    res.json({ url: signedUrl, filename: ev.name });
  } catch (error: any) {
    logger.error('Get download URL error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * DELETE /evidence/:id
 * Delete evidence document
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const evidence = await query<{
      operation_id: string;
      asset_id: string | null;
      file_url: string;
    }>(
      'SELECT operation_id, asset_id, file_url FROM evidence_documents WHERE id = $1',
      [id]
    );

    if (evidence.length === 0) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    const ev = evidence[0];

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, ev.operation_id, 'edit');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from S3
    try {
      await deleteFromS3(ev.file_url);
    } catch (error) {
      logger.warn('Failed to delete from S3:', error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await query('DELETE FROM evidence_documents WHERE id = $1', [id]);

    // Create audit log
    await query(
      `INSERT INTO audit_logs (operation_id, asset_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, $3, 'DELETE', 'EVIDENCE', $4)`,
      [ev.operation_id, ev.asset_id, req.userId, id]
    );

    // Emit real-time update
    emitToOperation(ev.operation_id, 'evidence:deleted', { evidenceId: id });

    res.json({ message: 'Evidence deleted successfully' });
  } catch (error: any) {
    logger.error('Delete evidence error:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
});

/**
 * GET /evidence/operation/:operationId
 * Get all evidence for an operation
 */
router.get('/operation/:operationId', async (req: any, res: Response) => {
  try {
    const { operationId } = req.params;
    const assetId = req.query.assetId;

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, operationId, 'view');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let sql = `
      SELECT e.*, u.name as uploaded_by_name
      FROM evidence_documents e
      LEFT JOIN users u ON u.id = e.uploaded_by
      WHERE e.operation_id = $1
    `;
    const params: any[] = [operationId];

    if (assetId) {
      sql += ' AND e.asset_id = $2';
      params.push(assetId);
    }

    sql += ' ORDER BY e.upload_date DESC';

    const evidence = await query(sql, params);

    res.json({ evidence });
  } catch (error: any) {
    logger.error('Get evidence error:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

export default router;
