
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPermissions } from '../types';
import { hasPermission } from '../services/auth';
import { AlertCircle, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof UserPermissions;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  fallback 
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  if (!user) {
    return (
      <div className={`flex items-center justify-center h-screen ${themeClasses.bg.primary}`}>
        <div className="text-center">
          <Shield className={`w-16 h-16 ${themeClasses.text.tertiary} mx-auto mb-4`} />
          <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>Authentication Required</h2>
          <p className={themeClasses.text.secondary}>Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return fallback || (
      <div className={`flex items-center justify-center h-screen ${themeClasses.bg.primary}`}>
        <div className={`text-center max-w-md p-8 ${themeClasses.card.bg} rounded-xl shadow-sm border ${themeClasses.card.border}`}>
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>Access Denied</h2>
          <p className={`${themeClasses.text.secondary} mb-4`}>
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>
          <div className={`mt-4 p-3 ${themeClasses.bg.tertiary} rounded-lg`}>
            <p className={`text-sm ${themeClasses.text.tertiary}`}>
              <span className="font-semibold">Your role:</span> {user.role}
            </p>
            <p className={`text-sm ${themeClasses.text.tertiary} mt-1`}>
              <span className="font-semibold">Required permission:</span> {requiredPermission}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
