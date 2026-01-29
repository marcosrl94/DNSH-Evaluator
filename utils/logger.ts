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
  if (!context) return message;
  
  const contextStr = Object.entries(context)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' ');
  
  return contextStr ? `${message} [${contextStr}]` : message;
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
      console.debug('[DEBUG]', formatMessage(message, context));
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
      const errorDetails = error instanceof Error 
        ? { message: error.message, name: error.name, stack }
        : error;
      
      console.error('[ERROR]', formatMessage(message, context), errorDetails);
    }
  },
};
