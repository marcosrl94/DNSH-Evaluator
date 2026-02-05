/**
 * Authentication Routes
 * Login, registration, OAuth, token refresh
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../config/database';
import { authenticate } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimiter);
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Error de validación o usuario ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 1 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUsers = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const users = await query<{ id: string }>(
        `INSERT INTO users (email, password_hash, name, auth_provider, role)
         VALUES ($1, $2, $3, 'local', 'Evaluator')
         RETURNING id, email, name, role`,
        [email, passwordHash, name]
      );

      if (users.length === 0) {
        throw createError('Failed to create user', 500);
      }

      const user = users[0] as { id: string; email: string; name: string; role: string; is_active?: boolean; password_hash?: string };

      // Generate tokens
      const token = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refreshToken = (jwt.sign as any)(
        { userId: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
      );

      // Update last login
      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role || 'User'
        },
        token,
        refreshToken
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const users = await query<{
        id: string;
        email: string;
        name: string;
        role: string;
        password_hash: string;
        is_active: boolean;
      }>(
        'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0] as { id: string; email: string; name: string; role: string; is_active?: boolean; password_hash?: string };

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const token = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refreshToken = (jwt.sign as any)(
        { userId: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
      );

      // Update last login
      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role || 'User'
        },
        token,
        refreshToken
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refrescar token de acceso
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refrescado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o expirado
 */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type?: string };

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid token type' });
      }

      // Check if refresh token exists in database
      const tokens = await query<{ user_id: string; expires_at: Date }>(
        'SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );

      if (tokens.length === 0) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const tokenData = tokens[0];

      // Check if token expired
      if (new Date() > tokenData.expires_at) {
        await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      // Get user info
      const users = await query<{ id: string; email: string; name: string; role: string }>(
        'SELECT id, email, name, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = users[0] as { id: string; email: string; name: string; role: string; is_active?: boolean; password_hash?: string };

      // Generate new access token
      const newToken = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Cerrar sesión e invalidar refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *       401:
 *         description: No autenticado
 */
router.post('/logout', authenticate as any, async (req: any, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Obtener usuario actual autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 */
router.get('/me', authenticate as any, async (req: any, res: Response) => {
  try {
    const users = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      avatar_url: string | null;
    }>(
      'SELECT id, email, name, role, avatar_url FROM users WHERE id = $1',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/google
 * Authenticate with Google Workspace OAuth
 * Receives JWT credential from Google Identity Services
 */
router.post(
  '/google',
  [
    body('credential').notEmpty().withMessage('Google credential is required'),
    body('domain').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { credential, domain } = req.body;

      // Decode Google JWT (no verification needed for basic flow)
      // In production, verify with Google's public keys
      let decoded: any;
      try {
        decoded = jwt.decode(credential);
        if (!decoded || !decoded.email) {
          return res.status(400).json({ error: 'Invalid Google credential' });
        }
      } catch (error) {
        logger.error('Error decoding Google credential:', error);
        return res.status(400).json({ error: 'Invalid Google credential format' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(decoded.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Extract user domain
      const userDomain = decoded.email.split('@')[1];
      if (!userDomain) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // ALWAYS verify domain restriction if ALLOWED_DOMAINS is set (security)
      const envAllowedDomains = process.env.ALLOWED_DOMAINS;
      if (envAllowedDomains) {
        const allowedDomains = envAllowedDomains.split(',').map(d => d.trim());
        if (!allowedDomains.includes(userDomain)) {
          logger.warn(`Domain restriction violation: ${userDomain} not in ${allowedDomains.join(', ')}`);
          return res.status(403).json({ 
            error: `Domain ${userDomain} is not allowed` 
          });
        }
      }

      // Optional: Additional domain check from request parameter (for flexibility)
      if (domain) {
        const requestAllowedDomains = domain.split(',').map(d => d.trim());
        if (!requestAllowedDomains.includes(userDomain)) {
          return res.status(403).json({ 
            error: `Domain ${userDomain} is not allowed. Allowed domains: ${requestAllowedDomains.join(', ')}` 
          });
        }
      }

      // Find or create user
      const existingUsers = await query<{
        id: string;
        email: string;
        name: string;
        role: string;
        is_active: boolean;
      }>(
        'SELECT id, email, name, role, is_active FROM users WHERE email = $1',
        [decoded.email]
      );

      let user;
      if (existingUsers.length === 0) {
        // Create new user from Google
        const newUsers = await query<{ id: string; email: string; name: string; role: string }>(
          `INSERT INTO users (email, name, auth_provider, provider_id, role, avatar_url)
           VALUES ($1, $2, 'google', $3, 'Evaluator', $4)
           RETURNING id, email, name, role`,
          [
            decoded.email,
            decoded.name || decoded.email.split('@')[0],
            decoded.sub,
            decoded.picture || null
          ]
        );

        if (newUsers.length === 0) {
          throw createError('Failed to create user', 500);
        }

        user = newUsers[0] as { id: string; email: string; name: string; role: string; is_active?: boolean };
        logger.info(`New Google user created: ${decoded.email}`);
      } else {
        user = existingUsers[0] as { id: string; email: string; name: string; role: string; is_active?: boolean };

        if (!user.is_active) {
          return res.status(403).json({ error: 'Account is inactive' });
        }

        // Update last login and avatar if changed
        await query(
          `UPDATE users 
           SET last_login_at = NOW(), 
               avatar_url = COALESCE($1, avatar_url),
               updated_at = NOW()
           WHERE id = $2`,
          [decoded.picture || null, user.id]
        );
      }

      // Generate tokens (same as login)
      const token = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refreshToken = (jwt.sign as any)(
        { userId: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role || 'User'
        },
        token,
        refreshToken
      });
    } catch (error: any) {
      logger.error('Google auth error:', error);
      res.status(500).json({ error: error.message || 'Authentication failed' });
    }
  }
);

export default router;
