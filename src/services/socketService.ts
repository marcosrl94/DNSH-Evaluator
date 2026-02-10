/**
 * Socket.IO Service
 * Real-time collaboration and notifications
 */

import { io } from 'socket.io-client';
import { logger } from '../../utils/logger';

const envSocketUrl = (import.meta.env.VITE_SOCKET_URL || '').trim();
const RAILWAY_SOCKET = 'https://dnsh-evaluator-production.up.railway.app';

function getSocketUrl(): string {
  let url = envSocketUrl?.trim() || RAILWAY_SOCKET;
  if (typeof window !== 'undefined') {
    const origin = (window.location?.origin || '').replace(/\/$/, '');
    // En Vercel: siempre usar Railway
    if (origin.includes('vercel.app')) return RAILWAY_SOCKET;
    if (url === origin || url.startsWith(origin + '/')) return RAILWAY_SOCKET;
  }
  return url.replace(/\/$/, '');
}

class SocketService {
  private socket: ReturnType<typeof io> | null = null;
  private token: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /** Conectar cuando: vercel.app, o API activa, o hay VITE_SOCKET_URL */
  private shouldConnect(): boolean {
    if (typeof window !== 'undefined' && window.location?.origin?.includes('vercel.app')) {
      return true;
    }
    return (
      import.meta.env.VITE_USE_API === 'true' ||
      !!import.meta.env.VITE_API_URL ||
      !!import.meta.env.VITE_SOCKET_URL
    );
  }

  async connect(token: string) {
    if (!this.shouldConnect()) {
      logger.info('Socket.IO skipped (API mode disabled)');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.token = token;
    const socketUrl = getSocketUrl();
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    this.socket.on('connect_error', (err: Error) => {
      logger.warn('Socket.IO connect_error:', err.message);
    });

    this.socket.on('connect', () => {
      logger.info('Socket.IO connected', socketUrl);
      // Request user info to populate online users list
      this.socket?.emit('users:get-list');
      // Rejoin rooms if we were in any
      if (this.lastOperationId) {
        this.joinOperation(this.lastOperationId);
      }
      if (this.lastAssetId) {
        this.joinAsset(this.lastAssetId);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.info('Socket.IO disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      logger.info(`Socket.IO reconnected after ${attemptNumber} attempts`);
      // Request user list again after reconnection
      this.socket?.emit('users:get-list');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      logger.info(`Socket.IO reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error: any) => {
      logger.warn('Socket.IO reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      logger.error('Socket.IO reconnection failed');
    });

    this.socket.on('error', (error: any) => {
      logger.error('Socket.IO error:', error);
    });
  }

  private lastOperationId?: string;
  private lastAssetId?: string;

  updatePresence(operationId?: string, assetId?: string) {
    if (this.socket?.connected) {
      this.socket.emit('user:update-presence', {
        currentOperationId: operationId,
        currentAssetId: assetId
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinOperation(operationId: string) {
    this.lastOperationId = operationId;
    if (this.socket?.connected) {
      this.socket.emit('join:operation', operationId);
    }
  }

  leaveOperation(operationId: string) {
    if (operationId === this.lastOperationId) {
      this.lastOperationId = undefined;
    }
    if (this.socket?.connected) {
      this.socket.emit('leave:operation', operationId);
    }
  }

  joinAsset(assetId: string) {
    this.lastAssetId = assetId;
    if (this.socket?.connected) {
      this.socket.emit('join:asset', assetId);
    }
  }

  leaveAsset(assetId: string) {
    if (assetId === this.lastAssetId) {
      this.lastAssetId = undefined;
    }
    if (this.socket?.connected) {
      this.socket.emit('leave:asset', assetId);
    }
  }

  onOperationUpdated(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('operation:updated', callback);
    if (!this.listeners.has('operation:updated')) {
      this.listeners.set('operation:updated', new Set());
    }
    this.listeners.get('operation:updated')!.add(callback);
    
    return () => {
      this.socket?.off('operation:updated', callback);
      this.listeners.get('operation:updated')?.delete(callback);
    };
  }

  onAssetUpdated(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('asset:updated', callback);
    if (!this.listeners.has('asset:updated')) {
      this.listeners.set('asset:updated', new Set());
    }
    this.listeners.get('asset:updated')!.add(callback);
    
    return () => {
      this.socket?.off('asset:updated', callback);
      this.listeners.get('asset:updated')?.delete(callback);
    };
  }

  onEvaluationUpdated(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('evaluation:updated', callback);
    if (!this.listeners.has('evaluation:updated')) {
      this.listeners.set('evaluation:updated', new Set());
    }
    this.listeners.get('evaluation:updated')!.add(callback);
    
    return () => {
      this.socket?.off('evaluation:updated', callback);
      this.listeners.get('evaluation:updated')?.delete(callback);
    };
  }

  onEvidenceUploaded(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('evidence:uploaded', callback);
    if (!this.listeners.has('evidence:uploaded')) {
      this.listeners.set('evidence:uploaded', new Set());
    }
    this.listeners.get('evidence:uploaded')!.add(callback);
    
    return () => {
      this.socket?.off('evidence:uploaded', callback);
      this.listeners.get('evidence:uploaded')?.delete(callback);
    };
  }

  onCommentCreated(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('comment:created', callback);
    if (!this.listeners.has('comment:created')) {
      this.listeners.set('comment:created', new Set());
    }
    this.listeners.get('comment:created')!.add(callback);
    
    return () => {
      this.socket?.off('comment:created', callback);
      this.listeners.get('comment:created')?.delete(callback);
    };
  }

  onTaskAssigned(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('task:assigned', callback);
    if (!this.listeners.has('task:assigned')) {
      this.listeners.set('task:assigned', new Set());
    }
    this.listeners.get('task:assigned')!.add(callback);
    
    return () => {
      this.socket?.off('task:assigned', callback);
      this.listeners.get('task:assigned')?.delete(callback);
    };
  }

  onNotificationReceived(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('notification:received', callback);
    if (!this.listeners.has('notification:received')) {
      this.listeners.set('notification:received', new Set());
    }
    this.listeners.get('notification:received')!.add(callback);
    
    return () => {
      this.socket?.off('notification:received', callback);
      this.listeners.get('notification:received')?.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /** Socket interno (para OnlineUsersContext, etc.) */
  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
