/**
 * Tasks Routes
 * Manage task assignments and tracking
 */

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticate, checkOperationPermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import { emitToUser, emitToOperation } from '../config/socketio';

const router = Router();

router.use(authenticate as any);

/**
 * GET /tasks
 * Get tasks (filtered by user, operation, status)
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const assignedTo = req.query.assignedTo || req.userId;
    const operationId = req.query.operationId;
    const status = req.query.status;

    let sql = `
      SELECT t.*, 
             op.name as operation_name,
             a.name as asset_name,
             assigner.name as assigned_by_name,
             assignee.name as assigned_to_name
      FROM tasks t
      LEFT JOIN operations op ON op.id = t.operation_id
      LEFT JOIN assets a ON a.id = t.asset_id
      LEFT JOIN users assigner ON assigner.id = t.assigned_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (assignedTo) {
      sql += ` AND t.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    if (operationId) {
      sql += ` AND t.operation_id = $${paramIndex}`;
      params.push(operationId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY t.created_at DESC';

    const tasks = await query(sql, params);

    return res.json({ tasks });
  } catch (error: any) {
    logger.error('Get tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /tasks
 * Create new task
 */
router.post(
  '/',
  [
    body('operationId').isUUID(),
    body('assignedTo').isUUID(),
    body('type').isIn(['EVALUATE', 'REVIEW', 'UPLOAD_EVIDENCE', 'COMPLETE_CHECKLIST']),
    body('title').trim().isLength({ min: 1 })
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
        assignedTo,
        type,
        title,
        description,
        dueDate,
        priority
      } = req.body;

      // Check permissions
      const hasPermission = await checkOperationPermission(req.userId, operationId, 'edit');
      if (!hasPermission && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await query<{ id: string }>(
        `INSERT INTO tasks (
          operation_id, asset_id, assigned_to, assigned_by,
          type, title, description, due_date, priority, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
        RETURNING id`,
        [
          operationId,
          assetId || null,
          assignedTo,
          req.userId,
          type,
          title,
          description || null,
          dueDate ? new Date(dueDate) : null,
          priority || 'MEDIUM'
        ]
      );

      if (result.length === 0) {
        return res.status(500).json({ error: 'Failed to create task' });
      }

      const taskId = result[0].id;

      // Create notification for assigned user
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'ASSIGNMENT', $2, $3, $4)`,
        [
          assignedTo,
          'New task assigned',
          `${req.user.name} assigned you a task: ${title}`,
          `/operations/${operationId}${assetId ? `/assets/${assetId}` : ''}`
        ]
      );

      // Emit real-time update
      emitToUser(assignedTo, 'task:assigned', { taskId });
      emitToOperation(operationId, 'task:created', { taskId });

      return res.status(201).json({ id: taskId, message: 'Task created successfully' });
    } catch (error: any) {
      logger.error('Create task error:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

/**
 * PUT /tasks/:id/status
 * Update task status
 */
router.put(
  '/:id/status',
  [body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'])],
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const tasks = await query<{
        operation_id: string;
        assigned_to: string;
        assigned_by: string;
      }>(
        'SELECT operation_id, assigned_to, assigned_by FROM tasks WHERE id = $1',
        [id]
      );

      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = tasks[0];

      // Only assigned user or admin can update status
      if (task.assigned_to !== req.userId && req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updateFields: string[] = ['status = $1'];
      const updateValues: any[] = [status];

      if (status === 'COMPLETED') {
        updateFields.push('completed_at = NOW()');
      } else if (status !== 'COMPLETED') {
        updateFields.push('completed_at = NULL');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await query(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${updateValues.length}`,
        updateValues
      );

      // Create notification for task creator
      if (status === 'COMPLETED') {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, 'TASK', $2, $3, $4)`,
          [
            task.assigned_by,
            'Task completed',
            `${req.user.name} completed a task`,
            `/operations/${task.operation_id}`
          ]
        );
      }

      // Emit real-time update
      emitToUser(task.assigned_to, 'task:updated', { taskId: id, status });
      emitToOperation(task.operation_id, 'task:updated', { taskId: id });

      return res.json({ message: 'Task status updated' });
    } catch (error: any) {
      logger.error('Update task error:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

/**
 * DELETE /tasks/:id
 * Delete task
 */
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const tasks = await query<{ operation_id: string; assigned_by: string }>(
      'SELECT operation_id, assigned_by FROM tasks WHERE id = $1',
      [id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];

    // Only creator or admin can delete
    if (task.assigned_by !== req.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM tasks WHERE id = $1', [id]);

    // Emit real-time update
    emitToOperation(task.operation_id, 'task:deleted', { taskId: id });

    return res.json({ message: 'Task deleted' });
  } catch (error: any) {
    logger.error('Delete task error:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
