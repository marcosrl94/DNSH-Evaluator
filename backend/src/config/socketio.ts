/**
 * Socket.IO Configuration
 * Real-time collaboration and notifications
 */

import { Server, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
}

/**
 * Setup Socket.IO event handlers
 */
export function setupSocketIO(io: Server): void {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = await verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Store online users
  const onlineUsers = new Map<string, { userId: string; socketId: string; lastSeen: Date; currentOperationId?: string; currentAssetId?: string }>();

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`User ${userId} connected via Socket.IO`);

    // Add user to online users
    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      lastSeen: new Date()
    });

    // Broadcast user online
    socket.broadcast.emit('user:online', { userId });

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Send current online users list to newly connected user
    socket.emit('users:list', {
      users: Array.from(onlineUsers.values()).map(u => ({
        id: u.userId,
        socketId: u.socketId,
        lastSeen: u.lastSeen,
        currentOperationId: u.currentOperationId,
        currentAssetId: u.currentAssetId
      }))
    });

    // Update user presence
    socket.on('user:update-presence', (data: { currentOperationId?: string; currentAssetId?: string }) => {
      const user = onlineUsers.get(userId);
      if (user) {
        user.currentOperationId = data.currentOperationId;
        user.currentAssetId = data.currentAssetId;
        user.lastSeen = new Date();
        onlineUsers.set(userId, user);
        
        // Broadcast update
        socket.broadcast.emit('user:update', {
          user: {
            id: userId,
            currentOperationId: data.currentOperationId,
            currentAssetId: data.currentAssetId,
            lastSeen: user.lastSeen
          }
        });
      }
    });

    // Get online users list
    socket.on('users:get-list', () => {
      socket.emit('users:list', {
        users: Array.from(onlineUsers.values()).map(u => ({
          id: u.userId,
          socketId: u.socketId,
          lastSeen: u.lastSeen,
          currentOperationId: u.currentOperationId,
          currentAssetId: u.currentAssetId
        }))
      });
    });

    // Join operation rooms when user accesses an operation
    socket.on('join:operation', (operationId: string) => {
      socket.join(`operation:${operationId}`);
      console.log(`User ${userId} joined operation:${operationId}`);
      
      // Update presence
      const user = onlineUsers.get(userId);
      if (user) {
        user.currentOperationId = operationId;
        user.lastSeen = new Date();
        onlineUsers.set(userId, user);
        
        socket.broadcast.emit('user:update', {
          user: {
            id: userId,
            currentOperationId: operationId,
            lastSeen: user.lastSeen
          }
        });
      }
    });

    socket.on('leave:operation', (operationId: string) => {
      socket.leave(`operation:${operationId}`);
      console.log(`User ${userId} left operation:${operationId}`);
      
      // Update presence
      const user = onlineUsers.get(userId);
      if (user) {
        user.currentOperationId = undefined;
        user.lastSeen = new Date();
        onlineUsers.set(userId, user);
      }
    });

    // Join asset room for real-time collaboration
    socket.on('join:asset', (assetId: string) => {
      socket.join(`asset:${assetId}`);
      console.log(`User ${userId} joined asset:${assetId}`);
      
      // Update presence
      const user = onlineUsers.get(userId);
      if (user) {
        user.currentAssetId = assetId;
        user.lastSeen = new Date();
        onlineUsers.set(userId, user);
        
        socket.broadcast.emit('user:update', {
          user: {
            id: userId,
            currentAssetId: assetId,
            lastSeen: user.lastSeen
          }
        });
      }
    });

    socket.on('leave:asset', (assetId: string) => {
      socket.leave(`asset:${assetId}`);
      console.log(`User ${userId} left asset:${assetId}`);
      
      // Update presence
      const user = onlineUsers.get(userId);
      if (user) {
        user.currentAssetId = undefined;
        user.lastSeen = new Date();
        onlineUsers.set(userId, user);
      }
    });

    // Broadcast editing status
    socket.on('editing:start', (data: { assetId: string, field: string }) => {
      socket.to(`asset:${data.assetId}`).emit('editing:started', {
        userId,
        assetId: data.assetId,
        field: data.field
      });
    });

    socket.on('editing:stop', (data: { assetId: string, field: string }) => {
      socket.to(`asset:${data.assetId}`).emit('editing:stopped', {
        userId,
        assetId: data.assetId,
        field: data.field
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      onlineUsers.delete(userId);
      socket.broadcast.emit('user:offline', { userId });
    });
  });
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * Emit event to operation room
 */
export function emitToOperation(operationId: string, event: string, data: any): void {
  if (ioInstance) {
    ioInstance.to(`operation:${operationId}`).emit(event, data);
  }
}

/**
 * Emit event to asset room
 */
export function emitToAsset(assetId: string, event: string, data: any): void {
  if (ioInstance) {
    ioInstance.to(`asset:${assetId}`).emit(event, data);
  }
}

/**
 * Emit notification to user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
}
