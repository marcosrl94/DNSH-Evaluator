/**
 * Database Migration Script
 * Run migrations and seed initial data
 */

import { initDatabase, closeDatabase } from '../config/database';
import { migrateDemoData } from '../services/dataMigration';
import { logger } from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Initializing database...');
    await initDatabase();

    logger.info('Running data migration...');
    await migrateDemoData();

    logger.info('Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runMigrations();
