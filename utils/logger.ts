/**
 * Centralized logging utility
 * Replaces console.log with a configurable logging system
 * Includes context and stack traces for better debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enableInProduction: boolean;
  includeStackTraces: boolean;
}

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

const config: LogConfig = {
  level: import.meta.env.PROD ? 'warn' : 'debug',
  enableInProduction: false,
  includeStackTraces: !import.meta.env.PROD,
};

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  if (import.meta.env.PROD && !config.enableInProduction) {
    return level === 'error' || level === 'warn';
  }
  return levels[level] >= levels[config.level];
};

const formatMessage = (message: string, context?: LogContext): string => {
  if (!context) return String(message || '');
  
  try {
    const contextStr = Object.entries(context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        // Safely convert value to string
        let valueStr: string;
        if (value === null) {
          valueStr = 'null';
        } else if (typeof value === 'object') {
          try {
            valueStr = JSON.stringify(value);
          } catch (e) {
            valueStr = '[Object]';
          }
        } else {
          valueStr = String(value);
        }
        return `${String(key)}=${valueStr}`;
      })
      .join(' ');
    
    return contextStr ? `${String(message || '')} [${contextStr}]` : String(message || '');
  } catch (e) {
    // If formatting fails, return just the message
    return String(message || '');
  }
};

const getStackTrace = (): string | undefined => {
  if (!config.includeStackTraces) return undefined;
  
  try {
    throw new Error();
  } catch (e) {
    const stack = (e as Error).stack;
    if (stack) {
      // Remove first 3 lines (Error, getStackTrace, logger function)
      const lines = stack.split('\n');
      return lines.slice(3).join('\n');
    }
  }
  return undefined;
};

export const logger = {
  debug: (message: string, context?: LogContext): void => {
    if (shouldLog('debug')) {
      try {
        const safeMessage = String(message || '');
        if (context) {
          // Safely convert context to string representation
          try {
            const contextStr = formatMessage(safeMessage, context);
            console.debug('[DEBUG]', contextStr);
          } catch (e) {
            // If context formatting fails, just log the message
            console.debug('[DEBUG]', safeMessage);
          }
        } else {
          console.debug('[DEBUG]', safeMessage);
        }
      } catch (e) {
        // If everything fails, do nothing (silent fail for debug logs)
      }
    }
  },
  
  info: (message: string, context?: LogContext): void => {
    if (shouldLog('info')) {
      console.info('[INFO]', formatMessage(message, context));
    }
  },
  
  warn: (message: string, context?: LogContext): void => {
    if (shouldLog('warn')) {
      const stack = getStackTrace();
      console.warn('[WARN]', formatMessage(message, context), stack || '');
    }
  },
  
  error: (message: string, error?: unknown, context?: LogContext): void => {
    if (shouldLog('error')) {
      const stack = error instanceof Error ? error.stack : getStackTrace();
      let errorDetails: string | unknown;
      
      if (error instanceof Error) {
        // Safely convert Error to string representation
        try {
          errorDetails = {
            message: String(error.message || ''),
            name: String(error.name || 'Error'),
            stack: String(stack || '')
          };
        } catch (e) {
          errorDetails = String(error);
        }
      } else if (error !== null && error !== undefined) {
        // Safely convert other error types to string
        try {
          if (typeof error === 'object') {
            // Try JSON.stringify, but handle circular references
            try {
              errorDetails = JSON.stringify(error, null, 2);
            } catch (e) {
              errorDetails = String(error);
            }
          } else {
            errorDetails = String(error);
          }
        } catch (e) {
          errorDetails = '[Error details could not be converted to string]';
        }
      } else {
        errorDetails = undefined;
      }
      
      // Safely log error - ensure all arguments are primitives or safely converted
      try {
        const safeMessage = formatMessage(message, context);
        if (errorDetails !== undefined) {
          // Convert errorDetails to string if it's not already a primitive
          const safeErrorDetails = typeof errorDetails === 'string' 
            ? errorDetails 
            : typeof errorDetails === 'object' && errorDetails !== null
              ? JSON.stringify(errorDetails)
              : String(errorDetails);
          console.error('[ERROR]', safeMessage, safeErrorDetails);
        } else {
          console.error('[ERROR]', safeMessage);
        }
      } catch (logError) {
        // If logging itself fails, use basic console.error with string conversion
        try {
          console.error('[ERROR]', String(message), String(errorDetails || ''));
        } catch (e) {
          // Last resort - log minimal info
          console.error('[ERROR] Logging failed');
        }
      }
    }
  },
};
