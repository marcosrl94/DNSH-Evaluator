import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, UserPlus, Eye, EyeOff, CheckCircle, X, Building2, Users, Briefcase } from 'lucide-react';
import { UserRole } from '../types';
import PalantirLoader from '../components/PalantirLoader';
import { initGoogleAuth } from '../services/auth';

// Global flag to prevent multiple Google initializations across all instances
declare global {
  interface Window {
    __GOOGLE_INITIALIZED__?: boolean;
    __GOOGLE_BUTTON_RENDERED__?: boolean;
    __GOOGLE_PROMPT_DISABLED__?: boolean;
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback_uri?: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
          }) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: {
            type?: string;
            theme?: string;
            size?: string;
            text?: string;
            width?: number;
            logo_alignment?: string;
            shape?: string;
            ux_mode?: 'popup' | 'redirect';
            redirect_uri?: string;
            use_fedcm_for_prompt?: boolean;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
        };
      };
    };
  }
}

// CRITICAL: Disable Google One Tap and any automatic prompts globally
// This prevents Google from automatically showing popups/prompts
if (typeof window !== 'undefined') {
  // Set flag before Google script loads
  window.__GOOGLE_PROMPT_DISABLED__ = true;
}

const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, register, isLoading, error, clearError, user } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'Analyst' as UserRole,
    organization: '',
    department: ''
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [rememberMe, setRememberMe] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);
  const initializationAttemptedRef = useRef(false);

  // Load remembered email and preferences on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('ecoinvest_remembered_email');
    if (rememberedEmail && !isRegisterMode) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    
    const wasKeepSignedIn = localStorage.getItem('ecoinvest_keep_signed_in') === 'true';
    if (wasKeepSignedIn) {
      setKeepSignedIn(true);
    }
  }, [isRegisterMode]);

  // Update remembered email when rememberMe changes
  useEffect(() => {
    if (!rememberMe && !isRegisterMode) {
      localStorage.removeItem('ecoinvest_remembered_email');
    } else if (rememberMe && email && !isRegisterMode) {
      localStorage.setItem('ecoinvest_remembered_email', email);
    }
  }, [rememberMe, email, isRegisterMode]);

  // Clear form when switching modes
  useEffect(() => {
    if (isRegisterMode) {
      setEmail('');
      setPassword('');
    } else {
      const rememberedEmail = localStorage.getItem('ecoinvest_remembered_email');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
      setRegisterData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'Analyst' as UserRole,
        organization: '',
        department: ''
      });
      setPasswordErrors([]);
    }
    clearError();
    setLocalError(null);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isRegisterMode]);

  // Redirect when user is successfully authenticated
  useEffect(() => {
    if (user && !isLoading && loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, loginSuccess]);

  // Check for Google OAuth redirect callback on page load
  useEffect(() => {
    // Check query parameters first (for some OAuth flows)
    const urlParams = new URLSearchParams(window.location.search);
    const credentialFromQuery = urlParams.get('credential') || urlParams.get('id_token');
    
    // Check hash fragment for id_token (Google redirect mode with response_type=id_token)
    // Google redirects with: #id_token=... or #credential=...
    let credentialFromHash: string | null = null;
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      // Try parsing as URLSearchParams first
      try {
        const hashParams = new URLSearchParams(hash);
        credentialFromHash = hashParams.get('id_token') || hashParams.get('credential');
      } catch (e) {
        // If hash is not in param format, check if it's just the token directly
        // Some Google flows return: #id_token=TOKEN or #credential=TOKEN
        if (hash.startsWith('id_token=')) {
          credentialFromHash = hash.substring('id_token='.length).split('&')[0];
        } else if (hash.startsWith('credential=')) {
          credentialFromHash = hash.substring('credential='.length).split('&')[0];
        }
      }
    }
    
    const credential = credentialFromQuery || credentialFromHash;
    
    if (credential) {
      console.log('[Google OAuth] Callback detected, processing credential...');
      console.log('[Google OAuth] Origin:', window.location.origin);
      
      // Clean URL immediately to prevent re-processing
      const cleanUrl = window.location.pathname + (window.location.search ? window.location.search.replace(/[?&](credential|id_token)=[^&]*/g, '') : '');
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Process the credential
      (async () => {
        try {
          clearError();
          setLocalError(null);
          // isLoading is managed by AuthContext, no need to set it manually
          await loginWithGoogle(rememberMe, keepSignedIn, credential);
          setLoginSuccess(true);
        } catch (err: any) {
          console.error('[Google OAuth] Error processing credential:', err);
          setLocalError(err.message || 'Error al procesar la autenticación de Google');
        }
      })();
      return;
    }
    
    // Check for error in URL (Google OAuth errors)
    const errorParam = urlParams.get('error') || (window.location.hash.includes('error=') ? new URLSearchParams(window.location.hash.substring(1)).get('error') : null);
    if (errorParam) {
      console.error('[Google OAuth] Error from Google:', errorParam);
      const errorDescription = urlParams.get('error_description') || 
        (window.location.hash.includes('error_description=') ? new URLSearchParams(window.location.hash.substring(1)).get('error_description') : null);
      setLocalError(`Error de Google: ${errorParam}${errorDescription ? ` - ${decodeURIComponent(errorDescription)}` : ''}`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loginWithGoogle, rememberMe, keepSignedIn, clearError]);

  // Initialize Google Sign-In button - ONLY ONCE
  useEffect(() => {
    // CRITICAL: Multiple guards to prevent duplicate initialization
    if (isRegisterMode) {
      return;
    }

    // Check global flag first
    if (window.__GOOGLE_INITIALIZED__ || window.__GOOGLE_BUTTON_RENDERED__) {
      return;
    }

    // Check local ref
    if (googleInitializedRef.current || initializationAttemptedRef.current) {
      return;
    }

    // Default Client ID for production (can be overridden by env var)
  const DEFAULT_GOOGLE_CLIENT_ID = '169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com';
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
    
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    // Mark as attempted immediately to prevent race conditions
    initializationAttemptedRef.current = true;
    window.__GOOGLE_INITIALIZED__ = true;
    window.__GOOGLE_PROMPT_DISABLED__ = true; // Disable prompts globally

    const initializeGoogle = async () => {
      try {
        // Only load script if not already loaded
        if (!window.google?.accounts?.id) {
          await initGoogleAuth();
        }
        
        // Wait for Google to be available
        const waitForGoogle = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            let retries = 0;
            const maxRetries = 30;
            const checkGoogle = () => {
              if (window.google?.accounts?.id) {
                resolve();
              } else if (retries < maxRetries) {
                retries++;
                setTimeout(checkGoogle, 100);
              } else {
                reject(new Error('Google Identity Services no disponible'));
              }
            };
            checkGoogle();
          });
        };

        await waitForGoogle();
        
        // CRITICAL: Disable prompt() completely to prevent popups/One Tap
        // Override prompt IMMEDIATELY to prevent any automatic popups
        if (window.google?.accounts?.id) {
          const originalPrompt = window.google.accounts.id.prompt;
          window.google.accounts.id.prompt = () => {
            // Completely disable - One Tap causes popups
            console.log('One Tap (prompt) disabled - using redirect mode only');
            // Do nothing - never show One Tap
          };
          window.__GOOGLE_PROMPT_DISABLED__ = true;
          
          // Also prevent any automatic initialization
          if ((window.google.accounts.id as any).prompt_parent_id) {
            delete (window.google.accounts.id as any).prompt_parent_id;
          }
        }
        
        // Final check before initializing
        if (!googleButtonRef.current || !window.google?.accounts?.id) {
          initializationAttemptedRef.current = false;
          window.__GOOGLE_INITIALIZED__ = false;
          return;
        }

        // Check if button already exists
        if (googleButtonRef.current.querySelector('div[role="button"]')) {
          window.__GOOGLE_BUTTON_RENDERED__ = true;
          return;
        }

        googleInitializedRef.current = true;
        
        // Safely clear the container - avoid innerHTML to prevent DOM errors
        try {
          while (googleButtonRef.current.firstChild) {
            googleButtonRef.current.removeChild(googleButtonRef.current.firstChild);
          }
        } catch (e) {
          // If removeChild fails, try innerHTML as fallback
          try {
            googleButtonRef.current.innerHTML = '';
          } catch (e2) {
            // If both fail, just continue - Google will handle it
            console.warn('Could not clear Google button container:', e2);
          }
        }
        
        // Initialize Google with callback - ONLY ONCE
        // CRITICAL: Configure for redirect-only mode, no popups, no One Tap
        // IMPORTANT: Completely disable One Tap and force redirect
        // Normalize redirect URI to match Google Cloud Console exactly (no trailing slash)
        const normalizedRedirectUri = window.location.origin.replace(/\/$/, '');
        
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback_uri: normalizedRedirectUri, // Explicit redirect URI (normalized, no trailing slash)
          callback: async (response: { credential: string }) => {
            try {
              clearError();
              setLocalError(null);
              // isLoading is managed by AuthContext, no need to set it manually
              await loginWithGoogle(rememberMe, keepSignedIn, response.credential);
              setLoginSuccess(true);
            } catch (err: any) {
              setLocalError(err.message || 'Error al iniciar sesión con Google');
            }
          },
          // CRITICAL: Completely disable One Tap
          auto_select: false,
          cancel_on_tap_outside: true,
          // Disable One Tap completely - this prevents gsi/select popup
          itp_support: false,
          // Force redirect mode
          ux_mode: 'redirect' as any,
        });
        
        // CRITICAL: Ensure prompt() is never called (One Tap)
        // This prevents the gsi/select popup that's causing the issue
        if (window.google?.accounts?.id?.prompt) {
          const originalPrompt = window.google.accounts.id.prompt;
          window.google.accounts.id.prompt = () => {
            // Completely disable - do nothing
            console.log('One Tap (prompt) disabled - using redirect mode only');
          };
        }

        // Render the button - but we'll intercept clicks to force redirect
        try {
          // Clear any existing button first
          const existingButton = googleButtonRef.current.querySelector('div[role="button"]');
          if (existingButton) {
            existingButton.remove();
          }

          // Render button (Google may ignore ux_mode, so we'll override clicks)
          // Normalize redirect URI to match Google Cloud Console exactly (no trailing slash)
          const normalizedRedirectUri = window.location.origin.replace(/\/$/, '');
          
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: googleButtonRef.current.offsetWidth || 350,
            logo_alignment: 'left',
            shape: 'rectangular',
            // Try to set redirect mode (but Google may ignore it)
            ux_mode: 'redirect',
            redirect_uri: normalizedRedirectUri,
            use_fedcm_for_prompt: false,
            auto_select: false,
            cancel_on_tap_outside: false,
          });
          
          window.__GOOGLE_BUTTON_RENDERED__ = true;
          
          // Log configuration for debugging
          const baseUrl = window.location.origin.replace(/\/$/, '');
          console.log('[Google OAuth] Button rendered with redirect mode');
          console.log('[Google OAuth] Redirect URI:', baseUrl);
          console.log('[Google OAuth] Make sure this URI is in Google Cloud Console:');
          console.log('[Google OAuth]   - Authorized JavaScript origins:', baseUrl);
          console.log('[Google OAuth]   - Authorized redirect URIs:', baseUrl, 'and', baseUrl + '/');
          
          // Less aggressive approach: Trust ux_mode: 'redirect' to work
          // Only add a fallback monitor that checks if redirect actually happened
          // This prevents the "message port closed" errors by not interfering with Google's handlers
          const monitorRedirect = () => {
            const googleButton = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
            if (!googleButton) return;
            
            // Store original href to detect if we're still on the same page
            const originalHref = window.location.href;
            
            // Add a lightweight click listener that only monitors, doesn't prevent
            googleButton.addEventListener('click', () => {
              // Check after a delay if redirect happened
              setTimeout(() => {
                // If we're still on the same page after 1.5 seconds, force redirect
                if (window.location.href === originalHref) {
                  console.log('[Google OAuth] Fallback: Redirect did not occur, forcing redirect');
                  const redirectUri = encodeURIComponent(baseUrl);
                  const scope = encodeURIComponent('openid email profile');
                  const nonce = Date.now().toString() + Math.random().toString(36).substring(7);
                  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=id_token&scope=${scope}&nonce=${nonce}`;
                  window.location.href = authUrl;
                }
              }, 1500);
            }, { once: true });
          };
          
          // Monitor after button is rendered
          setTimeout(monitorRedirect, 500);
        } catch (renderError) {
          // Safely convert error to string
          const errorMsg = renderError instanceof Error ? renderError.message : String(renderError || 'Unknown error');
          console.error('Error rendering Google button:', errorMsg);
          initializationAttemptedRef.current = false;
          window.__GOOGLE_INITIALIZED__ = false;
          window.__GOOGLE_BUTTON_RENDERED__ = false;
        }
      } catch (error) {
        // Safely convert error to string
        const errorMsg = error instanceof Error ? error.message : String(error || 'Unknown error');
        console.error('Error initializing Google Sign-In:', errorMsg);
        initializationAttemptedRef.current = false;
        window.__GOOGLE_INITIALIZED__ = false;
        window.__GOOGLE_BUTTON_RENDERED__ = false;
      }
    };

    initializeGoogle();

    // Cleanup function
    return () => {
      // Don't reset flags on cleanup - we want single initialization
    };
  }, []); // Empty dependency array - only run once on mount

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('One number');
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setRegisterData(prev => ({ ...prev, password: value }));
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoginSuccess(false);

    if (isRegisterMode) {
      if (registerData.password !== registerData.confirmPassword) {
        return;
      }
      if (passwordErrors.length > 0) {
        return;
      }

      try {
        await register({
          email: registerData.email,
          password: registerData.password,
          name: registerData.name,
          role: registerData.role,
          organization: registerData.organization || undefined,
          department: registerData.department || undefined
        }, rememberMe, keepSignedIn);
        setLoginSuccess(true);
        setTimeout(() => {
          setIsRegisterMode(false);
          setEmail(registerData.email);
        }, 1500);
      } catch (err) {
        // Error handled in context
      }
    } else {
      try {
        await login(email, password, rememberMe, keepSignedIn);
        setLoginSuccess(true);
      } catch (err) {
        // Error handled in context
      }
    }
  };

  const getPasswordStrength = (pwd: string): { strength: 'weak' | 'medium' | 'strong'; color: string } => {
    const errors = validatePassword(pwd);
    const remaining = 4 - errors.length;
    if (remaining <= 1) return { strength: 'weak', color: 'red' };
    if (remaining <= 2) return { strength: 'medium', color: 'amber' };
    return { strength: 'strong', color: 'emerald' };
  };

  const roleIcons: Record<UserRole, React.ReactNode> = {
    Analyst: <Briefcase size={16} />,
    Manager: <Users size={16} />,
    Viewer: <Eye size={16} />,
    Admin: <ShieldCheck size={16} />
  };

  // Default Client ID for production (can be overridden by env var)
  const DEFAULT_GOOGLE_CLIENT_ID = '169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com';
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-black overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        ></div>
        <style>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
        `}</style>
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black via-[#0a0a0a] to-black"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00a8ff]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md z-10 p-4 sm:p-6">
        <div className={`bg-[#0a0a0a] rounded-xl shadow-2xl overflow-hidden border border-[#1a1a1a] transition-all duration-500 ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#0a0a0a] p-6 sm:p-8 text-center border-b border-[#1a1a1a] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, #00ff88 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#00ff88] to-[#00a8ff] rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-[#00ff88]/30 relative">
                <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#0a0a0a]" />
                <div className="absolute inset-0 bg-[#00ff88] rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono uppercase mb-1 sm:mb-2">
                ECOINVEST
              </h1>
              <p className="text-[#666666] text-[10px] sm:text-xs font-mono uppercase tracking-widest mt-1 sm:mt-2">
                DNSH EVALUATION PLATFORM
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1a1a1a] bg-[#111111]">
            <button
              onClick={() => {
                setIsRegisterMode(false);
                clearError();
              }}
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-300 font-mono uppercase tracking-wider relative ${
                !isRegisterMode
                  ? 'text-[#00ff88] bg-[#0a0a0a]'
                  : 'text-[#666666] hover:text-white hover:bg-[#0f0f0f]'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center space-x-1.5 sm:space-x-2">
                <Lock size={14} className="sm:w-4 sm:h-4" />
                <span>SIGN IN</span>
              </span>
              {!isRegisterMode && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"></div>
              )}
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(true);
                clearError();
              }}
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-300 font-mono uppercase tracking-wider relative ${
                isRegisterMode
                  ? 'text-[#00ff88] bg-[#0a0a0a]'
                  : 'text-[#666666] hover:text-white hover:bg-[#0f0f0f]'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center space-x-1.5 sm:space-x-2">
                <UserPlus size={14} className="sm:w-4 sm:h-4" />
                <span>REGISTER</span>
              </span>
              {isRegisterMode && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"></div>
              )}
            </button>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 bg-[#0a0a0a]">
            {loginSuccess && !error && !localError && (
              <div className="mb-5 p-3 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg flex items-center space-x-3 animate-fadeIn">
                <CheckCircle className="text-[#00ff88] flex-shrink-0" size={18} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#00ff88] font-mono uppercase truncate">
                    {isRegisterMode ? 'Account Created Successfully' : 'Authentication Successful'}
                  </p>
                  <p className="text-[10px] text-[#666666] mt-0.5">
                    {isRegisterMode ? 'Redirecting to login...' : 'Initializing session...'}
                  </p>
                </div>
                <PalantirLoader size="sm" variant="minimal" />
              </div>
            )}

            {(error || localError) && (
              <div className="mb-5 flex items-start p-3 bg-red-500/10 border-l-4 border-red-500 text-red-400 rounded text-sm animate-fadeIn">
                <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                <span className="flex-1 font-mono text-xs break-words">{error || localError}</span>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setLocalError(null);
                  }}
                  className="ml-2 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Google Sign In Button */}
            {!isRegisterMode && (
              <div className="mb-5">
                <div className="text-center mb-2.5">
                  <p className="text-xs text-white font-mono uppercase tracking-wider">
                    Quick Access
                  </p>
                </div>
                {/* Container for Google button - always visible */}
                <div 
                  ref={googleButtonRef}
                  id="google-signin-button" 
                  className="w-full flex justify-center mb-3"
                  style={{ minHeight: '48px', width: '100%' }}
                />
                {/* Botón alternativo cuando no hay Google Client ID configurado */}
                {!GOOGLE_CLIENT_ID && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        clearError();
                        setLocalError(null);
                        await loginWithGoogle(rememberMe, keepSignedIn);
                        setLoginSuccess(true);
                      } catch (err: any) {
                        setLocalError(err.message || 'Error al iniciar sesión');
                        const errorMsg = err instanceof Error ? err.message : String(err || 'Unknown error');
                        console.error('Google login error:', errorMsg);
                      }
                    }}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-[#1a1a1a] rounded-lg shadow-sm text-sm font-medium text-white bg-[#111111] hover:bg-[#1a1a1a] hover:border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00ff88]/50 transition-all font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-3"
                  >
                    <svg className="w-5 h-5 mr-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="truncate">{isLoading ? 'AUTHENTICATING...' : 'CONTINUE WITH GOOGLE'}</span>
                  </button>
                )}
                {/* Loading indicator if Google button is initializing */}
                {GOOGLE_CLIENT_ID && !googleButtonRef.current?.querySelector('div[role="button"]') && (
                  <div className="w-full flex justify-center items-center py-2.5 px-4 border border-[#1a1a1a] rounded-lg bg-[#111111] mb-3 min-h-[48px]">
                    <PalantirLoader size="sm" variant="minimal" />
                    <span className="ml-2 text-xs text-[#666666] font-mono uppercase">Cargando botón de Google...</span>
                  </div>
                )}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#1a1a1a]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-[#0a0a0a] text-[#666666] font-mono tracking-wider">OR</span>
                  </div>
                </div>
              </div>
            )}

            {isLoading && !loginSuccess ? (
              <div className="py-10">
                <PalantirLoader 
                  size="lg" 
                  text={isRegisterMode ? "CREATING_ACCOUNT" : "AUTHENTICATING"} 
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} action="#" method="get" className="space-y-4">
                {isRegisterMode ? (
                  <>
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        FULL NAME *
                      </label>
                      <input
                        type="text"
                        value={registerData.name}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                        className="block w-full px-4 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        EMAIL ADDRESS *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                          className="block w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="name@company.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        ROLE *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {roleIcons[registerData.role]}
                        </div>
                        <select
                          value={registerData.role}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                          className="block w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm appearance-none cursor-pointer"
                          required
                        >
                          <option value="Analyst">Analyst</option>
                          <option value="Manager">Manager</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <ArrowRight className="h-4 w-4 text-[#666666] rotate-90" />
                        </div>
                      </div>
                      <p className="text-[10px] text-[#666666] mt-1 font-mono">Admin accounts require approval</p>
                    </div>

                    {/* Organization */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        ORGANIZATION
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building2 className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type="text"
                          value={registerData.organization}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, organization: e.target.value }))}
                          className="block w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="EcoInvest"
                        />
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        DEPARTMENT
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Users className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type="text"
                          value={registerData.department}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, department: e.target.value }))}
                          className="block w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="Risk Assessment"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        PASSWORD *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          className="block w-full pl-10 pr-10 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666666] hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {registerData.password && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  getPasswordStrength(registerData.password).color === 'red' ? 'bg-red-500' :
                                  getPasswordStrength(registerData.password).color === 'amber' ? 'bg-[#ffb800]' :
                                  'bg-[#00ff88]'
                                }`}
                                style={{ width: `${((4 - passwordErrors.length) / 4) * 100}%` }}
                              />
                            </div>
                            <span className={`ml-2 text-[10px] font-bold font-mono uppercase ${
                              getPasswordStrength(registerData.password).color === 'red' ? 'text-red-400' :
                              getPasswordStrength(registerData.password).color === 'amber' ? 'text-[#ffb800]' :
                              'text-[#00ff88]'
                            }`}>
                              {getPasswordStrength(registerData.password).strength}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number'].map(req => {
                              const isValid = !passwordErrors.includes(req);
                              return (
                                <div key={req} className={`flex items-center font-mono ${
                                  isValid ? 'text-[#00ff88]' : 'text-[#666666]'
                                }`}>
                                  {isValid ? (
                                    <CheckCircle size={10} className="mr-1.5 flex-shrink-0" />
                                  ) : (
                                    <X size={10} className="mr-1.5 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{req}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        CONFIRM PASSWORD *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className={`block w-full pl-10 pr-10 py-2.5 bg-[#111111] border rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 font-mono text-sm transition-all ${
                            registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                              ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                              : 'border-[#1a1a1a] focus:ring-[#00ff88]/50 focus:border-[#00ff88]'
                          }`}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666666] hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                        <p className="mt-1 text-[10px] text-red-400 font-mono">Passwords do not match</p>
                      )}
                    </div>

                    {/* Remember Me & Keep Signed In for Registration */}
                    <div className="space-y-2 pt-1">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-3.5 h-3.5 border-2 rounded transition-all flex items-center justify-center flex-shrink-0 ${
                          rememberMe 
                            ? 'bg-[#00ff88] border-[#00ff88]' 
                            : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                        }`}>
                          {rememberMe && <CheckCircle size={10} className="text-[#0a0a0a]" />}
                        </div>
                        <span className="ml-2 text-[10px] text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                          Remember email
                        </span>
                      </label>
                      
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={keepSignedIn}
                          onChange={(e) => setKeepSignedIn(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-3.5 h-3.5 border-2 rounded transition-all flex items-center justify-center flex-shrink-0 ${
                          keepSignedIn 
                            ? 'bg-[#00ff88] border-[#00ff88]' 
                            : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                        }`}>
                          {keepSignedIn && <CheckCircle size={10} className="text-[#0a0a0a]" />}
                        </div>
                        <span className="ml-2 text-[10px] text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                          Keep me signed in
                        </span>
                        <span className="ml-1.5 text-[9px] text-[#666666] font-mono">
                          (30 days)
                        </span>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        EMAIL ADDRESS
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="name@company.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-1.5 font-mono uppercase tracking-wider">
                        PASSWORD
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-[#666666]" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-10 pr-10 py-2.5 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666666] hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {/* Remember Me & Keep Signed In */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-3.5 h-3.5 border-2 rounded transition-all flex items-center justify-center flex-shrink-0 ${
                            rememberMe 
                              ? 'bg-[#00ff88] border-[#00ff88]' 
                              : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                          }`}>
                            {rememberMe && <CheckCircle size={10} className="text-[#0a0a0a]" />}
                          </div>
                          <span className="ml-2 text-[10px] text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                            Remember email
                          </span>
                        </label>
                        <a href="#" className="text-[10px] font-medium text-[#00ff88] hover:text-[#00ff88]/80 transition-colors font-mono uppercase">
                          Forgot password?
                        </a>
                      </div>
                      
                      {/* Keep Signed In */}
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={keepSignedIn}
                          onChange={(e) => setKeepSignedIn(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-3.5 h-3.5 border-2 rounded transition-all flex items-center justify-center flex-shrink-0 ${
                          keepSignedIn 
                            ? 'bg-[#00ff88] border-[#00ff88]' 
                            : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                        }`}>
                          {keepSignedIn && <CheckCircle size={10} className="text-[#0a0a0a]" />}
                        </div>
                        <span className="ml-2 text-[10px] text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                          Keep me signed in
                        </span>
                        <span className="ml-1.5 text-[9px] text-[#666666] font-mono">
                          (30 days)
                        </span>
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (isRegisterMode && (passwordErrors.length > 0 || registerData.password !== registerData.confirmPassword))}
                  className="w-full flex justify-center items-center py-3 px-4 mt-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-[#0a0a0a] bg-gradient-to-r from-[#00ff88] to-[#00a8ff] hover:from-[#00e673] hover:to-[#0099e6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00ff88]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    {isRegisterMode ? 'CREATE ACCOUNT' : 'SIGN IN'}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
