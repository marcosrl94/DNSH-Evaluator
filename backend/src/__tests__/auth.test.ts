/**
 * Authentication Tests
 */

import request from 'supertest';
import { app } from '../index';

// Skip tests if database is not available
const skipIfNoDB = process.env.SKIP_DB_TESTS === 'true' ? describe.skip : describe;

skipIfNoDB('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test1234',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'short',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Test1234',
          name: 'Login User'
        });

      // Then try to login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test1234'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
