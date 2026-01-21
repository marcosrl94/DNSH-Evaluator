
import { User, UserRole, UserPermissions } from '../types';

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

  // Check if user already exists
  const existingUser = MOCK_USERS.find(u => u.email.toLowerCase() === data.email.toLowerCase());
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

  // Return user without password
  const { passwordHash, ...userWithoutPassword } = newUser;
  return userWithoutPassword as User;
};

// Login
export const login = async (email: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  
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
