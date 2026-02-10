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
          {String(error?.message || 'Ocurrió un error inesperado')}
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
