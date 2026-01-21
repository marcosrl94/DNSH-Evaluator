
import { User, UserRole, UserPermissions } from '../types';

// Google OAuth Configuration
// In production, set VITE_GOOGLE_CLIENT_ID in your .env file
// Get it from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Global callback handler for Google Sign In
let googleSignInCallback: ((user: User) => void) | null = null;
let googleSignInErrorCallback: ((error: Error) => void) | null = null;

// Initialize Google Identity Services
export const initGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available'));
      return;
    }

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        // Initialize Google Sign In
        if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== '') {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
          });
        }
        resolve();
      } else {
        reject(new Error('Failed to load Google Identity Services'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
};

// Handle Google credential response
const handleGoogleCredentialResponse = (response: { credential: string }) => {
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
export const loginWithGoogle = async (): Promise<User> => {
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
    
    // Store provider info
    localStorage.setItem('ecoinvest_auth_provider', 'google-demo');
    
    return demoGoogleUser;
  }

  // Initialize Google Auth
  await initGoogleAuth();

  return new Promise((resolve, reject) => {
    try {
      // Set callbacks
      googleSignInCallback = resolve;
      googleSignInErrorCallback = reject;

      // Check if Google Identity Services is available
      if (!window.google?.accounts?.id) {
        reject(new Error('Google Identity Services no está disponible. Por favor, recarga la página.'));
        return;
      }

      // Re-initialize with callback to ensure it's set
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      // Use One Tap prompt - this will show a popup if user is not signed in
      window.google.accounts.id.prompt((notification: any) => {
        // Handle notification
        if (notification) {
          if (notification.isNotDisplayed()) {
            // One Tap not displayed - could be due to various reasons
            // Try to show button flow instead
            setTimeout(() => {
              reject(new Error('No se pudo mostrar el inicio de sesión de Google. Por favor, intenta de nuevo o usa el login con email.'));
            }, 100);
          } else if (notification.isSkippedMoment()) {
            // User skipped One Tap
            setTimeout(() => {
              reject(new Error('Inicio de sesión cancelado. Por favor, intenta de nuevo.'));
            }, 100);
          } else if (notification.isDismissedMoment()) {
            // User dismissed One Tap
            setTimeout(() => {
              reject(new Error('Inicio de sesión cancelado. Por favor, intenta de nuevo.'));
            }, 100);
          }
        }
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Error al inicializar Google Sign In'));
    }
  });
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
