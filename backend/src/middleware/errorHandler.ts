/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { captureException } from '../config/sentry';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  logger.error('API Error:', {
    statusCode,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).userId
  });

  // Send to Sentry for tracking
  if (statusCode >= 500) {
    captureException(err, {
      request: {
        path: req.path,
        method: req.method,
        userId: (req as any).userId
      }
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

/**
 * Create custom API error
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string
): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: {
      message: `Route ${req.path} not found`,
      code: 'NOT_FOUND'
    }
  });
}
