/**
 * Centralized logging utility
 * Replaces console.log with a configurable logging system
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enableInProduction: boolean;
}

const config: LogConfig = {
  level: import.meta.env.PROD ? 'warn' : 'debug',
  enableInProduction: false,
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

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  },
  
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  },
};
