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

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected via Socket.IO`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Join operation rooms when user accesses an operation
    socket.on('join:operation', (operationId: string) => {
      socket.join(`operation:${operationId}`);
      console.log(`User ${userId} joined operation:${operationId}`);
    });

    socket.on('leave:operation', (operationId: string) => {
      socket.leave(`operation:${operationId}`);
      console.log(`User ${userId} left operation:${operationId}`);
    });

    // Join asset room for real-time collaboration
    socket.on('join:asset', (assetId: string) => {
      socket.join(`asset:${assetId}`);
      console.log(`User ${userId} joined asset:${assetId}`);
    });

    socket.on('leave:asset', (assetId: string) => {
      socket.leave(`asset:${assetId}`);
      console.log(`User ${userId} left asset:${assetId}`);
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
