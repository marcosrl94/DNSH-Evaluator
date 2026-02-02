/**
 * Collaboration Notification Component
 * Shows toast notifications when other users perform actions
 */

import React, { useState, useEffect } from 'react';
import { X, Users, Edit, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { socketService } from '../src/services/socketService';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Notification {
  id: string;
  type: 'editing' | 'saved' | 'comment' | 'evidence';
  message: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export const CollaborationNotification: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { onlineUsers } = useOnlineUsers();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const socket = (socketService as any).socket;
    if (!socket || !socket.connected) {
      return;
    }

    const handleAssetUpdated = (data: { userId: string; assetId: string; operationId: string }) => {
      if (data.userId === user?.id) {
        return;
      }

      const editingUser = onlineUsers.find(u => u.id === data.userId);
      if (editingUser) {
        addNotification({
          type: 'saved',
          message: `${editingUser.name} guardó cambios en un asset`,
          userId: data.userId,
          userName: editingUser.name,
        });
      }
    };

    const handleEvidenceUploaded = (data: { userId: string; evidenceId: string; operationId: string }) => {
      if (data.userId === user?.id) {
        return;
      }

      const editingUser = onlineUsers.find(u => u.id === data.userId);
      if (editingUser) {
        addNotification({
          type: 'evidence',
          message: `${editingUser.name} subió nueva evidencia`,
          userId: data.userId,
          userName: editingUser.name,
        });
      }
    };

    const handleEvaluationUpdated = (data: { userId: string; assetId: string; objective: string }) => {
      if (data.userId === user?.id) {
        return;
      }

      const editingUser = onlineUsers.find(u => u.id === data.userId);
      if (editingUser) {
        addNotification({
          type: 'saved',
          message: `${editingUser.name} actualizó evaluación DNSH`,
          userId: data.userId,
          userName: editingUser.name,
        });
      }
    };

    socket.on('asset:updated', handleAssetUpdated);
    socket.on('evidence:uploaded', handleEvidenceUploaded);
    socket.on('evaluation:updated', handleEvaluationUpdated);

    return () => {
      socket.off('asset:updated', handleAssetUpdated);
      socket.off('evidence:uploaded', handleEvidenceUploaded);
      socket.off('evaluation:updated', handleEvaluationUpdated);
    };
  }, [user?.id, onlineUsers]);

  const addNotification = (data: Omit<Notification, 'id' | 'timestamp'>) => {
    const notification: Notification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'editing':
        return <Edit size={16} />;
      case 'saved':
        return <CheckCircle size={16} />;
      case 'evidence':
        return <FileText size={16} />;
      case 'comment':
        return <Users size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'editing':
        return theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700';
      case 'saved':
        return theme === 'dark' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700';
      case 'evidence':
        return theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return theme === 'dark' ? 'bg-gray-500/10 border-gray-500/30 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start space-x-3 p-3 rounded-lg border shadow-lg min-w-[300px] max-w-[400px] ${getNotificationColor(notification.type)} transition-all animate-in slide-in-from-right`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium font-mono">{String(notification.message || '')}</p>
            <p className="text-xs opacity-75 mt-0.5">
              {notification.timestamp instanceof Date 
                ? notification.timestamp.toLocaleTimeString()
                : new Date(notification.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
