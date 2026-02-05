/**
 * Data Migration Service
 * Migrate data from frontend localStorage/demo data to database
 */

import { getPool } from '../config/database';
import { logger } from '../utils/logger';

// Import demo data (will need to be adapted based on actual structure)
// For now, we'll create a migration that can be run manually

/**
 * Migrate demo data to database
 * This should be run once to populate the database with initial data
 */
export async function migrateDemoData(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    logger.info('Starting data migration...');

    // Create demo admin user if doesn't exist
    const adminUsers = await client.query(
      "SELECT id FROM users WHERE email = 'admin@ecoinvest.com'"
    );

    if (adminUsers.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, auth_provider)
         VALUES ('admin@ecoinvest.com', $1, 'Admin User', 'Admin', 'local')
         RETURNING id`,
        [passwordHash]
      );
      logger.info('Created admin user');
    }

    // Note: DEMO_OPERATIONS and DEMO_CLIENTS would need to be imported
    // from the frontend constants. For now, this is a template.
    // You can manually insert data or create a separate migration script.

    await client.query('COMMIT');
    logger.info('Data migration completed successfully');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Data migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
