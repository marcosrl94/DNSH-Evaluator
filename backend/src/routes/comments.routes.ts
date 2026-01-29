/**
 * Comments Routes
 * Manage comments and discussions
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticate, checkOperationPermission } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { emitToOperation, emitToAsset } from '../config/socketio';

const router = Router();

router.use(authenticate as any);

/**
 * GET /comments/operation/:operationId
 * Get all comments for an operation
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
      SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_url,
             resolved_user.name as resolved_by_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN users resolved_user ON resolved_user.id = c.resolved_by
      WHERE c.operation_id = $1
    `;
    const params: any[] = [operationId];

    if (assetId) {
      sql += ' AND c.asset_id = $2';
      params.push(assetId);
    }

    sql += ' ORDER BY c.created_at ASC';

    const comments = await query(sql, params);

    // Organize into threads (parent comments with replies)
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments.forEach((comment: any) => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    comments.forEach((comment: any) => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    res.json({ comments: rootComments });
  } catch (error: any) {
    logger.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * POST /comments
 * Create new comment
 */
router.post(
  '/',
  [
    body('operationId').isUUID(),
    body('content').trim().isLength({ min: 1 })
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        operationId,
        assetId,
        questionId,
        parentCommentId,
        content,
        mentions,
        attachments
      } = req.body;

      // Check permissions
      const hasPermission = await checkOperationPermission(req.userId, operationId, 'view');
      if (!hasPermission && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await query<{ id: string }>(
        `INSERT INTO comments (
          operation_id, asset_id, question_id, parent_comment_id,
          user_id, content, mentions, attachments
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          operationId,
          assetId || null,
          questionId || null,
          parentCommentId || null,
          req.userId,
          content,
          mentions ? (Array.isArray(mentions) ? mentions : [mentions]) : null,
          attachments ? (Array.isArray(attachments) ? attachments : [attachments]) : null
        ]
      );

      if (result.length === 0) {
        throw createError('Failed to create comment', 500);
      }

      const commentId = result[0].id;

      // Get created comment with user info
      const comments = await query(
        `SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_url
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [commentId]
      );

      // Create notifications for mentioned users
      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, 'COMMENT', $2, $3, $4)`,
            [
              mentionedUserId,
              'Mentioned in comment',
              `${req.user.name} mentioned you in a comment`,
              `/operations/${operationId}${assetId ? `/assets/${assetId}` : ''}`,
              `/operations/${operationId}${assetId ? `/assets/${assetId}` : ''}`
            ]
          );
        }
      }

      // Emit real-time update
      emitToOperation(operationId, 'comment:created', { commentId, operationId });
      if (assetId) {
        emitToAsset(assetId, 'comment:created', { commentId, assetId });
      }

      res.status(201).json({ comment: comments[0] });
    } catch (error: any) {
      logger.error('Create comment error:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

/**
 * PUT /comments/:id/resolve
 * Mark comment as resolved
 */
router.put('/:id/resolve', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const comments = await query<{ operation_id: string; asset_id: string | null }>(
      'SELECT operation_id, asset_id FROM comments WHERE id = $1',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = comments[0];

    // Check permissions
    const hasPermission = await checkOperationPermission(req.userId, comment.operation_id, 'edit');
    if (!hasPermission && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query(
      `UPDATE comments SET resolved = true, resolved_by = $1, resolved_at = NOW() WHERE id = $2`,
      [req.userId, id]
    );

    // Emit real-time update
    emitToOperation(io, comment.operation_id, 'comment:resolved', { commentId: id });

    res.json({ message: 'Comment resolved' });
  } catch (error: any) {
    logger.error('Resolve comment error:', error);
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
});

/**
 * DELETE /comments/:id
 * Delete comment
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const comments = await query<{ operation_id: string; user_id: string }>(
      'SELECT operation_id, user_id FROM comments WHERE id = $1',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = comments[0];

    // Only author or admin can delete
    if (comment.user_id !== req.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM comments WHERE id = $1', [id]);

    // Emit real-time update
    emitToOperation(comment.operation_id, 'comment:deleted', { commentId: id });

    res.json({ message: 'Comment deleted' });
  } catch (error: any) {
    logger.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
