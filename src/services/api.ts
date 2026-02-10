/**
 * API Service
 * Centralized API client for backend communication
 * En producción las peticiones deben ir al backend (Railway), nunca al origen del front (Vercel).
 */

const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const isProd = import.meta.env.PROD;
const FALLBACK_PRODUCTION_API = 'https://dnsh-evaluator-production.up.railway.app/api/v1';

function getApiBaseUrl(): string {
  let base = envApiUrl
    ? envApiUrl
    : FALLBACK_PRODUCTION_API;
  // En producción en el navegador: nunca usar el mismo origen (evita 405 si VITE_API_URL apunta al front)
  if (typeof window !== 'undefined' && isProd) {
    const origin = window.location.origin.replace(/\/$/, '');
    const normalized = base.replace(/\/$/, '');
    const hasProtocol = /^https?:\/\//i.test(base);
    if (!hasProtocol || !normalized || normalized === origin || normalized.startsWith(origin + '/')) {
      base = FALLBACK_PRODUCTION_API;
    }
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

const API_BASE_URL = getApiBaseUrl();

interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // Response is not JSON, use default message
        }

        // Handle specific status codes
        if (response.status === 401) {
          this.setToken(null);
          // Don't redirect during login/register/auth flows
          const isAuthFlow = endpoint.includes('/auth/');
          if (!isAuthFlow && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          throw new Error('Authentication required');
        } else if (response.status === 403) {
          throw new Error('Permission denied');
        } else if (response.status === 404) {
          throw new Error('Resource not found');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }

        throw new Error(errorMessage);
      }

      // Parse JSON response
      try {
        return await response.json();
      } catch (error) {
        throw new Error('Invalid JSON response from server');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      
      // Network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se puede conectar al servidor. Verifica que el backend esté ejecutándose.');
      }
      
      if (error.message.includes('401') || error.message === 'Authentication required') {
        this.setToken(null);
        // Don't redirect during login/register flows
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ user: any; token: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async register(data: { email: string; password: string; name: string }) {
    const response = await this.request<{ user: any; token: string; refreshToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async loginWithGoogle(credential: string, domain?: string) {
    const response = await this.request<{ user: any; token: string; refreshToken: string }>(
      '/auth/google',
      {
        method: 'POST',
        body: JSON.stringify({ credential, domain }),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.request<{ token: string; user: any }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async logout(refreshToken?: string) {
    await this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    this.setToken(null);
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  async getUser(userId: string) {
    const response = await this.request<{ user: any }>(`/users/${userId}`);
    return response;
  }

  // Clients endpoints
  async getClients() {
    return this.request<{ clients: any[] }>('/clients');
  }

  async getClient(id: string) {
    return this.request<{ client: any }>(`/clients/${id}`);
  }

  async createClient(data: { name: string; country?: string; sector?: string; description?: string }) {
    return this.request<{ client: any }>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: Partial<{ name: string; country: string; sector: string; description: string }>) {
    return this.request<{ client: any }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request<{ message: string }>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Operations endpoints
  async getOperations(params?: { page?: number; limit?: number; status?: string; clientId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.clientId) queryParams.append('clientId', params.clientId);
    
    const query = queryParams.toString();
    return this.request<{ operations: any[]; pagination: any }>(
      `/operations${query ? `?${query}` : ''}`
    );
  }

  async getOperation(id: string) {
    return this.request<any>(`/operations/${id}`);
  }

  async createOperation(data: any) {
    return this.request<{ id: string; message: string }>('/operations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOperation(id: string, data: any) {
    return this.request<{ message: string }>(`/operations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOperation(id: string) {
    return this.request<{ message: string }>(`/operations/${id}`, {
      method: 'DELETE',
    });
  }

  // Assets endpoints
  async getAsset(id: string) {
    return this.request<any>(`/assets/${id}`);
  }

  async createAsset(data: any) {
    return this.request<{ id: string; message: string }>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAsset(id: string, data: any) {
    return this.request<{ message: string }>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id: string) {
    return this.request<{ message: string }>(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // Evaluations endpoints
  async getEvaluation(assetId: string) {
    return this.request<any>(`/evaluations/asset/${assetId}`);
  }

  async saveEvaluation(data: any) {
    return this.request<{ id: string; message: string }>('/evaluations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Evidence endpoints
  async uploadEvidence(file: File, metadata: {
    operationId: string;
    assetId?: string;
    name: string;
    type: string;
    description?: string;
    relatedObjective?: string;
    relatedQuestionId?: string;
    tags?: string[];
  }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('operationId', metadata.operationId);
    if (metadata.assetId) formData.append('assetId', metadata.assetId);
    formData.append('name', metadata.name);
    formData.append('type', metadata.type);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.relatedObjective) formData.append('relatedObjective', metadata.relatedObjective);
    if (metadata.relatedQuestionId) formData.append('relatedQuestionId', metadata.relatedQuestionId);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const url = `${this.baseURL}/evidence/upload`;
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: `HTTP ${response.status}: ${response.statusText}` }
      }));
      throw new Error(error.error?.message || 'Upload failed');
    }

    return await response.json();
  }

  async getEvidenceDownloadUrl(id: string) {
    return this.request<{ url: string; filename: string }>(`/evidence/${id}/download`);
  }

  async getEvidenceForOperation(operationId: string, assetId?: string) {
    const query = assetId ? `?assetId=${assetId}` : '';
    return this.request<{ evidence: any[] }>(`/evidence/operation/${operationId}${query}`);
  }

  async deleteEvidence(id: string) {
    return this.request<{ message: string }>(`/evidence/${id}`, {
      method: 'DELETE',
    });
  }

  // Comments endpoints
  async getComments(operationId: string, assetId?: string) {
    const query = assetId ? `?assetId=${assetId}` : '';
    return this.request<{ comments: any[] }>(`/comments/operation/${operationId}${query}`);
  }

  async createComment(data: {
    operationId: string;
    assetId?: string;
    questionId?: string;
    parentCommentId?: string;
    content: string;
    mentions?: string[];
    attachments?: string[];
  }) {
    return this.request<{ comment: any }>('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resolveComment(id: string) {
    return this.request<{ message: string }>(`/comments/${id}/resolve`, {
      method: 'PUT',
    });
  }

  async deleteComment(id: string) {
    return this.request<{ message: string }>(`/comments/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks endpoints
  async getTasks(params?: { assignedTo?: string; operationId?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
    if (params?.operationId) queryParams.append('operationId', params.operationId);
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    return this.request<{ tasks: any[] }>(`/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(data: any) {
    return this.request<{ id: string; message: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request<{ message: string }>(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteTask(id: string) {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Notifications endpoints
  async getNotifications(unreadOnly?: boolean, limit?: number) {
    const queryParams = new URLSearchParams();
    if (unreadOnly) queryParams.append('unreadOnly', 'true');
    if (limit) queryParams.append('limit', limit.toString());
    
    const query = queryParams.toString();
    return this.request<{ notifications: any[]; unreadCount: number }>(
      `/notifications${query ? `?${query}` : ''}`
    );
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // Subscriptions endpoints
  async getPlans() {
    return this.request<{ plans: any[] }>('/subscriptions/plans');
  }

  async getCurrentSubscription() {
    return this.request<any>('/subscriptions/current');
  }

  async getUsage() {
    return this.request<{ usage: any; limits: any }>('/subscriptions/usage');
  }

  async checkLimit(limitType: 'operations' | 'users' | 'storage' | 'api_calls', value?: number) {
    return this.request<{ allowed: boolean; reason?: string; current?: number; limit?: number }>(
      '/subscriptions/check-limit',
      {
        method: 'POST',
        body: JSON.stringify({ limitType, value }),
      }
    );
  }

  async getInvoices(page?: number, limit?: number) {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    
    const query = queryParams.toString();
    return this.request<{ invoices: any[]; pagination: any }>(
      `/subscriptions/invoices${query ? `?${query}` : ''}`
    );
  }

  async upgradeSubscription(plan: 'starter' | 'professional' | 'enterprise') {
    return this.request<{ checkoutUrl: string; message: string }>('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  // Organizations endpoints
  async getCurrentOrganization() {
    return this.request<{ organization: any; members: any[] }>('/organizations/current');
  }

  async createOrganization(data: { name: string; slug?: string; domain?: string }) {
    return this.request<{ id: string; slug: string; message: string }>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrganization(id: string, data: {
    name?: string;
    domain?: string;
    logoUrl?: string;
    settings?: Record<string, any>;
  }) {
    return this.request<{ message: string }>(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addOrganizationMember(organizationId: string, userId: string, role?: 'Admin' | 'Member' | 'Viewer') {
    return this.request<{ message: string }>(`/organizations/${organizationId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  }

  async removeOrganizationMember(organizationId: string, userId: string) {
    return this.request<{ message: string }>(`/organizations/${organizationId}/members/${userId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
