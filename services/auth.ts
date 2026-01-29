
import { User, UserRole, UserPermissions } from '../types';

// Google OAuth Configuration
// In production, set VITE_GOOGLE_CLIENT_ID in your .env file
// Get it from: https://console.cloud.google.com/apis/credentials
// Default Client ID for production (can be overridden by env var)
const DEFAULT_GOOGLE_CLIENT_ID = '169907416354-f7a2tcrkhtq4pbel40tc2ho6c84npkd2.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

// Global callback handler for Google Sign In
let googleSignInCallback: ((user: User) => void) | null = null;
let googleSignInErrorCallback: ((error: Error) => void) | null = null;

// Global flag to prevent multiple script loads
let scriptLoading = false;
let scriptLoaded = false;

// Initialize Google Identity Services
export const initGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available'));
      return;
    }

    // If already loaded, resolve immediately
    if (window.google?.accounts?.id) {
      scriptLoaded = true;
      resolve();
      return;
    }

    // If script is already loading, wait for it
    if (scriptLoading) {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          scriptLoaded = true;
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.accounts?.id) {
          reject(new Error('Timeout waiting for Google script'));
        }
      }, 10000);
      return;
    }

    // Check if script element already exists
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      scriptLoading = true;
      existingScript.addEventListener('load', () => {
        scriptLoading = false;
        scriptLoaded = true;
        resolve();
      });
      existingScript.addEventListener('error', () => {
        scriptLoading = false;
        reject(new Error('Failed to load Google script'));
      });
      return;
    }

    // Load Google Identity Services script - ONLY ONCE
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoading = false;
      if (window.google?.accounts?.id) {
        // CRITICAL: Disable prompt() immediately after Google loads to prevent popups
        if (!(window as any).__GOOGLE_PROMPT_DISABLED__) {
          const originalPrompt = window.google.accounts.id.prompt;
          window.google.accounts.id.prompt = () => {
            // Completely disable prompts - we only want redirect mode
            console.log('Google prompt() disabled globally - redirect mode only');
          };
          (window as any).__GOOGLE_PROMPT_DISABLED__ = true;
        }
        scriptLoaded = true;
        resolve();
      } else {
        reject(new Error('Failed to load Google Identity Services'));
      }
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load Google script'));
    };
    document.head.appendChild(script);
  });
};

// Handle Google credential response
const handleGoogleCredentialResponse = async (response: { credential: string }) => {
  try {
    // Decode JWT credential
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    // Create user object from Google data
    const googleUser: User = {
      id: `google-${payload.sub}`,
      email: payload.email,
      name: payload.name,
      role: 'Analyst', // Default role for Google users
      avatarUrl: payload.picture,
      createdAt: new Date().toISOString(),
      isActive: true,
      permissions: getPermissionsForRole('Analyst'),
      lastLogin: new Date().toISOString(),
    };

    // Store token and provider info
    localStorage.setItem('ecoinvest_google_token', response.credential);
    localStorage.setItem('ecoinvest_auth_provider', 'google');
    localStorage.setItem('auth_token', response.credential); // Store as auth token too

    // Call success callback if set
    if (googleSignInCallback) {
      googleSignInCallback(googleUser);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to process Google credential');
    if (googleSignInErrorCallback) {
      googleSignInErrorCallback(err);
    }
  }
};

// Login with Google
export const loginWithGoogle = async (
  rememberMe: boolean = false,
  keepSignedIn: boolean = false
): Promise<User> => {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  // If no Google Client ID configured, use demo mode
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === '') {
    // Simulate a delay for demo mode to show loading state
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo mode: Create a demo Google user
    const demoGoogleUser: User = {
      id: `google-demo-${Date.now()}`,
      email: 'user@gmail.com',
      name: 'Google User',
      role: 'Analyst',
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      createdAt: new Date().toISOString(),
      isActive: true,
      permissions: getPermissionsForRole('Analyst'),
      lastLogin: new Date().toISOString(),
    };
    
    // Store provider info and session
    localStorage.setItem('ecoinvest_auth_provider', 'google-demo');
    localStorage.setItem('ecoinvest_user', JSON.stringify(demoGoogleUser));
    
    if (keepSignedIn || true) { // Default to keep signed in for Google
      localStorage.setItem('ecoinvest_keep_signed_in', 'true');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      localStorage.setItem('ecoinvest_session_expiry', expiryDate.toISOString());
    }
    
    return demoGoogleUser;
  }

  // IMPORTANT: Real Google OAuth is now handled in Login.tsx component
  // This function should NOT initialize Google or call prompt() to avoid duplicate popups
  // If we reach here with a real Client ID, it means the component didn't handle it properly
  // Throw an error to indicate that the button-based flow should be used instead
  throw new Error('Para usar Google OAuth, por favor haz clic en el botón "CONTINUE WITH GOOGLE" en la página de login. La inicialización automática está deshabilitada para evitar ventanas duplicadas.');
};

// Declare Google types for TypeScript
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

