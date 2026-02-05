/**
 * Subscriptions Routes
 * Manage subscriptions, plans, usage, and billing
 */

import { Router, Request, Response } from 'express';
import { body, validationResult, query as queryValidator } from 'express-validator';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { enforceOrganizationIsolation } from '../middleware/organizationIsolation';
import { logger } from '../utils/logger';
import {
  getCurrentUsage,
  checkLimit,
  getOrganizationSubscription,
} from '../services/subscriptionService';

const router = Router();

// All routes require authentication
router.use(authenticate as any);
router.use(enforceOrganizationIsolation);

/**
 * GET /subscriptions/plans
 * Get available subscription plans
 */
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await query(
      'SELECT plan, max_operations, max_users, max_storage_gb, max_api_calls_per_month, features FROM plan_limits ORDER BY max_operations ASC'
    );

    return res.json({ plans });
  } catch (error: any) {
    logger.error('Get plans error:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /subscriptions/current
 * Get current subscription and usage
 */
router.get('/current', async (req: any, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'No organization assigned' });
    }

    const subscription = await getOrganizationSubscription(organizationId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    return res.json(subscription);
  } catch (error: any) {
    logger.error('Get current subscription error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /subscriptions/usage
 * Get current usage metrics
 */
router.get('/usage', async (req: any, res: Response) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'No organization assigned' });
    }

    const usage = await getCurrentUsage(organizationId);
    const subscription = await getOrganizationSubscription(organizationId);

    return res.json({
      usage,
      limits: subscription?.limits,
    });
  } catch (error: any) {
    logger.error('Get usage error:', error);
    return res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * POST /subscriptions/check-limit
 * Check if an action is allowed based on plan limits
 */
router.post(
  '/check-limit',
  [
    body('limitType').isIn(['operations', 'users', 'storage', 'api_calls']),
    body('value').optional().isInt({ min: 0 }),
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const organizationId = req.organizationId;
      const { limitType, value = 1 } = req.body;

      if (!organizationId) {
        return res.status(400).json({ error: 'No organization assigned' });
      }

      const result = await checkLimit(organizationId, limitType, value);

      return res.json(result);
    } catch (error: any) {
      logger.error('Check limit error:', error);
      return res.status(500).json({ error: 'Failed to check limit' });
    }
  }
);

/**
 * GET /subscriptions/invoices
 * Get invoice history
 */
router.get(
  '/invoices',
  [
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: any, res: Response) => {
    try {
      const organizationId = req.organizationId;
      const page = parseInt(req.query.page || '1');
      const limit = parseInt(req.query.limit || '20');
      const offset = (page - 1) * limit;

      if (!organizationId) {
        return res.status(400).json({ error: 'No organization assigned' });
      }

      const invoices = await query(
        `SELECT id, amount, currency, status, due_date, paid_at, created_at, invoice_url
         FROM invoices
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      );

      const countResult = await query<{ total: string }>(
        'SELECT COUNT(*) as total FROM invoices WHERE organization_id = $1',
        [organizationId]
      );
      const total = parseInt(countResult[0].total);

      return res.json({
        invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error('Get invoices error:', error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }
);

/**
 * POST /subscriptions/upgrade
 * Upgrade subscription plan (triggers Stripe checkout)
 */
router.post(
  '/upgrade',
  [body('plan').isIn(['starter', 'professional', 'enterprise'])],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const organizationId = req.organizationId;
      const { plan } = req.body;

      if (!organizationId) {
        return res.status(400).json({ error: 'No organization assigned' });
      }

      // In production, this would create a Stripe checkout session
      // For now, return a mock checkout URL
      const checkoutUrl = process.env.STRIPE_CHECKOUT_URL || `https://checkout.stripe.com/mock-${plan}`;

      return res.json({
        checkoutUrl,
        message: 'Redirect to checkout to complete upgrade',
      });
    } catch (error: any) {
      logger.error('Upgrade subscription error:', error);
      return res.status(500).json({ error: 'Failed to initiate upgrade' });
    }
  }
);

export default router;
