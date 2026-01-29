/**
 * Data Isolation Middleware
 * Ensures users only access their own clients/operations
 * Admins bypass isolation
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Middleware to enforce data isolation for clients
 * Applied to routes that access clients
 */
export const enforceClientIsolation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id || (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Admins bypass isolation
    if (userRole === 'Admin') {
      return next();
    }

    // For client routes, verify access
    if (req.params.id || req.params.clientId) {
      const clientId = req.params.id || req.params.clientId;
      
      const clients = await query(
        `SELECT c.id FROM clients c
         LEFT JOIN operations o ON o.client_id = c.id
         LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
         WHERE c.id = $1 AND (c.created_by = $2 OR uop.user_id = $2)`,
        [clientId, userId]
      );

      if (clients.length === 0) {
        logger.warn(`Access denied: User ${userId} attempted to access client ${clientId}`);
        return res.status(403).json({ error: 'Access denied to this client' });
      }
    }

    next();
  } catch (error: any) {
    logger.error('Data isolation error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};

/**
 * Middleware to enforce data isolation for operations
 * Applied to routes that access operations
 */
export const enforceOperationIsolation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id || (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Admins bypass isolation
    if (userRole === 'Admin') {
      return next();
    }

    // For operation routes, verify access
    if (req.params.id || req.params.operationId) {
      const operationId = req.params.id || req.params.operationId;
      
      const operations = await query(
        `SELECT o.id FROM operations o
         LEFT JOIN user_operation_permissions uop ON uop.operation_id = o.id
         WHERE o.id = $1 AND (o.created_by = $2 OR uop.user_id = $2)`,
        [operationId, userId]
      );

      if (operations.length === 0) {
        logger.warn(`Access denied: User ${userId} attempted to access operation ${operationId}`);
        return res.status(403).json({ error: 'Access denied to this operation' });
      }
    }

    next();
  } catch (error: any) {
    logger.error('Data isolation error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};
