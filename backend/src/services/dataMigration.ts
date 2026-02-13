/**
 * Data Migration Service
 * Migrate demo data from frontend constants to database for production demos
 */

import { getPool } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Migrate demo data to database
 * Creates: organization, admin user, demo client, demo operation with assets and DNSH evaluations
 * Run with: npm run db:seed (from backend directory)
 */
export async function migrateDemoData(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    logger.info('Starting demo data migration...');

    // 1. Create demo organization
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
       VALUES ('EcoInvest Demo', 'ecoinvest-demo', 'professional', 'active')
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`
    );

    let orgId: string | null = null;
    if (orgResult.rows.length > 0) {
      orgId = orgResult.rows[0].id;
      logger.info('Created demo organization');
    } else {
      const existingOrg = await client.query(
        "SELECT id FROM organizations WHERE slug = 'ecoinvest-demo'"
      );
      orgId = existingOrg.rows[0]?.id || null;
      logger.info('Using existing demo organization');
    }

    if (!orgId) {
      throw new Error('Could not get or create demo organization');
    }

    // 2. Create or get admin user
    let adminId: string;
    const adminUsers = await client.query(
      "SELECT id FROM users WHERE email = 'admin@ecoinvest.com'"
    );

    if (adminUsers.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 10);
      const insertResult = await client.query(
        `INSERT INTO users (email, password_hash, name, role, auth_provider)
         VALUES ('admin@ecoinvest.com', $1, 'Admin User', 'Admin', 'local')
         RETURNING id`,
        [passwordHash]
      );
      adminId = insertResult.rows[0].id;
      logger.info('Created admin user (password: admin123)');
    } else {
      adminId = adminUsers.rows[0].id;
      logger.info('Using existing admin user');
    }

    // 3. Associate admin with demo organization
    await client.query(
      `INSERT INTO user_organizations (user_id, organization_id, role)
       VALUES ($1, $2, 'Owner')
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [adminId, orgId]
    );
    await client.query(
      'UPDATE users SET default_organization_id = $1 WHERE id = $2',
      [orgId, adminId]
    );
    logger.info('Linked admin to demo organization');

    // 4. Check if demo operation already exists (idempotent)
    const existingOp = await client.query(
      `SELECT o.id FROM operations o
       JOIN clients c ON o.client_id = c.id
       WHERE c.name = 'EcoEnergy Iberia' AND o.name = 'Iberia Solar PV Portfolio'
       LIMIT 1`
    );
    if (existingOp.rows.length > 0) {
      logger.info('Demo operation already exists, skipping creation');
      await client.query('COMMIT');
      return;
    }

    // 5. Create demo client
    const clientResult = await client.query(
      `INSERT INTO clients (name, country, sector, description, created_by, organization_id)
       VALUES ('EcoEnergy Iberia', 'Spain', 'Renewable Energy',
         'Leading renewable energy developer in the Iberian Peninsula',
         $1, $2)
       RETURNING id`,
      [adminId, orgId]
    );
    const clientId = clientResult.rows[0].id;
    logger.info('Created demo client: EcoEnergy Iberia');

    // 6. Create demo operation (Iberia Solar PV Portfolio)
    const opResult = await client.query(
      `INSERT INTO operations (
         client_id, name, sector_nace, country, capex, deal_price,
         expected_return, risk_weighted_capital, total_aal, max_risk_band,
         sustainability_discount, risk_adjustment, status,
         substantial_contribution_id, created_by, organization_id
       )
       VALUES ($1, $2, 'D.35.11', 'Spain', 45000000, 42000000,
         8.5, 38000000, 1250000, 'Moderate',
         2.5, -1.2, 'Review',
         'MITIGATION', $3, $4)
       RETURNING id`,
      [clientId, 'Iberia Solar PV Portfolio', adminId, orgId]
    );
    const operationId = opResult.rows[0].id;
    logger.info('Created demo operation: Iberia Solar PV Portfolio');

    // 7. Grant permissions to admin
    await client.query(
      `INSERT INTO user_operation_permissions (
         user_id, operation_id, can_view, can_edit, can_review, can_approve, can_delete, granted_by
       )
       VALUES ($1, $2, true, true, true, true, true, $1)`,
      [adminId, operationId]
    );

    // 8. Create assets with attributes
    const assetsData = [
      {
        name: 'Seville PV Plant A',
        assetType: 'Solar PV',
        lat: 37.3891,
        lng: -5.9845,
        exposedValue: 15000000,
        attrs: { elevationMeters: 12, distanceToCoastKm: 65, yearBuilt: 2021, floodProtectionLevel: 50, waterDependency: 'Low', temperatureToleranceC: 45, naceCode: 'D.35.11', taxonomyActivity: '4.1', substantialContribution: 'MITIGATION', siteType: 'Greenfield', constructionYear: 2020, operationalYear: 2021, capacity: 50, capacityUnit: 'MW' },
        eval: { mitigation: 'Compliant', adaptation: 'Compliant', adaptationPre: 'Conditional', adaptationPost: 'Compliant', water: 'Compliant', circular: 'Compliant', pollution: 'Compliant', biodiversity: 'Compliant', overall: 'Compliant' }
      },
      {
        name: 'Cordoba PV Plant B',
        assetType: 'Solar PV',
        lat: 37.8882,
        lng: -4.7794,
        exposedValue: 12000000,
        attrs: { elevationMeters: 120, distanceToCoastKm: 140, yearBuilt: 2022, floodProtectionLevel: 100, waterDependency: 'Low', temperatureToleranceC: 45, naceCode: 'D.35.11', taxonomyActivity: '4.1', substantialContribution: 'MITIGATION', siteType: 'Brownfield', constructionYear: 2021, operationalYear: 2022, capacity: 40, capacityUnit: 'MW' },
        eval: { mitigation: 'Compliant', adaptation: 'Non-Compliant', adaptationPre: 'Non-Compliant', adaptationRiskBand: 'High', water: 'Conditional', circular: 'Compliant', pollution: 'Compliant', biodiversity: 'Compliant', overall: 'Non-Compliant', overallNotes: 'High climate risk identified. Adaptation measures required.' }
      },
      {
        name: 'Malaga Substation',
        assetType: 'Electricity Grid',
        lat: 36.7212,
        lng: -4.4214,
        exposedValue: 5000000,
        attrs: { elevationMeters: 5, distanceToCoastKm: 0.5, yearBuilt: 2015, floodProtectionLevel: 20, waterDependency: 'Low', temperatureToleranceC: 50, naceCode: 'D.35.12', taxonomyActivity: '4.2', siteType: 'Brownfield', constructionYear: 2014, operationalYear: 2015, capacity: 220, capacityUnit: 'kV' },
        eval: { mitigation: 'Compliant', adaptation: 'Conditional', adaptationPre: 'Conditional', adaptationRiskBand: 'Moderate', water: 'Compliant', circular: 'Compliant', pollution: 'Compliant', biodiversity: 'Compliant', overall: 'Conditional' }
      }
    ];

    for (const a of assetsData) {
      const assetResult = await client.query(
        `INSERT INTO assets (operation_id, name, asset_type, lat, lng, exposed_value)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [operationId, a.name, a.assetType, a.lat, a.lng, a.exposedValue]
      );
      const assetId = assetResult.rows[0].id;

      await client.query(
        `INSERT INTO asset_attributes (
           asset_id, elevation_meters, distance_to_coast_km, year_built,
           flood_protection_level, water_dependency, temperature_tolerance_c,
           nace_code, taxonomy_activity, substantial_contribution, site_type,
           construction_year, operational_year, capacity, capacity_unit
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          assetId, a.attrs.elevationMeters, a.attrs.distanceToCoastKm, a.attrs.yearBuilt,
          a.attrs.floodProtectionLevel, a.attrs.waterDependency, a.attrs.temperatureToleranceC,
          a.attrs.naceCode, a.attrs.taxonomyActivity, a.attrs.substantialContribution, a.attrs.siteType,
          a.attrs.constructionYear, a.attrs.operationalYear, a.attrs.capacity, a.attrs.capacityUnit
        ]
      );

      const e = a.eval;
      await client.query(
        `INSERT INTO dnsh_evaluations (
           asset_id, evaluator_id,
           mitigation_status, adaptation_status, adaptation_status_pre_measures, adaptation_status_post_measures,
           adaptation_risk_band, water_status, circular_status, pollution_status, biodiversity_status,
           overall_status, overall_notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          assetId, adminId,
          e.mitigation, e.adaptation, e.adaptationPre || null, e.adaptationPost || null,
          e.adaptationRiskBand || null, e.water, e.circular, e.pollution, e.biodiversity,
          e.overall, e.overallNotes || null
        ]
      );
    }
    logger.info('Created 3 demo assets with DNSH evaluations');

    await client.query('COMMIT');
    logger.info('Demo data migration completed successfully');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Data migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
