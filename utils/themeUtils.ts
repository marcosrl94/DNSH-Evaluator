/**
 * Theme utility functions
 * Provides consistent theme-aware CSS classes with optimized contrast and readability
 * Designed for Palantir-inspired dark theme and clean minimalist light theme
 */

export const getThemeClasses = (theme: 'dark' | 'light') => {
  const isDark = theme === 'dark';
  
  return {
    // Backgrounds - Optimized contrast ratios
    bg: {
      primary: isDark ? 'bg-black' : 'bg-white',
      secondary: isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50',
      tertiary: isDark ? 'bg-[#111111]' : 'bg-gray-100',
      card: isDark ? 'bg-[#0a0a0a]' : 'bg-white',
      hover: isDark ? 'hover:bg-[#111111]' : 'hover:bg-gray-50',
      overlay: isDark ? 'bg-black/80' : 'bg-white/80',
    },
    // Text colors - WCAG AA compliant contrast ratios
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-[#c0c0c0]' : 'text-gray-700', // Improved: #b0b0b0 -> #c0c0c0 for better contrast
      tertiary: isDark ? 'text-[#999999]' : 'text-gray-600', // Improved: #888888 -> #999999
      muted: isDark ? 'text-[#777777]' : 'text-gray-500', // Improved: #666666 -> #777777
      accent: isDark ? 'text-[#00ff88]' : 'text-[#0066cc]',
      danger: isDark ? 'text-red-400' : 'text-red-600',
      warning: isDark ? 'text-[#ffb800]' : 'text-amber-600',
      success: isDark ? 'text-[#00ff88]' : 'text-green-600',
      info: isDark ? 'text-[#00a8ff]' : 'text-blue-600',
    },
    // Borders - Enhanced visibility
    border: {
      default: isDark ? 'border-[#1a1a1a]' : 'border-gray-300',
      hover: isDark ? 'border-[#2a2a2a]' : 'border-gray-400',
      accent: isDark ? 'border-[#00ff88]/30' : 'border-[#0066cc]/30',
      danger: isDark ? 'border-red-500/30' : 'border-red-500/40',
      warning: isDark ? 'border-[#ffb800]/30' : 'border-amber-500/40',
      focus: isDark ? 'border-[#00ff88]' : 'border-[#0066cc]',
    },
    // Buttons - Enhanced contrast and feedback
    button: {
      primary: isDark 
        ? 'bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00e673] active:bg-[#00cc66] active:scale-[0.98] shadow-lg shadow-[#00ff88]/20 focus:ring-2 focus:ring-[#00ff88]/50' 
        : 'bg-[#0066cc] text-white hover:bg-[#0052a3] active:bg-[#004080] active:scale-[0.98] shadow-lg shadow-[#0066cc]/20 focus:ring-2 focus:ring-[#0066cc]/50',
      secondary: isDark
        ? 'bg-[#111111] text-white border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:border-[#2a2a2a] active:bg-[#0a0a0a] active:scale-[0.98] focus:ring-2 focus:ring-[#00ff88]/30'
        : 'bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200 hover:border-gray-400 active:bg-gray-50 active:scale-[0.98] focus:ring-2 focus:ring-[#0066cc]/30',
      ghost: isDark
        ? 'text-[#999999] hover:text-white hover:bg-[#111111] active:bg-[#0a0a0a] focus:ring-2 focus:ring-[#00ff88]/30'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-50 focus:ring-2 focus:ring-[#0066cc]/30',
      danger: isDark
        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:text-red-300 active:scale-[0.98]'
        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 active:scale-[0.98]',
    },
    // Inputs - Enhanced visibility and focus states
    input: {
      bg: isDark ? 'bg-[#0a0a0a]' : 'bg-white',
      border: isDark ? 'border-[#1a1a1a]' : 'border-gray-300',
      text: isDark ? 'text-white' : 'text-gray-900',
      placeholder: isDark ? 'placeholder-[#777777]' : 'placeholder-gray-500',
      focus: isDark 
        ? 'focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] focus:bg-[#0f0f0f]' 
        : 'focus:ring-2 focus:ring-[#0066cc]/50 focus:border-[#0066cc] focus:bg-white',
      disabled: isDark ? 'bg-[#0a0a0a] text-[#555555] cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
    },
    // Unified input class for convenience
    inputClass: isDark 
      ? 'bg-[#0a0a0a] border-[#1a1a1a] text-white placeholder-[#777777] focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] focus:bg-[#0f0f0f]'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0066cc]/50 focus:border-[#0066cc] focus:bg-white',
    // Cards - Enhanced contrast and hover states
    card: {
      bg: isDark ? 'bg-[#0a0a0a]' : 'bg-white',
      border: isDark ? 'border-[#1a1a1a]' : 'border-gray-300',
      hover: isDark ? 'hover:bg-[#111111] hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/20' : 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg hover:shadow-gray-200/50',
      active: isDark ? 'active:bg-[#0f0f0f]' : 'active:bg-gray-100',
    },
    // Badges and status indicators
    badge: {
      success: isDark 
        ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' 
        : 'bg-green-50 text-green-700 border border-green-200',
      warning: isDark 
        ? 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30' 
        : 'bg-amber-50 text-amber-700 border border-amber-200',
      danger: isDark 
        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
        : 'bg-red-50 text-red-700 border border-red-200',
      info: isDark 
        ? 'bg-[#00a8ff]/20 text-[#00a8ff] border border-[#00a8ff]/30' 
        : 'bg-blue-50 text-blue-700 border border-blue-200',
      neutral: isDark 
        ? 'bg-[#1a1a1a] text-[#999999] border border-[#2a2a2a]' 
        : 'bg-gray-100 text-gray-600 border border-gray-300',
    },
    // Scrollbar styles
    scrollbar: {
      track: isDark ? 'scrollbar-track-[#0a0a0a]' : 'scrollbar-track-gray-100',
      thumb: isDark ? 'scrollbar-thumb-[#2a2a2a] hover:scrollbar-thumb-[#3a3a3a]' : 'scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400',
    },
  };
};
