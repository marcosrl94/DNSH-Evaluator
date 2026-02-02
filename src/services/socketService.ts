/**
 * Socket.IO Service
 * Real-time collaboration and notifications
 * Optional - gracefully handles missing socket.io-client
 * Uses global window object to avoid build-time imports
 */

import { logger } from '../../utils/logger';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Declare global Socket.IO types
declare global {
  interface Window {
    io?: any;
    socketIOClient?: any;
  }
}

class SocketService {
  private socket: any = null;
  private token: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private ioLoader: Promise<any> | null = null;

  private async loadSocketIO(): Promise<any> {
    if (this.ioLoader) {
      return this.ioLoader;
    }

    // Only try to load if USE_API is enabled
    const USE_API = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_API_URL;
    if (!USE_API) {
      return null;
    }

    this.ioLoader = new Promise(async (resolve) => {
      try {
        // Try to load socket.io-client dynamically
        // Use eval to avoid static analysis by bundler
        const loadModule = new Function('return import("socket.io-client")');
        const module = await loadModule();
        resolve(module);
      } catch (error) {
        logger.warn('socket.io-client not available, Socket.IO features disabled');
        resolve(null);
      }
    });

    return this.ioLoader;
  }

  async connect(token: string) {
    const ioModule = await this.loadSocketIO();
    if (!ioModule || !ioModule.io) {
      logger.warn('Socket.IO client not available');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.token = token;
    this.socket = ioModule.io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      logger.info('Socket.IO connected');
      // Request user info to populate online users list
      this.socket?.emit('users:get-list');
    });

    this.socket.on('disconnect', () => {
      logger.info('Socket.IO disconnected');
    });

    this.socket.on('error', (error: any) => {
      logger.error('Socket.IO error:', error);
    });
  }

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
    if (this.socket) {
      this.socket.emit('join:operation', operationId);
    }
  }

  leaveOperation(operationId: string) {
    if (this.socket) {
      this.socket.emit('leave:operation', operationId);
    }
  }

  joinAsset(assetId: string) {
    if (this.socket) {
      this.socket.emit('join:asset', assetId);
    }
  }

  leaveAsset(assetId: string) {
    if (this.socket) {
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
}

export const socketService = new SocketService();
