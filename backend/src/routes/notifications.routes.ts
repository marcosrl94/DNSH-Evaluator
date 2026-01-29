/**
 * Notifications Routes
 * Manage user notifications
 */

import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate as any);

/**
 * GET /notifications
 * Get user's notifications
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit || '50');

    let sql = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params: any[] = [req.userId];

    if (unreadOnly) {
      sql += ' AND read = false';
    }

    sql += ' ORDER BY created_at DESC LIMIT $2';
    params.push(limit);

    const notifications = await query(sql, params);

    // Get unread count
    const unreadCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.userId]
    );

    res.json({
      notifications,
      unreadCount: parseInt(unreadCount[0].count)
    });
  } catch (error: any) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req: any, res: Response) => {
  try {
    await query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false',
      [req.userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

/**
 * DELETE /notifications/:id
 * Delete notification
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, req.userId]);

    res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
