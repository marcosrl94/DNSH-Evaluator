/**
 * Console polyfill to prevent "Cannot convert object to primitive value" errors
 * This must be imported FIRST, before any other modules
 */

// Intercept console.error globally to safely handle objects
if (typeof console !== 'undefined' && console.error) {
  const originalConsoleError = console.error.bind(console);
  
  console.error = (...args: any[]) => {
    try {
      // Safely convert all arguments to strings
      const safeArgs = args.map(arg => {
        if (arg === null || arg === undefined) {
          return String(arg);
        }
        if (typeof arg === 'object') {
          try {
            if (arg instanceof Error) {
              return arg.message || String(arg);
            }
            // Try JSON.stringify, fallback to String
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          } catch (e) {
            return '[Object]';
          }
        }
        return String(arg);
      });
      originalConsoleError.apply(console, safeArgs);
    } catch (e) {
      // If even the safe conversion fails, use original with minimal args
      try {
        originalConsoleError('[ERROR] Logging failed');
      } catch (e2) {
        // Last resort - do nothing
      }
    }
  };
}

// Also intercept console.warn and console.log for safety
if (typeof console !== 'undefined' && console.warn) {
  const originalConsoleWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    try {
      const safeArgs = args.map(arg => {
        if (arg === null || arg === undefined) return String(arg);
        if (typeof arg === 'object') {
          try {
            if (arg instanceof Error) return arg.message || String(arg);
            try { return JSON.stringify(arg); } catch { return String(arg); }
          } catch { return '[Object]'; }
        }
        return String(arg);
      });
      originalConsoleWarn.apply(console, safeArgs);
    } catch (e) {
      try { originalConsoleWarn('[WARN] Logging failed'); } catch {}
    }
  };
}

if (typeof console !== 'undefined' && console.log) {
  const originalConsoleLog = console.log.bind(console);
  console.log = (...args: any[]) => {
    try {
      const safeArgs = args.map(arg => {
        if (arg === null || arg === undefined) return String(arg);
        if (typeof arg === 'object') {
          try {
            if (arg instanceof Error) return arg.message || String(arg);
            try { return JSON.stringify(arg); } catch { return String(arg); }
          } catch { return '[Object]'; }
        }
        return String(arg);
      });
      originalConsoleLog.apply(console, safeArgs);
    } catch (e) {
      try { originalConsoleLog('[LOG] Logging failed'); } catch {}
    }
  };
}
