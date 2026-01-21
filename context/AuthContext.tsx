
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, RegisterData, UserRole } from '../types';
import * as authService from '../services/auth';
import { getPermissionsForRole } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount (session persistence)
  useEffect(() => {
    const storedUser = localStorage.getItem('ecoinvest_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure user has permissions (for backward compatibility)
        if (parsedUser && !parsedUser.permissions) {
          // If user doesn't have permissions, try to get them from role
          const role = parsedUser.role;
          if (role) {
            // Import getPermissionsForRole - we'll need to export it or recreate it
            const permissions = getPermissionsForRole(role);
            parsedUser.permissions = permissions;
          }
        }
        setUser(parsedUser);
      } catch (err) {
        localStorage.removeItem('ecoinvest_user');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      // Store in localStorage for session persistence
      localStorage.setItem('ecoinvest_user', JSON.stringify(loggedUser));
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid email or password';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await authService.register(data);
      setUser(newUser);
      // Store in localStorage
      localStorage.setItem('ecoinvest_user', JSON.stringify(newUser));
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ecoinvest_user');
    authService.logout();
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
