/**
 * Database Configuration
 * PostgreSQL connection and initialization
 * Optimized for Railway (DATABASE_URL) and local dev
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
let pool: Pool | null = null;

/**
 * Build pool config for PostgreSQL
 * - Railway: uses DATABASE_URL (internal or public); SSL auto-handled
 * - Local: DATABASE_URL or DATABASE_HOST/PORT/etc
 */
function buildPoolConfig(): PoolConfig {
  let connectionString = process.env.DATABASE_URL;
  // railway run desde local: postgres.railway.internal no resuelve; usar DATABASE_PUBLIC_URL si existe
  if (connectionString?.includes('railway.internal') && process.env.DATABASE_PUBLIC_URL) {
    connectionString = process.env.DATABASE_PUBLIC_URL;
  }
  const isRailway = connectionString?.includes('railway.internal') || connectionString?.includes('.rlwy.net');

  const baseConfig: PoolConfig = {
    max: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Prefer DATABASE_URL (Railway, Heroku, etc.)
  if (connectionString) {
    return {
      ...baseConfig,
      connectionString,
      // Railway public URL / external: enable SSL with self-signed cert tolerance
      ...(isRailway && connectionString.includes('.rlwy.net') && {
        ssl: { rejectUnauthorized: false },
      }),
    };
  }

  // Fallback: individual params (local dev)
  return {
    ...baseConfig,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'ecoinvest_dnsh_evaluator',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
  };
}

/**
 * Initialize database connection pool
 */
export async function initDatabase(): Promise<void> {
  const config = buildPoolConfig();
  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Test connection
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection test:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Get database pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}
