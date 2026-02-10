/**
 * Swagger/OpenAPI Configuration
 * API Documentation setup
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response } from 'express';

// Type-safe imports with fallback
let swaggerJsdocModule: any;
let swaggerUiModule: any;

try {
  swaggerJsdocModule = require('swagger-jsdoc');
  swaggerUiModule = require('swagger-ui-express');
} catch (error) {
  console.warn('Swagger modules not installed. Run: npm install swagger-ui-express swagger-jsdoc');
}

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DNSH Evaluator API',
      version: '1.0.0',
      description: 'API para evaluación colaborativa DNSH (Do No Significant Harm) según Taxonomía UE',
      contact: {
        name: 'EcoInvest',
        email: 'support@ecoinvest.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.API_PUBLIC_URL || 'https://dnsh-evaluator-production.up.railway.app',
        description: 'Backend (Railway)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido del endpoint /auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['Admin', 'Manager', 'Analyst', 'Evaluator', 'Viewer'] 
            },
            createdAt: { type: 'string', format: 'date-time' },
            lastLoginAt: { type: 'string', format: 'date-time' }
          }
        },
        Operation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            clientId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            sectorNACE: { type: 'string' },
            country: { type: 'string' },
            capex: { type: 'number' },
            dealPrice: { type: 'number' },
            status: {
              type: 'string',
              enum: ['Draft', 'Review', 'Compliant', 'Non-Compliant']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y autorización' },
      { name: 'Users', description: 'Gestión de usuarios' },
      { name: 'Clients', description: 'Gestión de clientes' },
      { name: 'Operations', description: 'Gestión de operaciones/deals' },
      { name: 'Assets', description: 'Gestión de assets' },
      { name: 'Evaluations', description: 'Evaluaciones DNSH' },
      { name: 'Evidence', description: 'Evidencias y documentos' },
      { name: 'Comments', description: 'Comentarios y colaboración' },
      { name: 'Tasks', description: 'Tareas y asignaciones' },
      { name: 'Notifications', description: 'Notificaciones' }
    ]
  },
  apis: [
    './src/routes/*.routes.ts',
    './src/index.ts'
  ]
};

const swaggerSpec = swaggerJsdocModule ? swaggerJsdocModule(options) : {};

export const setupSwagger = (app: Express) => {
  try {
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'DNSH Evaluator API Documentation'
    }));
    
    // JSON endpoint for swagger spec
    app.get('/api-docs.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    console.log('✅ Swagger documentation available at /api-docs');
  } catch (error) {
    console.warn('⚠️  Swagger setup failed (swagger packages may not be installed):', error);
  }
};

export default swaggerSpec;
