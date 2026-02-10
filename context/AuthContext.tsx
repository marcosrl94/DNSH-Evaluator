/**
 * Authentication Context
 * Now uses Backend API with fallback to local auth
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, RegisterData } from '../types';
import { apiClient } from '../src/services/api';
import { socketService } from '../src/services/socketService';
import * as localAuthService from '../services/auth';
import { getPermissionsForRole, initGoogleAuth } from '../services/auth';
import { logger } from '../utils/logger';
import {
  storeSession,
  storeRefreshToken,
  clearSession,
  isSessionValid,
  getStoredUser,
  getStoredToken,
  getStoredRefreshToken,
  getAuthProvider,
  SessionConfig,
} from '../utils/sessionManager';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean, keepSignedIn?: boolean) => Promise<void>;
  loginWithGoogle: (rememberMe?: boolean, keepSignedIn?: boolean, credential?: string) => Promise<void>;
  register: (data: RegisterData, rememberMe?: boolean, keepSignedIn?: boolean) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Feature flag: Use API or local auth
const USE_API_ENV = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_API_URL;

// Helper function to check if we should use API (with fallback to local)
const shouldUseAPI = () => {
  return USE_API_ENV; // Will fallback to local auth if API calls fail
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update isLoading when user changes
  useEffect(() => {
    if (user !== null) {
      setIsLoading(false);
    }
  }, [user]);

  // Load user from localStorage on mount
  // PRIORIDAD: Si hay credential de Google en la URL (redirect), procesarla ANTES de cargar storage
  useEffect(() => {
    const getCredentialFromUrl = (): string | null => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      let c = params.get('credential') || params.get('id_token');
      if (c) return c;
      if (window.location.hash) {
        try {
          const hash = new URLSearchParams(window.location.hash.substring(1));
          c = hash.get('id_token') || hash.get('credential');
        } catch {
          const h = window.location.hash.substring(1);
          if (h.startsWith('id_token=')) c = h.split('&')[0].slice(9);
          else if (h.startsWith('credential=')) c = h.split('&')[0].slice(11);
        }
      }
      return c || null;
    };

    const loadStoredUser = async () => {
      try {
        // Google OAuth redirect: procesar credential antes que nada
        const credential = getCredentialFromUrl();
        if (credential) {
          try {
            await loginWithGoogle(false, true, credential);
            window.history.replaceState({}, document.title, window.location.pathname || '/');
            return;
          } catch (e) {
            logger.error('Google OAuth callback failed:', e);
            setError((e as Error)?.message || 'Error al procesar login de Google');
            setIsLoading(false);
          }
        }

        if (!isSessionValid()) {
          setIsLoading(false);
          return;
        }

        const storedUser = getStoredUser();
        const storedToken = getStoredToken();
        
        if (!storedUser || !storedToken) {
          setIsLoading(false);
          return;
        }

        // Validate token with API if using API
        if (shouldUseAPI() && storedToken) {
          try {
            const currentUser = await apiClient.getCurrentUser();
            
            // Merge API user data with stored data
            const mergedUser: User = {
              ...storedUser,
              ...currentUser.user,
              permissions: storedUser.permissions || getPermissionsForRole(currentUser.user.role)
            };
            
            setUser(mergedUser);
            apiClient.setToken(storedToken);
            // Connect Socket.IO in background, don't wait
            socketService.connect(storedToken).catch((err) => {
              logger.warn('Socket.IO connection failed (non-critical):', err);
            });
          } catch (error) {
            // Token invalid, clear storage
            logger.error('Token validation failed:', error);
            clearSession();
            setIsLoading(false);
            return;
          }
        } else {
          // Local auth - load from storage
          if (storedUser && !storedUser.permissions) {
            const role = storedUser.role;
            if (role) {
              storedUser.permissions = getPermissionsForRole(role);
            }
          }
          
          // If user is logged in with Google but doesn't have avatarUrl, try to get it from token
          const authProvider = getAuthProvider();
          if (storedUser && !storedUser.avatarUrl && authProvider === 'google') {
            const googleToken = localStorage.getItem('ecoinvest_google_token');
            if (googleToken) {
              try {
                const payload = JSON.parse(atob(googleToken.split('.')[1]));
                if (payload.picture) {
                  storedUser.avatarUrl = payload.picture;
                  // Update stored user
                  localStorage.setItem('ecoinvest_user', JSON.stringify(storedUser));
                }
              } catch (e) {
                // Ignore errors - token might be invalid
              }
            }
          }
          
          setUser(storedUser);
        }
      } catch (error) {
        logger.error('Error loading stored user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false,
    keepSignedIn: boolean = false
  ): Promise<void> => {
    setError(null);
    try {
      if (shouldUseAPI()) {
        try {
          // Use API authentication
          const response = await apiClient.login(email, password);
        
        // Ensure token is stored (apiClient already does this, but double-check)
        if (response.token) {
          apiClient.setToken(response.token);
        }
        
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role as any,
          permissions: getPermissionsForRole(response.user.role as any)
        };

        // Store session
        storeSession(userData, response.token, { rememberMe, keepSignedIn, authProvider: 'local' });
        if (response.refreshToken) {
          storeRefreshToken(response.refreshToken);
        }

        // Connect Socket.IO (don't wait, let it connect in background)
        socketService.connect(response.token).catch((err) => {
          logger.warn('Socket.IO connection failed (non-critical):', err);
        });

        setUser(userData);
        setIsLoading(false);
        } catch (apiError: any) {
          // If API fails, fallback to local auth
          logger.warn('API login failed, using local auth:', apiError.message);
          try {
            const localUser = await localAuthService.login(email, password);
            
            // Store session for local auth
            storeSession(localUser, '', { rememberMe, keepSignedIn, authProvider: 'local' });
            
            setUser(localUser);
            setIsLoading(false);
          } catch (localError: any) {
            setIsLoading(false);
            throw localError;
          }
        }
      } else {
        // Fallback to local auth
        const localUser = await localAuthService.login(email, password);
        
        // Store session for local auth
        storeSession(localUser, '', { rememberMe, keepSignedIn, authProvider: 'local' });
        
        setUser(localUser);
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || 'Login failed');
      throw error;
    }
  };

  const loginWithGoogle = async (
    rememberMe: boolean = false,
    keepSignedIn: boolean = false,
    credential?: string
  ): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      if (shouldUseAPI() && credential) {
        // Use backend API with provided credential
        try {
          // Send credential to backend
          const result = await apiClient.loginWithGoogle(credential);
          
          // Ensure token is stored
          if (result.token) {
            apiClient.setToken(result.token);
          }
          
          const userData: User = {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role as any,
            permissions: getPermissionsForRole(result.user.role as any),
            avatarUrl: result.user.avatarUrl
          };

          // Store session - Google users default to keep signed in
          storeSession(userData, result.token, { 
            rememberMe, 
            keepSignedIn: keepSignedIn || true, 
            authProvider: 'google' 
          });
          if (result.refreshToken) {
            storeRefreshToken(result.refreshToken);
          }

          // Connect Socket.IO (don't wait, let it connect in background)
          socketService.connect(result.token).catch((err) => {
            logger.warn('Socket.IO connection failed (non-critical):', err);
          });

          setUser(userData);
          setIsLoading(false);
        } catch (apiError: any) {
          // If API fails, fallback to local auth
          logger.warn('API login failed, using local auth:', apiError.message);
          try {
            // Decode credential and create user locally
            const payload = JSON.parse(atob(credential.split('.')[1]));
            const localUser: User = {
              id: `google-${payload.sub}`,
              email: payload.email,
              name: payload.name,
              role: 'Analyst',
              avatarUrl: payload.picture,
              createdAt: new Date().toISOString(),
              isActive: true,
              permissions: getPermissionsForRole('Analyst'),
              lastLogin: new Date().toISOString(),
            };

            // Store session
            storeSession(localUser, credential, { 
              rememberMe, 
              keepSignedIn: keepSignedIn || true, 
              authProvider: 'google' 
            });

            setUser(localUser);
            setIsLoading(false);
          } catch (localError: any) {
            setIsLoading(false);
            setError(localError.message || 'Google authentication failed');
            throw localError;
          }
        }
        } else {
          // Auth local: usar credential si viene del botón de Google sin Client ID
          if (credential) {
            // Decode credential and create user locally
            try {
              const payload = JSON.parse(atob(credential.split('.')[1]));
              
              const localUser: User = {
                id: `google-${payload.sub}`,
                email: payload.email,
                name: payload.name,
                role: 'Analyst',
                avatarUrl: payload.picture,
                createdAt: new Date().toISOString(),
                isActive: true,
                permissions: getPermissionsForRole('Analyst'),
                lastLogin: new Date().toISOString(),
              };

              // Store session - Google users default to keep signed in
              storeSession(localUser, credential, { 
                rememberMe, 
                keepSignedIn: keepSignedIn || true, 
                authProvider: 'google' 
              });

              setUser(localUser);
              setIsLoading(false);
            } catch (localError: any) {
              setIsLoading(false);
              setError(localError.message || 'Error al procesar la autenticación de Google');
              throw localError;
            }
          } else {
            // Sin credential: flujo local (botón "Continuar con Google" sin Client ID)
            const googleUser = await localAuthService.loginWithGoogle(rememberMe, keepSignedIn);
            const storedUser = localStorage.getItem('ecoinvest_user');
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } else {
              setUser(googleUser);
            }
            setIsLoading(false);
          }
        }
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || 'Google login failed');
      throw error;
    }
  };

  const register = async (
    data: RegisterData,
    rememberMe: boolean = false,
    keepSignedIn: boolean = false
  ): Promise<void> => {
    setError(null);
    try {
      if (shouldUseAPI()) {
        try {
          const response = await apiClient.register({
            email: data.email,
            password: data.password,
            name: data.name
          });

        // Ensure token is stored
        if (response.token) {
          apiClient.setToken(response.token);
        }

        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role as any,
          permissions: getPermissionsForRole(response.user.role as any)
        };

        // Store session
        storeSession(userData, response.token, { rememberMe, keepSignedIn, authProvider: 'local' });
        if (response.refreshToken) {
          storeRefreshToken(response.refreshToken);
        }

        // Connect Socket.IO (don't wait, let it connect in background)
        socketService.connect(response.token).catch((err) => {
          logger.warn('Socket.IO connection failed (non-critical):', err);
        });

        setUser(userData);
        setIsLoading(false);
        } catch (apiError: any) {
          // If API fails, fallback to local auth
          logger.warn('API registration failed, using local auth:', apiError.message);
          try {
            const localUser = await localAuthService.register(data);
            
            // Store session for local auth
            storeSession(localUser, '', { rememberMe, keepSignedIn, authProvider: 'local' });
            
            setUser(localUser);
            setIsLoading(false);
          } catch (localError: any) {
            setIsLoading(false);
            throw localError;
          }
        }
      } else {
        const localUser = await localAuthService.register(data);
        
        // Store session for local auth
        storeSession(localUser, '', { rememberMe, keepSignedIn, authProvider: 'local' });
        
        setUser(localUser);
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (shouldUseAPI()) {
        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          try {
            await apiClient.logout(refreshToken);
          } catch (error) {
            // Continue with logout even if API call fails
            logger.warn('Logout API call failed:', error);
          }
        }
        
        // Disconnect Socket.IO
        socketService.disconnect();
      }

      // Clear all storage
      clearSession();

      setUser(null);
    } catch (error: any) {
      logger.error('Logout error:', error);
      // Still clear user even if logout fails
      setUser(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        error,
        clearError
      }}
    >
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