// Helper to get permissions based on role
export const getPermissionsForRole = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'Admin':
      return {
        canViewOperations: true,
        canEditOperations: true,
        canDeleteOperations: true,
        canEvaluateDNSH: true,
        canApproveEvaluations: true,
        canManageUsers: true,
        canViewReports: true,
        canExportData: true,
        canManageEvidence: true,
      };
    case 'Manager':
      return {
        canViewOperations: true,
        canEditOperations: true,
        canDeleteOperations: false,
        canEvaluateDNSH: true,
        canApproveEvaluations: true,
        canManageUsers: false,
        canViewReports: true,
        canExportData: true,
        canManageEvidence: true,
      };
    case 'Analyst':
      return {
        canViewOperations: true,
        canEditOperations: true,
        canDeleteOperations: false,
        canEvaluateDNSH: true,
        canApproveEvaluations: false,
        canManageUsers: false,
        canViewReports: true,
        canExportData: false,
        canManageEvidence: true,
      };
    case 'Viewer':
      return {
        canViewOperations: true,
        canEditOperations: false,
        canDeleteOperations: false,
        canEvaluateDNSH: false,
        canApproveEvaluations: false,
        canManageUsers: false,
        canViewReports: true,
        canExportData: false,
        canManageEvidence: false,
      };
    default:
      return {
        canViewOperations: false,
        canEditOperations: false,
        canDeleteOperations: false,
        canEvaluateDNSH: false,
        canApproveEvaluations: false,
        canManageUsers: false,
        canViewReports: false,
        canExportData: false,
        canManageEvidence: false,
      };
  }
};

// Mock database of users (in real app, this would be in a secure database)
// Passwords are hashed in a real implementation
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    email: 'analyst@ecoinvest.com',
    name: 'Marcos Rodriguez',
    role: 'Analyst',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    passwordHash: 'demo123', // In real app: hashed password
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    permissions: getPermissionsForRole('Analyst'),
    organization: 'EcoInvest',
    department: 'Risk Assessment'
  },
  {
    id: 'u2',
    email: 'manager@ecoinvest.com',
    name: 'Elena Fisher',
    role: 'Manager',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    passwordHash: 'demo123',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    permissions: getPermissionsForRole('Manager'),
    organization: 'EcoInvest',
    department: 'Operations'
  },
  {
    id: 'u3',
    email: 'admin@ecoinvest.com',
    name: 'Admin User',
    role: 'Admin',
    passwordHash: 'admin123',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    permissions: getPermissionsForRole('Admin'),
    organization: 'EcoInvest',
    department: 'IT'
  }
];

// Password validation
const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Email validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Register new user
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  organization?: string;
  department?: string;
}

export const register = async (data: RegisterData): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Validation
  if (!validateEmail(data.email)) {
    throw new Error('Invalid email format');
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.error || 'Invalid password');
  }

  // Check if user already exists in MOCK_USERS
  let existingUser = MOCK_USERS.find(u => u.email.toLowerCase() === data.email.toLowerCase());
  
  // Also check registered users in localStorage
  if (!existingUser) {
    try {
      const storedUsers = localStorage.getItem('ecoinvest_registered_users');
      if (storedUsers) {
        const registeredUsers = JSON.parse(storedUsers);
        existingUser = registeredUsers.find((u: User) => 
          u.email.toLowerCase() === data.email.toLowerCase()
        );
      }
    } catch (err) {
      // Silently handle - registration check errors shouldn't break the app
    }
  }
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const newUser: User = {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    email: data.email.toLowerCase(),
    name: data.name,
    role: data.role || 'Analyst',
    passwordHash: data.password, // In real app: hash password
    createdAt: new Date().toISOString(),
    isActive: true,
    permissions: getPermissionsForRole(data.role || 'Analyst'),
    organization: data.organization,
    department: data.department
  };

  // In real app, save to database
  MOCK_USERS.push(newUser);

  // Persist registered users to localStorage for memory
  try {
    const storedUsers = localStorage.getItem('ecoinvest_registered_users');
    const registeredUsers = storedUsers ? JSON.parse(storedUsers) : [];
    // Store user with password hash for login purposes (in real app, this would be hashed)
    registeredUsers.push({
      ...newUser,
      passwordHash: data.password
    });
    localStorage.setItem('ecoinvest_registered_users', JSON.stringify(registeredUsers));
  } catch (err) {
    // Silently handle - registration storage errors shouldn't break the app
  }

  // Return user without password
  const { passwordHash, ...userWithoutPassword } = newUser;
  return userWithoutPassword as User;
};

// Login
export const login = async (email: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // First check MOCK_USERS (predefined users)
  let user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  // If not found, check registered users from localStorage
  if (!user) {
    try {
      const storedUsers = localStorage.getItem('ecoinvest_registered_users');
      if (storedUsers) {
        const registeredUsers = JSON.parse(storedUsers);
        const foundUser = registeredUsers.find((u: User & { passwordHash?: string }) => 
          u.email.toLowerCase() === email.toLowerCase()
        );
        if (foundUser) {
          // Create user object from stored data
          user = {
            ...foundUser,
            passwordHash: foundUser.passwordHash
          } as User & { passwordHash?: string };
        }
      }
    } catch (err) {
      // Silently handle - user loading errors shouldn't break the app
    }
  }
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated. Please contact administrator.');
  }

  // In real app, compare hashed passwords
  if (user.passwordHash !== password) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date().toISOString();

  // Return user without password
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
};

// Logout
export const logout = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  // In real app, invalidate session token
};

// Check if user has permission
export const hasPermission = (user: User | null, permission: keyof UserPermissions): boolean => {
  if (!user) return false;
  if (!user.permissions) return false; // Safety check for users loaded from localStorage
  return user.permissions[permission] === true;
};

// Get all users (Admin only)
export const getAllUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_USERS.map(({ passwordHash, ...user }) => user as User);
};

// Update user (Admin only)
export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...updates };
  const { passwordHash, ...userWithoutPassword } = MOCK_USERS[userIndex];
  return userWithoutPassword as User;
};
