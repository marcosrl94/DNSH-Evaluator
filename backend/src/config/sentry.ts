/**
 * Sentry Configuration
 * Error tracking and monitoring
 */

let Sentry: any = null;

export const initSentry = () => {
  // Only initialize if SENTRY_DSN is provided
  if (process.env.SENTRY_DSN) {
    try {
      // Dynamic import to avoid breaking if Sentry is not installed
      const sentryModule = require('@sentry/node');
      Sentry = sentryModule;

      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.headers?.authorization;
            delete event.request.cookies;
          }
          return event;
        }
      });

      console.log('✅ Sentry initialized');
    } catch (error) {
      console.warn('⚠️  Sentry not available (install @sentry/node to enable)');
    }
  }
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  if (Sentry) {
    if (context) {
      Sentry.withScope((scope: any) => {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } else {
    console.error('Error (Sentry not configured):', error);
  }
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (Sentry) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
};

export default Sentry;
