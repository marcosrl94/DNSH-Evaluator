import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Functional component for error UI that can use hooks
const ErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => {
  // Safely get theme with fallback
  let theme: 'dark' | 'light' = 'dark';
  let themeClasses: ReturnType<typeof getThemeClasses>;
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    themeClasses = getThemeClasses(theme);
  } catch (err) {
    // If useTheme fails (e.g., outside ThemeProvider), use default dark theme
    theme = 'dark';
    themeClasses = getThemeClasses('dark');
  }

  return (
    <div className={`flex items-center justify-center h-full p-8 transition-colors ${themeClasses.bg.primary}`}>
      <div className={`text-center max-w-md transition-colors ${themeClasses.text.primary}`}>
        <AlertTriangle className={`w-16 h-16 mx-auto mb-4 transition-colors ${
          theme === 'dark' ? 'text-red-500' : 'text-red-600'
        }`} />
        <h2 className={`text-xl font-bold mb-2 transition-colors ${themeClasses.text.primary}`}>
          ALGO SALIÓ MAL
        </h2>
        <p className={`mb-4 transition-colors ${themeClasses.text.secondary}`}>
          {(() => {
            // #region agent log
            try {
              const msg = error?.message;
              fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:43',message:'Rendering error message',data:{errorMessageType:typeof msg,errorMessageValue:msg instanceof Object ? JSON.stringify(msg) : String(msg),errorType:String(error?.constructor?.name||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              return String(msg || 'Ocurrió un error inesperado');
            } catch (e) {
              fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:43',message:'Error converting error message',data:{conversionError:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              return 'Ocurrió un error inesperado';
            }
            // #endregion
          })()}
        </p>
        <button
          onClick={() => window.location.reload()}
          className={`px-4 py-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00e673]'
              : 'bg-[#0066cc] text-white hover:bg-[#0052a3]'
          }`}
        >
          Recargar página
        </button>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // #region agent log
    try {
      const errorData = {
        message: error?.message ? String(error.message) : 'No message',
        name: error?.name ? String(error.name) : 'No name',
        stack: error?.stack ? String(error.stack).substring(0, 500) : 'No stack',
        toString: error?.toString ? String(error.toString()) : 'No toString',
        errorType: error?.constructor?.name || 'Unknown',
        errorKeys: error ? Object.keys(error) : []
      };
      fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:66',message:'getDerivedStateFromError called',data:errorData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    } catch (e) {
      fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:66',message:'Error logging error',data:{logError:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // #region agent log
    try {
      const errorData = {
        errorMessage: error?.message ? String(error.message) : 'No message',
        errorName: error?.name ? String(error.name) : 'No name',
        errorStack: error?.stack ? String(error.stack).substring(0, 1000) : 'No stack',
        componentStack: errorInfo?.componentStack ? String(errorInfo.componentStack).substring(0, 1000) : 'No componentStack',
        errorType: error?.constructor?.name || 'Unknown'
      };
      fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:85',message:'ErrorBoundary componentDidCatch',data:errorData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    } catch (e) {
      fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:85',message:'Error in componentDidCatch logging',data:{logError:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    }
    // #endregion
    // Safely log error - errorInfo might contain circular references
    try {
      const safeErrorInfo = errorInfo ? {
        componentStack: String(errorInfo.componentStack || '')
      } : undefined;
      logger.error('ErrorBoundary caught an error:', error, safeErrorInfo);
    } catch (e) {
      // If logging fails, at least log the error message
      logger.error('ErrorBoundary caught an error:', error);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
