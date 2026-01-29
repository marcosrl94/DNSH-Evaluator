/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: string; email: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    // Fetch user from database
    const users = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      is_active: boolean;
    }>(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.userId = decoded.userId;
    req.user = {
      id: users[0].id,
      email: users[0].email,
      name: users[0].name,
      role: users[0].role
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Check if user has permission to access operation
 */
export async function checkOperationPermission(
  userId: string,
  operationId: string,
  requiredPermission: 'view' | 'edit' | 'review' | 'approve'
): Promise<boolean> {
  // Admin has all permissions
  const user = await query<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );

  if (user.length > 0 && user[0].role === 'Admin') {
    return true;
  }

  // Check specific permissions
  const permissions = await query<{
    can_view: boolean;
    can_edit: boolean;
    can_review: boolean;
    can_approve: boolean;
  }>(
    `SELECT can_view, can_edit, can_review, can_approve 
     FROM user_operation_permissions 
     WHERE user_id = $1 AND operation_id = $2`,
    [userId, operationId]
  );

  if (permissions.length === 0) {
    return false;
  }

  const perm = permissions[0];
  
  switch (requiredPermission) {
    case 'view':
      return perm.can_view;
    case 'edit':
      return perm.can_edit;
    case 'review':
      return perm.can_review;
    case 'approve':
      return perm.can_approve;
    default:
      return false;
  }
}
