/**
 * DNSH Evaluator Backend API
 * Main entry point for the backend server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Initialize Sentry (optional, only if SENTRY_DSN is set)
import { initSentry } from './config/sentry';
initSentry();

// Import routes
import authRoutes from './routes/auth.routes';
import clientsRoutes from './routes/clients.routes';
import operationsRoutes from './routes/operations.routes';
import assetsRoutes from './routes/assets.routes';
import evaluationsRoutes from './routes/evaluations.routes';
import evidenceRoutes from './routes/evidence.routes';
import commentsRoutes from './routes/comments.routes';
import tasksRoutes from './routes/tasks.routes';
import notificationsRoutes from './routes/notifications.routes';
import usersRoutes from './routes/users.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import organizationsRoutes from './routes/organizations.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';

// Import database
import { initDatabase } from './config/database';

// Import socket handlers
import { setupSocketIO } from './config/socketio';

// Import Swagger
import { setupSwagger } from './config/swagger';

// Export io for use in routes
export let ioInstance: Server;

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup Socket.IO handlers
setupSocketIO(io);
ioInstance = io;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000'].flat()
    }
  },
  crossOriginEmbedderPolicy: false
})); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', rateLimiter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseHealth();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'unavailable',
      error: 'Health check failed'
    });
  }
});

// Helper function to check database health
async function checkDatabaseHealth(): Promise<'connected' | 'unavailable'> {
  try {
    const { getPool } = await import('./config/database');
    const pool = getPool();
    await pool.query('SELECT 1');
    return 'connected';
  } catch {
    return 'unavailable';
  }
}

// Setup Swagger documentation (before API routes)
setupSwagger(app);

// API Routes
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/clients`, clientsRoutes);
app.use(`${API_PREFIX}/operations`, operationsRoutes);
app.use(`${API_PREFIX}/assets`, assetsRoutes);
app.use(`${API_PREFIX}/evaluations`, evaluationsRoutes);
app.use(`${API_PREFIX}/evidence`, evidenceRoutes);
app.use(`${API_PREFIX}/comments`, commentsRoutes);
app.use(`${API_PREFIX}/tasks`, tasksRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionsRoutes);
app.use(`${API_PREFIX}/organizations`, organizationsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database connection (non-blocking)
    try {
      await initDatabase();
      console.log('✅ Database connected');
      
      // Run migrations automatically
      const { runMigrations } = await import('./database/migrations');
      await runMigrations();
    } catch (dbError: any) {
      console.warn('⚠️  Database connection failed:', dbError.message);
      console.warn('⚠️  Server will start but database features will be unavailable');
      console.warn('⚠️  To fix: Install PostgreSQL and configure DATABASE_URL in .env');
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}${API_PREFIX}`);
      console.log(`🔌 Socket.IO ready for real-time updates`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export { app, io };
