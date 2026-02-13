/**
 * Run schema migrations (creates tables, adds organization_id, etc.)
 * Use before db:seed when setting up a fresh database
 */

import { initDatabase, closeDatabase } from '../config/database';
import { runMigrations } from './migrations';
import { logger } from '../utils/logger';

async function setupSchema() {
  try {
    logger.info('Initializing database...');
    await initDatabase();

    logger.info('Running schema migrations...');
    await runMigrations();

    logger.info('Schema setup completed successfully!');
    process.exit(0);
  } catch (error: any) {
    logger.error('Schema setup failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

setupSchema();
