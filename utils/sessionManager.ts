/**
 * Session Management Utilities
 * 
 * Centralized session handling to eliminate code duplication
 */

import { logger } from './logger';

export interface SessionConfig {
  rememberMe?: boolean;
  keepSignedIn?: boolean;
  authProvider?: 'local' | 'google' | 'google-demo';
}

const SESSION_KEYS = {
  USER: 'ecoinvest_user',
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  KEEP_SIGNED_IN: 'ecoinvest_keep_signed_in',
  SESSION_EXPIRY: 'ecoinvest_session_expiry',
  AUTH_PROVIDER: 'ecoinvest_auth_provider',
  TEMP_SESSION: 'ecoinvest_temp_session',
} as const;

/**
 * Store user session with appropriate storage strategy
 */
export function storeSession(user: any, token: string, config: SessionConfig = {}): void {
  const { rememberMe = false, keepSignedIn = false, authProvider = 'local' } = config;
  
  localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(SESSION_KEYS.AUTH_PROVIDER, authProvider);
  
  if (token) {
    localStorage.setItem(SESSION_KEYS.TOKEN, token);
  }
  
  // Google users default to keep signed in
  const shouldKeepSignedIn = keepSignedIn || (authProvider === 'google' || authProvider === 'google-demo');
  
  if (shouldKeepSignedIn) {
    localStorage.setItem(SESSION_KEYS.KEEP_SIGNED_IN, 'true');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem(SESSION_KEYS.SESSION_EXPIRY, expiryDate.toISOString());
  } else if (rememberMe) {
    sessionStorage.setItem(SESSION_KEYS.TEMP_SESSION, 'true');
  }
}

/**
 * Store refresh token
 */
export function storeRefreshToken(refreshToken: string): void {
  localStorage.setItem(SESSION_KEYS.REFRESH_TOKEN, refreshToken);
}

/**
 * Clear all session data
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEYS.USER);
  localStorage.removeItem(SESSION_KEYS.TOKEN);
  localStorage.removeItem(SESSION_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(SESSION_KEYS.KEEP_SIGNED_IN);
  localStorage.removeItem(SESSION_KEYS.SESSION_EXPIRY);
  localStorage.removeItem(SESSION_KEYS.AUTH_PROVIDER);
  sessionStorage.removeItem(SESSION_KEYS.TEMP_SESSION);
}

/**
 * Check if session is valid
 */
export function isSessionValid(): boolean {
  const storedUser = localStorage.getItem(SESSION_KEYS.USER);
  const storedToken = localStorage.getItem(SESSION_KEYS.TOKEN);
  
  if (!storedUser || !storedToken) {
    return false;
  }
  
  const keepSignedIn = localStorage.getItem(SESSION_KEYS.KEEP_SIGNED_IN) === 'true';
  const sessionExpiry = localStorage.getItem(SESSION_KEYS.SESSION_EXPIRY);
  const authProvider = localStorage.getItem(SESSION_KEYS.AUTH_PROVIDER);
  
  // Google users default to keeping signed in
  const isGoogleUser = authProvider === 'google' || authProvider === 'google-demo';
  
  if (keepSignedIn && sessionExpiry) {
    const expiryDate = new Date(sessionExpiry);
    if (new Date() > expiryDate) {
      // Session expired
      clearSession();
      return false;
    }
  } else if (!isGoogleUser) {
    // Temporary session - check sessionStorage
    const tempSession = sessionStorage.getItem(SESSION_KEYS.TEMP_SESSION);
    if (!tempSession) {
      clearSession();
      return false;
    }
  }
  
  return true;
}

/**
 * Get stored user data
 */
export function getStoredUser(): any | null {
  try {
    const storedUser = localStorage.getItem(SESSION_KEYS.USER);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    logger.error('Error parsing stored user:', error);
    return null;
  }
}

/**
 * Get stored token
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(SESSION_KEYS.TOKEN);
}

/**
 * Get stored refresh token
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(SESSION_KEYS.REFRESH_TOKEN);
}

/**
 * Get auth provider
 */
export function getAuthProvider(): string | null {
  return localStorage.getItem(SESSION_KEYS.AUTH_PROVIDER);
}
