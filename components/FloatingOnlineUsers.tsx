/**
 * Floating Online Users Indicator
 * Fixed position in top-right corner, always visible
 * NFQ Foundry style with overlapping avatar "balls"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, ChevronDown, ChevronUp, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineUsers, OnlineUser } from '../context/OnlineUsersContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../src/services/socketService';

interface FloatingOnlineUsersProps {
  operationId?: string;
  assetId?: string;
}

export const FloatingOnlineUsers: React.FC<FloatingOnlineUsersProps> = ({
  operationId,
  assetId,
}) => {
  const { onlineUsers, usersInOperation, usersInAsset } = useOnlineUsers();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check socket connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(socketService.isConnected());
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReconnect = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      await socketService.reconnect(token);
      setIsConnected(socketService.isConnected());
    }
  }, []);

  // Filter users based on context (excluding current user) - only real users from socket/API
  let relevantUsers = onlineUsers.filter(u => u.id !== user?.id);
  if (assetId) {
    relevantUsers = usersInAsset(String(assetId)).filter(u => u.id !== user?.id);
  } else if (operationId) {
    relevantUsers = usersInOperation(String(operationId)).filter(u => u.id !== user?.id);
  }

  // Solo mostrar usuarios reales conectados (sin datos demo)
  const displayUsers = relevantUsers;

  const maxVisible = 4;
  const visibleUsers = displayUsers.slice(0, maxVisible);
  const remainingCount = Math.max(0, displayUsers.length - maxVisible);

  const getInitials = (name: string | undefined): string => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(n => n && n[0] ? n[0] : '')
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const getAvatarColor = (userId: string): string => {
    const colors = [
      'bg-gradient-to-br from-orange-400 to-yellow-500',
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
      'bg-gradient-to-br from-amber-400 to-orange-500',
      'bg-gradient-to-br from-cyan-400 to-blue-500',
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const themeClasses = {
    bg: {
      primary: theme === 'dark' ? 'bg-black' : 'bg-white',
      secondary: theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-50',
      hover: theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-100',
      card: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white',
      floating: theme === 'dark' ? 'bg-[#0a0a0a]/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md',
    },
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600',
      tertiary: theme === 'dark' ? 'text-[#666666]' : 'text-gray-500',
    },
    border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200',
  };

  const overlapOffset = 10; // pixels
  const avatarSize = 36; // pixels - slightly larger for better visibility

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div className="relative">
        {/* Main Floating Button - Always Visible */}
        <div
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl border-2 ${themeClasses.border} ${themeClasses.bg.floating} ${themeClasses.bg.hover} cursor-pointer transition-all group shadow-xl hover:shadow-2xl hover:scale-105`}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Connection Status - More prominent */}
          <div className="flex-shrink-0 relative">
            {isConnected ? (
              <>
                <Wifi size={16} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-emerald-600'} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </>
            ) : (
              <WifiOff size={16} className={theme === 'dark' ? 'text-[#666666]' : 'text-gray-400'} />
            )}
          </div>

          {/* Overlapping Avatar Balls - Always show */}
          <div className="flex items-center -space-x-2">
            {displayUsers.length > 0 ? (
              <>
                {visibleUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="relative flex-shrink-0"
                    style={{
                      zIndex: visibleUsers.length - index,
                      marginLeft: index > 0 ? `-${overlapOffset}px` : '0',
                    }}
                  >
                    <div
                      className={`w-9 h-9 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center text-white text-xs font-bold border-2 ${
                        theme === 'dark' ? 'border-black' : 'border-white'
                      } shadow-md transition-transform group-hover:scale-110`}
                      title={user.name || 'Usuario'}
                    >
                      {user.avatarUrl ? (
                        <img
                          src={String(user.avatarUrl)}
                          alt={String(user.name || 'User')}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] font-bold">{getInitials(user.name)}</span>
                      )}
                    </div>
                    {/* Online Status Dot - Bottom right, larger */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-black shadow-md animate-pulse"></div>
                  </div>
                ))}
                
                {/* Remaining Count Badge */}
                {remainingCount > 0 && (
                  <div
                    className={`w-9 h-9 rounded-full ${themeClasses.bg.secondary} border-2 ${
                      theme === 'dark' ? 'border-black' : 'border-white'
                    } flex items-center justify-center text-xs font-bold ${themeClasses.text.secondary} shadow-md`}
                    style={{ marginLeft: `-${overlapOffset}px` }}
                  >
                    +{remainingCount}
                  </div>
                )}
              </>
            ) : (
              <div className={`w-9 h-9 rounded-full ${themeClasses.bg.secondary} border-2 ${themeClasses.border} flex items-center justify-center`}>
                <Users size={18} className={themeClasses.text.tertiary} />
              </div>
            )}
          </div>

          {/* Count Text - Solo usuarios reales conectados */}
          <span className={`text-sm font-bold ${displayUsers.length > 0 ? themeClasses.text.primary : themeClasses.text.tertiary} whitespace-nowrap`}>
            {displayUsers.length} {displayUsers.length === 1 ? 'online' : 'online'}
          </span>

          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp size={16} className={themeClasses.text.secondary} />
          ) : (
            <ChevronDown size={16} className={themeClasses.text.secondary} />
          )}
        </div>

        {/* Expanded View - Dropdown */}
        {isExpanded && (
          <div
            className={`absolute top-full right-0 mt-2 w-80 rounded-xl border-2 ${themeClasses.border} ${themeClasses.bg.floating} shadow-2xl z-50 animate-in fade-in slide-in-from-top-2`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b-2 ${themeClasses.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users size={16} className={theme === 'dark' ? 'text-[#00ff88]' : 'text-emerald-600'} />
                  <h3 className={`text-sm font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                    USUARIOS ONLINE
                  </h3>
                </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${theme === 'dark' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-emerald-100 text-emerald-700'}`}>
                {displayUsers.length}
              </span>
              </div>
              {(operationId || assetId) && (
                <p className={`text-xs mt-2 ${themeClasses.text.tertiary}`}>
                  {assetId ? '📍 En este asset' : operationId ? '📍 En esta operación' : '🌐 En la plataforma'}
                </p>
              )}
              {!isConnected && (
                <div className="mt-2 flex items-center gap-2">
                  <p className={`text-xs ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    ⚠️ Sin conexión en tiempo real
                  </p>
                  <button
                    onClick={handleReconnect}
                    className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    title="Reintentar conexión"
                  >
                    <RefreshCw size={12} className="inline" /> Reconectar
                  </button>
                </div>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto p-3">
              {displayUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className={`mx-auto mb-2 ${themeClasses.text.tertiary}`} />
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    No hay otros usuarios online
                  </p>
                  {!isConnected && (
                    <div className="mt-2 space-y-2">
                      <p className={`text-xs ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                        Conecta Socket.IO para ver usuarios en tiempo real
                      </p>
                      <button
                        onClick={handleReconnect}
                        className={`text-xs px-3 py-1.5 rounded font-medium ${theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                      >
                        <RefreshCw size={12} className="inline mr-1" /> Reconectar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg ${themeClasses.bg.hover} transition-colors`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center text-white text-sm font-bold border-2 ${
                            theme === 'dark' ? 'border-[#1a1a1a]' : 'border-white'
                          } shadow-md`}
                        >
                          {user.avatarUrl ? (
                            <img
                              src={String(user.avatarUrl)}
                              alt={String(user.name || 'User')}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(user.name)}</span>
                          )}
                        </div>
                        {/* Online Status Dot */}
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-black shadow-md animate-pulse"></div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${themeClasses.text.primary}`}>
                          {String(user.name || 'Usuario')}
                        </p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <p className={`text-xs truncate ${themeClasses.text.secondary}`}>
                            {String(user.role || 'Analyst')}
                          </p>
                          {user.currentOperationId && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-[#1a1a1a] text-[#00ff88]' : 'bg-gray-100 text-emerald-600'}`}>
                              OP
                            </span>
                          )}
                          {user.currentAssetId && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-[#1a1a1a] text-blue-400' : 'bg-gray-100 text-blue-600'}`}>
                              ASSET
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
