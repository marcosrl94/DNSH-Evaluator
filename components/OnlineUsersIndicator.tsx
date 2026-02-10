/**
 * Online Users Indicator Component
 * Shows online users with overlapping avatar "balls" (NFQ Foundry style)
 */

import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import { useTheme } from '../context/ThemeContext';

interface OnlineUsersIndicatorProps {
  operationId?: string;
  assetId?: string;
  maxVisible?: number;
  position?: 'header' | 'sidebar' | 'inline';
}

export const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({
  operationId,
  assetId,
  maxVisible = 5,
  position = 'header',
}) => {
  const { onlineUsers, usersInOperation, usersInAsset } = useOnlineUsers();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter users based on context
  let relevantUsers = onlineUsers;
  if (assetId) {
    relevantUsers = usersInAsset(String(assetId));
  } else if (operationId) {
    relevantUsers = usersInOperation(String(operationId));
  }

  const visibleUsers = relevantUsers.slice(0, maxVisible);
  const remainingCount = Math.max(0, relevantUsers.length - maxVisible);

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
    // Generate consistent color based on user ID
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
    },
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-[#a0a0a0]' : 'text-gray-600',
      tertiary: theme === 'dark' ? 'text-[#666666]' : 'text-gray-500',
    },
    border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200',
  };

  // Always show indicator, even if no users (shows connection status)

  // Calculate overlap offset for overlapping avatars
  const overlapOffset = 10; // pixels
  const avatarSize = 36; // pixels - slightly larger

  return (
    <div className="relative">
      {/* Compact View - Overlapping Avatar Balls */}
      <div
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${themeClasses.border} ${themeClasses.bg.secondary} ${themeClasses.bg.hover} cursor-pointer transition-all group shadow-md hover:shadow-lg`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Overlapping Avatar Balls */}
        {relevantUsers.length > 0 ? (
          <div className="flex items-center -space-x-2">
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
              {/* Online Status Dot - Bottom right, larger with pulse */}
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
        </div>
        ) : (
          <div className={`w-9 h-9 rounded-full ${themeClasses.bg.secondary} border-2 ${themeClasses.border} flex items-center justify-center`}>
            <Users size={18} className={themeClasses.text.tertiary} />
          </div>
        )}

        {/* Count Text */}
        <span className={`text-xs font-bold ${themeClasses.text.primary} whitespace-nowrap`}>
          {relevantUsers.length} {relevantUsers.length === 1 ? 'online' : 'online'}
        </span>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp size={14} className={themeClasses.text.tertiary} />
        ) : (
          <ChevronDown size={14} className={themeClasses.text.tertiary} />
        )}
      </div>

      {/* Expanded View - Dropdown */}
      {isExpanded && (
        <div
          className={`absolute top-full right-0 mt-2 w-80 rounded-lg border ${themeClasses.border} ${themeClasses.bg.card} shadow-xl z-50 animate-in fade-in slide-in-from-top-2`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-4 border-b ${themeClasses.border}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
                USUARIOS ONLINE
              </h3>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${theme === 'dark' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-emerald-100 text-emerald-700'}`}>
                {relevantUsers.length}
              </span>
            </div>
            {(operationId || assetId) && (
              <p className={`text-xs mt-1 ${themeClasses.text.tertiary}`}>
                {assetId ? 'En este asset' : operationId ? 'En esta operación' : 'En la plataforma'}
              </p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto p-3">
            <div className="space-y-2">
              {relevantUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center space-x-3 p-2.5 rounded-lg ${themeClasses.bg.hover} transition-colors`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center text-white text-sm font-semibold border-2 ${
                        theme === 'dark' ? 'border-[#1a1a1a]' : 'border-white'
                      } shadow-sm`}
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
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-black shadow-sm"></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${themeClasses.text.primary}`}>
                      {String(user.name || 'Usuario')}
                    </p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p className={`text-xs truncate ${themeClasses.text.secondary}`}>
                        {String(user.role || 'Analyst')}
                      </p>
                      {user.currentOperationId && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-[#1a1a1a] text-[#00ff88]' : 'bg-gray-100 text-emerald-600'}`}>
                          OP
                        </span>
                      )}
                      {user.currentAssetId && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-[#1a1a1a] text-blue-400' : 'bg-gray-100 text-blue-600'}`}>
                          ASSET
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
