/**
 * Online Users Indicator Component
 * Shows online users with avatars and status dots
 */

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import { useTheme } from '../context/ThemeContext';

interface OnlineUsersIndicatorProps {
  operationId?: string;
  assetId?: string;
  maxVisible?: number;
}

export const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({
  operationId,
  assetId,
  maxVisible = 5,
}) => {
  const { onlineUsers, usersInOperation, usersInAsset } = useOnlineUsers();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter users based on context
  // #region agent log
  try {
    fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersIndicator.tsx:27',message:'Filtering users',data:{onlineUsersCount:onlineUsers.length,onlineUsersType:typeof onlineUsers,assetId:assetId ? String(assetId) : undefined,operationId:operationId ? String(operationId) : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  } catch (e) {}
  // #endregion
  
  let relevantUsers = onlineUsers;
  if (assetId) {
    relevantUsers = usersInAsset(String(assetId));
  } else if (operationId) {
    relevantUsers = usersInOperation(String(operationId));
  }

  const visibleUsers = relevantUsers.slice(0, maxVisible);
  const remainingCount = relevantUsers.length - maxVisible;

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
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const themeClasses = {
    bg: {
      primary: theme === 'dark' ? 'bg-black' : 'bg-white',
      secondary: theme === 'dark' ? 'bg-[#111111]' : 'bg-gray-50',
      hover: theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-100',
    },
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: theme === 'dark' ? 'text-[#666666]' : 'text-gray-600',
    },
    border: theme === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-200',
  };

  if (relevantUsers.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Compact View - Matching the provided design */}
      <div
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg border ${themeClasses.border} ${themeClasses.bg.secondary} ${themeClasses.bg.hover} cursor-pointer transition-all`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Single Avatar with Online Dot */}
        {visibleUsers.length > 0 && (
          <div className="relative flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full ${getAvatarColor(visibleUsers[0].id)} flex items-center justify-center text-white text-sm font-semibold`}
              title={visibleUsers[0].name}
            >
              {visibleUsers[0].avatarUrl ? (
                <img
                  src={String(visibleUsers[0].avatarUrl)}
                  alt={String(visibleUsers[0].name || 'User')}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{getInitials(visibleUsers[0].name)}</span>
              )}
            </div>
            {/* Online Status Dot - Bottom left as in the image */}
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-black"></div>
          </div>
        )}

        {/* Count Text - Matching the design */}
        <span className={`text-xs font-mono uppercase tracking-wider font-semibold ${themeClasses.text.primary}`}>
          {(() => {
            // #region agent log
            try {
              const count = relevantUsers.length;
              fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersIndicator.tsx:110',message:'Rendering user count',data:{countType:typeof count,countValue:count,relevantUsersType:typeof relevantUsers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              return `${Number(count)} ONLINE`;
            } catch (e) {
              fetch('http://127.0.0.1:7243/ingest/0de341da-91a4-415d-a166-bfc14a416ff3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OnlineUsersIndicator.tsx:110',message:'Error rendering count',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              return '0 ONLINE';
            }
            // #endregion
          })()}
        </span>

        {/* Expand Icon */}
        <Users
          size={14}
          className={`transition-transform ${themeClasses.text.secondary} ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div
          className={`absolute top-full right-0 mt-2 w-72 rounded-lg border ${themeClasses.border} ${themeClasses.bg.primary} shadow-xl z-50`}
        >
          <div className={`p-3 border-b ${themeClasses.border}`}>
            <h3 className={`text-sm font-bold font-mono uppercase tracking-wider ${themeClasses.text.primary}`}>
              USUARIOS ONLINE ({Number(relevantUsers.length)})
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {relevantUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center space-x-3 p-2.5 rounded-lg ${themeClasses.bg.hover} transition-colors`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center text-white text-sm font-semibold`}
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
                  {/* Online Status Dot - Bottom left */}
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-black"></div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${themeClasses.text.primary}`}>
                    {String(user.name || 'User')}
                  </p>
                  <p className={`text-xs truncate ${themeClasses.text.secondary}`}>
                    {String(user.role || 'Analyst')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
