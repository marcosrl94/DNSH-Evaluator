/**
 * Error Handling Utilities
 * 
 * Provides consistent error handling patterns across the application
 */

import { logger } from './logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  operationId?: string;
  assetId?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: ErrorContext,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Wrap async operations with consistent error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    return fallback;
  }
}

/**
 * Handle errors consistently with logging and context
 */
export function handleError(error: unknown, context?: ErrorContext): void {
  if (error instanceof AppError) {
    logger.error('Application error:', {
      message: error.message,
      code: error.code,
      context: { ...error.context, ...context },
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    logger.error('Error:', {
      message: error.message,
      context,
      stack: error.stack,
    });
  } else {
    logger.error('Unknown error:', {
      error,
      context,
    });
  }
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Map common error messages to user-friendly ones
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Error de conexión. Por favor, verifica tu conexión a internet.';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
    }
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'No tienes permisos para realizar esta acción.';
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'Recurso no encontrado.';
    }
    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return 'Error del servidor. Por favor, intenta más tarde.';
    }
    return error.message || 'Ocurrió un error inesperado.';
  }
  
  return 'Ocurrió un error inesperado.';
}

/**
 * Safe async operation wrapper that returns a result object
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    handleError(error, context);
    return {
      success: false,
      error: getUserFriendlyMessage(error),
    };
  }
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  context?: ErrorContext
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, context);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  handleError(lastError, { ...context, retries: maxRetries });
  throw lastError;
}
