-- ============================================
-- Migration: Add Organizations and Subscriptions
-- For multi-tenancy and commercial features
-- ============================================

-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    domain VARCHAR(255), -- Allowed domain for SSO
    logo_url TEXT,
    settings JSONB DEFAULT '{}', -- Custom settings per organization
    subscription_plan VARCHAR(50) DEFAULT 'free', -- 'free', 'starter', 'professional', 'enterprise'
    subscription_status VARCHAR(50) DEFAULT 'active', -- 'active', 'trial', 'suspended', 'cancelled'
    trial_ends_at TIMESTAMP,
    subscription_starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);

-- User-Organization relationships
CREATE TABLE IF NOT EXISTS user_organizations (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Member', -- 'Owner', 'Admin', 'Member', 'Viewer'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL, -- 'free', 'starter', 'professional', 'enterprise'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'trial', 'suspended', 'cancelled', 'expired'
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    stripe_invoice_id VARCHAR(255),
    invoice_url TEXT,
    invoice_pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Usage Metrics (for tracking limits)
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'operations', 'users', 'storage_bytes', 'api_calls'
    metric_value DECIMAL(15, 2) NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_metrics_org ON usage_metrics(organization_id);
CREATE INDEX idx_usage_metrics_type ON usage_metrics(metric_type);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(period_start, period_end);

-- Plan Limits Configuration
CREATE TABLE IF NOT EXISTS plan_limits (
    plan VARCHAR(50) PRIMARY KEY,
    max_operations INTEGER DEFAULT 0, -- 0 = unlimited
    max_users INTEGER DEFAULT 0,
    max_storage_gb INTEGER DEFAULT 0,
    max_api_calls_per_month INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}', -- Feature flags per plan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plan limits
INSERT INTO plan_limits (plan, max_operations, max_users, max_storage_gb, max_api_calls_per_month, features) VALUES
('free', 1, 1, 1, 1000, '{"analytics": false, "export": true, "api_access": false}'),
('starter', 5, 3, 10, 10000, '{"analytics": true, "export": true, "api_access": false}'),
('professional', 25, 10, 50, 100000, '{"analytics": true, "export": true, "api_access": true, "custom_branding": false}'),
('enterprise', 0, 0, 200, 0, '{"analytics": true, "export": true, "api_access": true, "custom_branding": true, "sso": true, "dedicated_support": true}')
ON CONFLICT (plan) DO NOTHING;

-- Add organization_id to existing tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for organization filtering
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_operations_organization ON operations(organization_id);

-- Update users table to include default organization
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_organization_id UUID REFERENCES organizations(id);

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(user_id UUID)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM user_organizations
    WHERE user_id = get_user_organization.user_id
    ORDER BY joined_at ASC
    LIMIT 1;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql;
