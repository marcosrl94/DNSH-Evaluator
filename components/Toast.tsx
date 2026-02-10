/**
 * Toast Notification Component
 * Provides user feedback for actions and errors
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: {
      bg: theme === 'dark' ? 'bg-[#00ff88]/20' : 'bg-green-50',
      border: theme === 'dark' ? 'border-[#00ff88]/30' : 'border-green-200',
      text: theme === 'dark' ? 'text-[#00ff88]' : 'text-green-700',
      icon: theme === 'dark' ? 'text-[#00ff88]' : 'text-green-600',
    },
    error: {
      bg: theme === 'dark' ? 'bg-red-500/20' : 'bg-red-50',
      border: theme === 'dark' ? 'border-red-500/30' : 'border-red-200',
      text: theme === 'dark' ? 'text-red-400' : 'text-red-700',
      icon: theme === 'dark' ? 'text-red-400' : 'text-red-600',
    },
    info: {
      bg: theme === 'dark' ? 'bg-[#00a8ff]/20' : 'bg-blue-50',
      border: theme === 'dark' ? 'border-[#00a8ff]/30' : 'border-blue-200',
      text: theme === 'dark' ? 'text-[#00a8ff]' : 'text-blue-700',
      icon: theme === 'dark' ? 'text-[#00a8ff]' : 'text-blue-600',
    },
    warning: {
      bg: theme === 'dark' ? 'bg-[#ffb800]/20' : 'bg-amber-50',
      border: theme === 'dark' ? 'border-[#ffb800]/30' : 'border-amber-200',
      text: theme === 'dark' ? 'text-[#ffb800]' : 'text-amber-700',
      icon: theme === 'dark' ? 'text-[#ffb800]' : 'text-amber-600',
    },
  };

  const Icon = icons[toast.type];
  const colorScheme = colors[toast.type];

  return (
    <div
      className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ${
        colorScheme.bg
      } ${colorScheme.border} ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${colorScheme.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${colorScheme.text}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors ${colorScheme.text}`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast hook for easy usage
let toastIdCounter = 0;
const toastListeners: Set<(toast: Toast) => void> = new Set();

export const useToast = () => {
  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const toast: Toast = {
      id: `toast-${++toastIdCounter}`,
      message,
      type,
      duration,
    };
    toastListeners.forEach((listener) => listener(toast));
  };

  return {
    showToast,
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
  };
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
    };
    toastListeners.add(listener);

    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={handleClose} />
    </>
  );
};
