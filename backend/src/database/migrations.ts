/**
 * Database Migrations Manager
 * Automatically runs migrations on startup
 */

import { query } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

interface Migration {
  id: string;
  name: string;
  filename: string;
}

const MIGRATIONS_DIR = join(__dirname, '../../database/migrations');

/**
 * Get all migration files
 */
function getMigrationFiles(): string[] {
  try {
    const fs = require('fs');
    const files = fs.readdirSync(MIGRATIONS_DIR);
    return files
      .filter((file: string) => file.endsWith('.sql'))
      .sort();
  } catch (error) {
    logger.warn('Migrations directory not found, skipping migrations');
    return [];
  }
}

/**
 * Create migrations table if it doesn't exist
 */
async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

/**
 * Get executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  try {
    const rows = await query<{ name: string }>('SELECT name FROM migrations ORDER BY name');
    return rows.map(row => row.name);
  } catch (error) {
    // Table doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Record migration execution
 */
async function recordMigration(name: string): Promise<void> {
  await query('INSERT INTO migrations (name) VALUES ($1)', [name]);
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    await ensureMigrationsTable();
    const executed = await getExecutedMigrations();
    const files = getMigrationFiles();

    const pending = files.filter(file => !executed.includes(file));

    if (pending.length === 0) {
      logger.info('✅ No pending migrations');
      return;
    }

    logger.info(`📦 Running ${pending.length} migration(s)...`);

    for (const file of pending) {
      try {
        const filePath = join(MIGRATIONS_DIR, file);
        const sql = readFileSync(filePath, 'utf-8');
        
        // Execute migration in a transaction
        await query('BEGIN');
        try {
          await query(sql);
          await recordMigration(file);
          await query('COMMIT');
          logger.info(`✅ Migration executed: ${file}`);
        } catch (error) {
          await query('ROLLBACK');
          throw error;
        }
      } catch (error: any) {
        logger.error(`❌ Migration failed: ${file}`, error);
        throw error;
      }
    }

    logger.info('✅ All migrations completed');
  } catch (error: any) {
    logger.error('Migration error:', error);
    // Don't throw - allow server to start even if migrations fail
    // In production, you might want to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}
