/**
 * Online Users Context
 * Manages real-time online users presence using Socket.IO
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { socketService } from '../src/services/socketService';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  currentOperationId?: string;
  currentAssetId?: string;
  lastSeen: Date;
}

interface OnlineUsersContextType {
  onlineUsers: OnlineUser[];
  onlineCount: number;
  usersInOperation: (operationId: string) => OnlineUser[];
  usersInAsset: (assetId: string) => OnlineUser[];
}

const OnlineUsersContext = createContext<OnlineUsersContextType | undefined>(undefined);

export const useOnlineUsers = () => {
  const context = useContext(OnlineUsersContext);
  if (!context) {
    throw new Error('useOnlineUsers must be used within OnlineUsersProvider');
  }
  return context;
};

export const OnlineUsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user || !socketService.isConnected()) {
      return;
    }

    // Listen for user presence updates
    const handleUserOnline = async (data: { userId: string }) => {
      // Skip if it's the current user
      if (data.userId === user?.id) {
        return;
      }

      // Fetch user details from API if available
      try {
        const USE_API = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_API_URL;
        if (USE_API) {
          const { apiClient } = await import('../src/services/api');
          try {
            const response = await apiClient.getUser(data.userId);
            const userData = response.user;
            const onlineUser: OnlineUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              avatarUrl: userData.avatarUrl,
              role: userData.role,
              lastSeen: new Date()
            };
            setOnlineUsers(prev => {
              const existing = prev.find(u => u.id === onlineUser.id);
              if (existing) {
                return prev.map(u => u.id === onlineUser.id ? { ...onlineUser, lastSeen: new Date() } : u);
              }
              return [...prev, onlineUser];
            });
            return;
          } catch (err) {
            logger.warn('Could not fetch user details:', err);
          }
        }
      } catch (err) {
        logger.warn('Error fetching user details:', err);
      }
      
      // Fallback: Use basic user info
      const onlineUser: OnlineUser = {
        id: data.userId,
        name: `User ${data.userId.slice(0, 8)}`,
        email: '',
        role: 'Analyst',
        lastSeen: new Date()
      };
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.id === onlineUser.id);
        if (existing) {
          return prev.map(u => u.id === onlineUser.id ? { ...onlineUser, lastSeen: new Date() } : u);
        }
        return [...prev, onlineUser];
      });
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
    };

    const handleUserUpdate = (data: { user: Partial<OnlineUser> & { id: string } }) => {
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.id === data.user.id);
        if (existing) {
          return prev.map(u => u.id === data.user.id ? { ...existing, ...data.user, lastSeen: new Date() } : u);
        }
        return prev;
      });
    };

    // Set up socket listeners
    const socket = (socketService as any).socket;
    if (socket) {
      socket.on('user:online', handleUserOnline);
      socket.on('user:offline', handleUserOffline);
      socket.on('user:update', handleUserUpdate);
      socket.on('users:list', async (data: { users: Array<{ id: string; currentOperationId?: string; currentAssetId?: string; lastSeen: Date }> }) => {
        // Filter out current user
        const otherUsers = data.users.filter(u => u.id !== user?.id);
        
        // Fetch full user details for each online user
        const USE_API = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_API_URL;
        const usersWithDetails: OnlineUser[] = [];
        
        for (const userData of otherUsers) {
          try {
            if (USE_API) {
              const { apiClient } = await import('../src/services/api');
              try {
                const response = await apiClient.getUser(userData.id);
                const userInfo = response.user;
                usersWithDetails.push({
                  id: userInfo.id,
                  name: userInfo.name,
                  email: userInfo.email,
                  avatarUrl: userInfo.avatarUrl,
                  role: userInfo.role,
                  currentOperationId: userData.currentOperationId,
                  currentAssetId: userData.currentAssetId,
                  lastSeen: new Date(userData.lastSeen)
                });
                continue;
              } catch (err) {
                // Fallback
              }
            }
            
            // Fallback
            usersWithDetails.push({
              id: userData.id,
              name: `User ${userData.id.slice(0, 8)}`,
              email: '',
              role: 'Analyst',
              currentOperationId: userData.currentOperationId,
              currentAssetId: userData.currentAssetId,
              lastSeen: new Date(userData.lastSeen)
            });
          } catch (err) {
            // Skip this user
          }
        }
        
        setOnlineUsers(usersWithDetails);
      });

      // Request current online users list
      socket.emit('users:get-list');
    }

    // Clean up on unmount
    return () => {
      if (socket) {
        socket.off('user:online', handleUserOnline);
        socket.off('user:offline', handleUserOffline);
        socket.off('user:update', handleUserUpdate);
        socket.off('users:list');
      }
    };
  }, [user]);

  // Remove users that haven't been seen in 30 seconds (they're probably offline)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setOnlineUsers(prev => 
        prev.filter(u => {
          const timeSinceLastSeen = now.getTime() - u.lastSeen.getTime();
          return timeSinceLastSeen < 30000; // 30 seconds
        })
      );
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const usersInOperation = (operationId: string): OnlineUser[] => {
    return onlineUsers.filter(u => u.currentOperationId === operationId);
  };

  const usersInAsset = (assetId: string): OnlineUser[] => {
    return onlineUsers.filter(u => u.currentAssetId === assetId);
  };

  return (
    <OnlineUsersContext.Provider
      value={{
        onlineUsers,
        onlineCount: onlineUsers.length,
        usersInOperation,
        usersInAsset,
      }}
    >
      {children}
    </OnlineUsersContext.Provider>
  );
};
