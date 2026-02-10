/**
 * Loading State Component
 * Provides consistent loading indicators throughout the application
 */

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import PalantirLoader from './PalantirLoader';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'default' | 'minimal' | 'inline' | 'fullscreen';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  text = 'Cargando...',
  variant = 'default',
  className = '',
}) => {
  const { theme } = useTheme();

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
          theme === 'dark' ? 'border-[#00ff88]' : 'border-[#0066cc]'
        }`}></div>
        <span className={`text-sm ${theme === 'dark' ? 'text-[#999999]' : 'text-gray-600'}`}>
          {text}
        </span>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        theme === 'dark' ? 'bg-black/90' : 'bg-white/90'
      } backdrop-blur-sm ${className}`}>
        <PalantirLoader size={size} text={text} variant="default" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <PalantirLoader size={size} text={text} variant={variant} />
    </div>
  );
};

/**
 * Skeleton Loader Component
 * Shows placeholder content while loading
 */
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = false,
}) => {
  const { theme } = useTheme();
  
  return (
    <div
      className={`animate-pulse ${
        theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-200'
      } ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
    />
  );
};

/**
 * Loading Button Component
 * Button with integrated loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const themeClasses = {
    button: theme === 'dark'
      ? 'bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00e673] active:bg-[#00cc66]'
      : 'bg-[#0066cc] text-white hover:bg-[#0052a3] active:bg-[#004080]',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.button} ${className}`}
    >
      {loading && (
        <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
          theme === 'dark' ? 'border-[#0a0a0a]' : 'border-white'
        }`}></div>
      )}
      <span>{loading ? (loadingText || 'Cargando...') : children}</span>
    </button>
  );
};
