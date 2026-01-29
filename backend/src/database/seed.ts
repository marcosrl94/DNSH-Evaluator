/**
 * Database Seed Script
 * Populate database with initial/default data
 */

import { initDatabase, closeDatabase } from '../config/database';
import { migrateDemoData } from '../services/dataMigration';
import { logger } from '../utils/logger';

async function seedDatabase() {
  try {
    logger.info('Initializing database...');
    await initDatabase();

    logger.info('Seeding demo data...');
    await migrateDemoData();

    logger.info('Database seeded successfully!');
    process.exit(0);
  } catch (error: any) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

seedDatabase();
