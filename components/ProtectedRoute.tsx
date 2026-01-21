
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPermissions } from '../types';
import { hasPermission } from '../services/auth';
import { AlertCircle, Shield } from 'lucide-react';

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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return fallback || (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm border border-slate-200">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">
            You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">
              <span className="font-semibold">Your role:</span> {user.role}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-semibold">Required permission:</span> {requiredPermission}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
