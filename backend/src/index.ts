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

// CORS: Vercel (front) y Railway (back) como referencia; CORS_ORIGIN para orígenes adicionales
const defaultCorsOrigins = ['https://dnsh-evaluator.vercel.app'];
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : defaultCorsOrigins;

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Health mínimo ANTES de cualquier middleware (para que Railway vea respuesta rápido)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
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
      connectSrc: ["'self'", corsOrigins].flat()
    }
  },
  crossOriginEmbedderPolicy: false
})); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: corsOrigins,
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
// Health detallado en /health/db (el /health básico está arriba, antes de middleware)
app.get('/health/db', async (_req, res) => {
  try {
    const dbStatus = await checkDatabaseHealth();
    res.json({ status: 'ok', database: dbStatus });
  } catch {
    res.json({ status: 'ok', database: 'unavailable' });
  }
});

// Helper function to check database health (no lanza si la DB no está inicializada)
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

// Initialize database and start server (Railway inyecta PORT como string)
const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer() {
  // Escuchar primero para que Railway marque la app como "running" de inmediato
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://0.0.0.0:${PORT}${API_PREFIX}`);
    console.log(`🔌 Socket.IO ready for real-time updates`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Inicializar DB y migraciones en segundo plano (no bloquean la respuesta a Railway)
  try {
    await initDatabase();
    console.log('✅ Database connected');
    const { runMigrations } = await import('./database/migrations');
    await runMigrations();
  } catch (dbError: any) {
    console.warn('⚠️  Database connection failed:', dbError.message);
    console.warn('⚠️  Server is running but database features will be unavailable');
    console.warn('⚠️  To fix: Configure DATABASE_URL in Railway (add PostgreSQL plugin)');
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
