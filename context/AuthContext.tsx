
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, RegisterData, UserRole } from '../types';
import * as authService from '../services/auth';
import { getPermissionsForRole, loginWithGoogle } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean, keepSignedIn?: boolean) => Promise<void>;
  loginWithGoogle: (rememberMe?: boolean, keepSignedIn?: boolean) => Promise<void>;
  register: (data: RegisterData, rememberMe?: boolean, keepSignedIn?: boolean) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading to check localStorage
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount (session persistence)
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem('ecoinvest_user');
        if (!storedUser) {
          setIsLoading(false);
          return;
        }

        // Check if "Keep me signed in" is enabled
        const keepSignedIn = localStorage.getItem('ecoinvest_keep_signed_in') === 'true';
        const sessionExpiry = localStorage.getItem('ecoinvest_session_expiry');
        const authProvider = localStorage.getItem('ecoinvest_auth_provider');
        
        // For Google users, default to keeping signed in (unless explicitly disabled)
        const isGoogleUser = authProvider === 'google' || authProvider === 'google-demo';
        
        if (keepSignedIn && sessionExpiry) {
          // Check if session has expired (30 days default)
          const expiryDate = new Date(sessionExpiry);
          if (new Date() > expiryDate) {
            // Session expired, clear it
            localStorage.removeItem('ecoinvest_user');
            localStorage.removeItem('ecoinvest_keep_signed_in');
            localStorage.removeItem('ecoinvest_session_expiry');
            localStorage.removeItem('ecoinvest_auth_provider');
            sessionStorage.removeItem('ecoinvest_temp_session');
            setIsLoading(false);
            return;
          }
          // Session is valid, load user
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && !parsedUser.permissions) {
            const role = parsedUser.role;
            if (role) {
              const permissions = getPermissionsForRole(role);
              parsedUser.permissions = permissions;
            }
          }
          setUser(parsedUser);
        } else if (isGoogleUser) {
          // Google users: auto-enable keep signed in for convenience
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && !parsedUser.permissions) {
            const role = parsedUser.role;
            if (role) {
              const permissions = getPermissionsForRole(role);
              parsedUser.permissions = permissions;
            }
          }
          // Set keep signed in for Google users
          localStorage.setItem('ecoinvest_keep_signed_in', 'true');
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          localStorage.setItem('ecoinvest_session_expiry', expiryDate.toISOString());
          setUser(parsedUser);
        } else {
          // Temporary session - check sessionStorage
          // If sessionStorage exists, user is still logged in for this browser session
          // If not, it means browser was closed and we should clear the session
          const tempSession = sessionStorage.getItem('ecoinvest_temp_session');
          if (tempSession) {
            // Temporary session is active, load user
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && !parsedUser.permissions) {
              const role = parsedUser.role;
              if (role) {
                const permissions = getPermissionsForRole(role);
                parsedUser.permissions = permissions;
              }
            }
            setUser(parsedUser);
          } else {
            // No temporary session marker, clear user (browser was closed)
            localStorage.removeItem('ecoinvest_user');
            localStorage.removeItem('ecoinvest_auth_provider');
          }
        }
      } catch (err) {
        console.error('Error loading stored user:', err);
        localStorage.removeItem('ecoinvest_user');
        localStorage.removeItem('ecoinvest_keep_signed_in');
        localStorage.removeItem('ecoinvest_session_expiry');
        sessionStorage.removeItem('ecoinvest_temp_session');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false, keepSignedIn: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      
      // Store user session
      localStorage.setItem('ecoinvest_user', JSON.stringify(loggedUser));
      
      // Handle "Remember me" - save email only
      if (rememberMe) {
        localStorage.setItem('ecoinvest_remembered_email', email);
      } else {
        localStorage.removeItem('ecoinvest_remembered_email');
      }
      
      // Handle "Keep me signed in" - extend session persistence
      if (keepSignedIn) {
        localStorage.setItem('ecoinvest_keep_signed_in', 'true');
        // Set session expiry to 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem('ecoinvest_session_expiry', expiryDate.toISOString());
      } else {
        localStorage.removeItem('ecoinvest_keep_signed_in');
        localStorage.removeItem('ecoinvest_session_expiry');
        // Use sessionStorage for temporary session (cleared when browser closes)
        sessionStorage.setItem('ecoinvest_temp_session', 'true');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid email or password';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData, rememberMe: boolean = false, keepSignedIn: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await authService.register(data);
      setUser(newUser);
      
      // Store user session
      localStorage.setItem('ecoinvest_user', JSON.stringify(newUser));
      
      // Handle "Remember me" - save email only
      if (rememberMe) {
        localStorage.setItem('ecoinvest_remembered_email', data.email);
      } else {
        localStorage.removeItem('ecoinvest_remembered_email');
      }
      
      // Handle "Keep me signed in" - extend session persistence
      if (keepSignedIn) {
        localStorage.setItem('ecoinvest_keep_signed_in', 'true');
        // Set session expiry to 30 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem('ecoinvest_session_expiry', expiryDate.toISOString());
      } else {
        localStorage.removeItem('ecoinvest_keep_signed_in');
        localStorage.removeItem('ecoinvest_session_expiry');
        // Use sessionStorage for temporary session
        sessionStorage.setItem('ecoinvest_temp_session', 'true');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (rememberMe: boolean = false, keepSignedIn: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const googleUser = await loginWithGoogle();
      setUser(googleUser);
      
      // Store user session
      localStorage.setItem('ecoinvest_user', JSON.stringify(googleUser));
      
      // Handle "Remember me" - save email only
      if (rememberMe) {
        localStorage.setItem('ecoinvest_remembered_email', googleUser.email);
      } else {
        localStorage.removeItem('ecoinvest_remembered_email');
      }
      
      // Handle "Keep me signed in" - extend session persistence
      // For Google users, default to keeping signed in unless explicitly disabled
      if (keepSignedIn !== false) {
        localStorage.setItem('ecoinvest_keep_signed_in', 'true');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem('ecoinvest_session_expiry', expiryDate.toISOString());
      } else {
        localStorage.removeItem('ecoinvest_keep_signed_in');
        localStorage.removeItem('ecoinvest_session_expiry');
        sessionStorage.setItem('ecoinvest_temp_session', 'true');
      }
    } catch (err: any) {
      // Provide user-friendly error messages
      let errorMessage = 'Error al iniciar sesión con Google';
      if (err.message) {
        if (err.message.includes('no está disponible')) {
          errorMessage = 'Google Sign In no está disponible. Por favor, recarga la página e intenta de nuevo.';
        } else if (err.message.includes('cancelado')) {
          errorMessage = 'Inicio de sesión cancelado. Por favor, intenta de nuevo.';
        } else if (err.message.includes('No se pudo mostrar')) {
          errorMessage = 'No se pudo mostrar el inicio de sesión de Google. Por favor, intenta de nuevo.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ecoinvest_user');
    localStorage.removeItem('ecoinvest_keep_signed_in');
    localStorage.removeItem('ecoinvest_session_expiry');
    localStorage.removeItem('ecoinvest_google_access_token');
    localStorage.removeItem('ecoinvest_google_token');
    localStorage.removeItem('ecoinvest_auth_provider');
    sessionStorage.removeItem('ecoinvest_temp_session');
    // Note: We keep 'ecoinvest_remembered_email' so user doesn't have to type it again
    authService.logout();
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle: handleGoogleLogin, register, logout, error, clearError }}>
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
