/**
 * Collaboration Indicator Component
 * Shows real-time editing indicators when other users are editing the same asset/field
 */

import React, { useState, useEffect } from 'react';
import { Users, Edit, AlertCircle } from 'lucide-react';
import { socketService } from '../src/services/socketService';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface EditingUser {
  userId: string;
  name: string;
  field: string;
  timestamp: Date;
}

interface CollaborationIndicatorProps {
  assetId: string;
  field?: string;
  showCompact?: boolean;
}

export const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({
  assetId,
  field,
  showCompact = false,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { onlineUsers } = useOnlineUsers();
  const [editingUsers, setEditingUsers] = useState<EditingUser[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const socket = (socketService as any).socket;
    if (!socket || !socket.connected) {
      return;
    }

    const handleEditingStarted = (data: { userId: string; assetId: string; field: string }) => {
      if (data.assetId !== assetId || data.userId === user?.id) {
        return;
      }

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
            timestamp: new Date()
          }];
        });
      }
    };

    const handleEditingStopped = (data: { userId: string; assetId: string; field: string }) => {
      if (data.assetId !== assetId || data.userId === user?.id) {
        return;
      }

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
  }, [assetId, user?.id, onlineUsers]);

  // Notify when user starts/stops editing
  useEffect(() => {
    if (!field || !socketService.isConnected()) {
      return;
    }

    if (isEditing) {
      socketService.joinAsset(assetId);
      (socketService as any).socket?.emit('editing:start', {
        assetId,
        field
      });
    } else {
      (socketService as any).socket?.emit('editing:stop', {
        assetId,
        field
      });
    }
  }, [isEditing, assetId, field]);

  const themeClasses = {
    bg: {
      primary: theme === 'dark' ? 'bg-black' : 'bg-white',
      secondary: theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-50',
      warning: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50',
    },
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-[#666666]' : 'text-gray-600',
      warning: theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
    },
    border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200',
  };

  if (editingUsers.length === 0) {
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
      <div className="flex items-center space-x-2 mb-2">
        <Users size={14} className={themeClasses.text.warning} />
        <span className={`text-xs font-bold font-mono uppercase tracking-wider ${themeClasses.text.warning}`}>
          COLABORACIÓN EN TIEMPO REAL
        </span>
      </div>
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
    </div>
  );
};

// Hook para usar en componentes de formulario
export const useCollaborationEditing = (assetId: string, field: string) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!socketService.isConnected()) {
      return;
    }

    if (isEditing) {
      socketService.joinAsset(assetId);
      (socketService as any).socket?.emit('editing:start', { assetId, field });
    } else {
      (socketService as any).socket?.emit('editing:stop', { assetId, field });
    }

    return () => {
      if (isEditing) {
        (socketService as any).socket?.emit('editing:stop', { assetId, field });
      }
    };
  }, [isEditing, assetId, field]);

  return {
    isEditing,
    setIsEditing,
    startEditing: () => setIsEditing(true),
    stopEditing: () => setIsEditing(false),
  };
};
