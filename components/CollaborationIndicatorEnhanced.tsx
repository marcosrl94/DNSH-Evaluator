/**
 * Enhanced Collaboration Indicator Component
 * Shows real-time editing indicators with improved UX
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Edit, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { socketService } from '../src/services/socketService';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';

interface EditingUser {
  userId: string;
  name: string;
  field: string;
  timestamp: Date;
  avatarUrl?: string;
}

interface CollaborationIndicatorEnhancedProps {
  assetId?: string;
  operationId?: string;
  field?: string;
  showCompact?: boolean;
  showOnlineUsers?: boolean;
}

export const CollaborationIndicatorEnhanced: React.FC<CollaborationIndicatorEnhancedProps> = ({
  assetId,
  operationId,
  field,
  showCompact = false,
  showOnlineUsers = true,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { onlineUsers } = useOnlineUsers();
  const [editingUsers, setEditingUsers] = useState<EditingUser[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Get relevant online users
  const relevantUsers = useMemo(() => {
    if (assetId) {
      return onlineUsers.filter(u => u.currentAssetId === assetId);
    }
    if (operationId) {
      return onlineUsers.filter(u => u.currentOperationId === operationId);
    }
    return onlineUsers;
  }, [onlineUsers, assetId, operationId]);

  useEffect(() => {
    const socket = (socketService as any).socket;
    if (!socket || !socket.connected) {
      return;
    }

    const handleEditingStarted = (data: { userId: string; assetId?: string; operationId?: string; field: string }) => {
      // Filter by context
      if (assetId && data.assetId !== assetId) return;
      if (operationId && data.operationId !== operationId) return;
      if (data.userId === user?.id) return;

      // Find user info
      const editingUser = onlineUsers.find(u => u.id === data.userId);
      if (editingUser) {
        const userName = String(editingUser.name || 'Usuario');
        setEditingUsers(prev => {
          const existing = prev.find(e => e.userId === data.userId && e.field === data.field);
          if (existing) {
            return prev.map(e => 
              e.userId === data.userId && e.field === data.field
                ? { ...e, timestamp: new Date() }
                : e
            );
          }
          return [...prev, {
            userId: String(data.userId),
            name: userName,
            field: String(data.field || ''),
            timestamp: new Date(),
            avatarUrl: editingUser.avatarUrl
          }];
        });
      }
    };

    const handleEditingStopped = (data: { userId: string; assetId?: string; operationId?: string; field: string }) => {
      if (assetId && data.assetId !== assetId) return;
      if (operationId && data.operationId !== operationId) return;
      if (data.userId === user?.id) return;

      setEditingUsers(prev => prev.filter(e => 
        !(e.userId === data.userId && e.field === data.field)
      ));
    };

    socket.on('editing:started', handleEditingStarted);
    socket.on('editing:stopped', handleEditingStopped);

    // Clean up old editing indicators (older than 5 seconds)
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setEditingUsers(prev => prev.filter(e => {
        const age = now.getTime() - e.timestamp.getTime();
        return age < 5000; // 5 seconds
      }));
    }, 1000);

    return () => {
      socket.off('editing:started', handleEditingStarted);
      socket.off('editing:stopped', handleEditingStopped);
      clearInterval(cleanupInterval);
    };
  }, [assetId, operationId, user?.id, onlineUsers]);

  // Notify when user starts/stops editing
  useEffect(() => {
    if (!field || !socketService.isConnected()) {
      return;
    }

    if (isEditing) {
      if (assetId) {
        socketService.joinAsset(assetId);
      }
      if (operationId) {
        socketService.joinOperation(operationId);
      }
      (socketService as any).socket?.emit('editing:start', {
        assetId,
        operationId,
        field
      });
    } else {
      (socketService as any).socket?.emit('editing:stop', {
        assetId,
        operationId,
        field
      });
    }
  }, [isEditing, assetId, operationId, field]);

  const themeClasses = {
    bg: {
      primary: theme === 'dark' ? 'bg-black' : 'bg-white',
      secondary: theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-50',
      warning: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50',
      hover: theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-100',
    },
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600',
      warning: theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
    },
    border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200',
  };

  if (!isVisible || (editingUsers.length === 0 && relevantUsers.length === 0)) {
    return null;
  }

  if (showCompact) {
    return (
      <div className={`flex items-center space-x-2 px-2 py-1 rounded ${themeClasses.bg.warning} border ${themeClasses.border}`}>
        <AlertCircle size={12} className={themeClasses.text.warning} />
        <span className={`text-xs font-mono ${themeClasses.text.warning}`}>
          {editingUsers.length} {editingUsers.length === 1 ? 'usuario editando' : 'usuarios editando'}
        </span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${themeClasses.border} ${themeClasses.bg.warning} mb-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Users size={14} className={themeClasses.text.warning} />
          <span className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.warning}`}>
            COLABORACIÓN EN TIEMPO REAL
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className={`p-1 rounded hover:bg-black/10 transition-colors ${themeClasses.text.warning}`}
        >
          <EyeOff size={14} />
        </button>
      </div>
      
      {/* Online Users */}
      {showOnlineUsers && relevantUsers.length > 0 && (
        <div className="mb-3">
          <OnlineUsersIndicator 
            operationId={operationId}
            assetId={assetId}
            maxVisible={3}
            position="inline"
          />
        </div>
      )}
      
      {/* Editing Users */}
      {editingUsers.length > 0 && (
        <div className="space-y-1">
          {editingUsers.map((editingUser, index) => (
            <div key={`${editingUser.userId}-${editingUser.field}-${index}`} className="flex items-center space-x-2">
              <Edit size={10} className={themeClasses.text.secondary} />
              <span className={`text-xs ${themeClasses.text.secondary} font-mono`}>
                <span className="font-semibold">{String(editingUser.name || 'Usuario')}</span>
                {' está editando '}
                <span className="font-mono uppercase">{String(editingUser.field || '')}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Hook para usar en componentes de formulario
export const useCollaborationEditing = (assetId?: string, operationId?: string, field?: string) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!field || !socketService.isConnected()) {
      return;
    }

    if (isEditing) {
      if (assetId) {
        socketService.joinAsset(assetId);
      }
      if (operationId) {
        socketService.joinOperation(operationId);
      }
      (socketService as any).socket?.emit('editing:start', { assetId, operationId, field });
    } else {
      (socketService as any).socket?.emit('editing:stop', { assetId, operationId, field });
    }

    return () => {
      if (isEditing) {
        (socketService as any).socket?.emit('editing:stop', { assetId, operationId, field });
      }
    };
  }, [isEditing, assetId, operationId, field]);

  return {
    isEditing,
    setIsEditing,
    startEditing: () => setIsEditing(true),
    stopEditing: () => setIsEditing(false),
  };
};
