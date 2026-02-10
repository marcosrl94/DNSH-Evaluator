-- ============================================
-- Migration 000: Enable UUID extension + Initial Schema
-- Runs before 001 (already executed) and 002
-- ============================================

-- Enable UUID extension (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    auth_provider VARCHAR(50) DEFAULT 'local',
    provider_id VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Evaluator',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_teams (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================
-- CLIENTS & OPERATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    sector VARCHAR(100),
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

CREATE TABLE IF NOT EXISTS operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sector_nace VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    capex DECIMAL(15, 2),
    deal_price DECIMAL(15, 2),
    expected_return DECIMAL(5, 2),
    risk_weighted_capital DECIMAL(15, 2),
    total_aal DECIMAL(15, 2),
    max_risk_band VARCHAR(50),
    sustainability_discount DECIMAL(5, 2),
    risk_adjustment DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'Draft',
    substantial_contribution_id VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operations_client ON operations(client_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_created_by ON operations(created_by);

CREATE TABLE IF NOT EXISTS operation_evaluation_config (
    operation_id UUID PRIMARY KEY REFERENCES operations(id) ON DELETE CASCADE,
    grouping_strategy VARCHAR(50),
    evaluation_approach VARCHAR(50),
    require_evidence BOOLEAN DEFAULT true,
    include_scenario_comparison BOOLEAN DEFAULT true,
    scenario_comparison_objectives TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    exposed_value DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_operation ON assets(operation_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(lat, lng);

CREATE TABLE IF NOT EXISTS asset_attributes (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    elevation_meters DECIMAL(10, 2),
    distance_to_coast_km DECIMAL(10, 2),
    year_built INTEGER,
    flood_protection_level INTEGER,
    water_dependency VARCHAR(50),
    temperature_tolerance_c DECIMAL(5, 2),
    nace_code VARCHAR(50),
    taxonomy_activity VARCHAR(50),
    substantial_contribution VARCHAR(50),
    site_type VARCHAR(50),
    materials TEXT[],
    construction_year INTEGER,
    operational_year INTEGER,
    capacity DECIMAL(15, 2),
    capacity_unit VARCHAR(50),
    adaptation_hazard_scope JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DNSH EVALUATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS dnsh_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluator_id UUID REFERENCES users(id),
    mitigation_status VARCHAR(50),
    mitigation_evidence TEXT[],
    mitigation_notes TEXT,
    adaptation_status VARCHAR(50),
    adaptation_status_pre_measures VARCHAR(50),
    adaptation_status_post_measures VARCHAR(50),
    adaptation_risk_band VARCHAR(50),
    adaptation_risk_band_pre_measures VARCHAR(50),
    adaptation_risk_band_post_measures VARCHAR(50),
    adaptation_aal DECIMAL(15, 2),
    adaptation_measures TEXT[],
    adaptation_notes TEXT,
    water_status VARCHAR(50),
    water_evidence TEXT[],
    water_notes TEXT,
    circular_status VARCHAR(50),
    circular_evidence TEXT[],
    circular_notes TEXT,
    pollution_status VARCHAR(50),
    pollution_evidence TEXT[],
    pollution_notes TEXT,
    biodiversity_status VARCHAR(50),
    biodiversity_evidence TEXT[],
    biodiversity_notes TEXT,
    overall_status VARCHAR(50),
    overall_notes TEXT,
    substantial_contribution VARCHAR(50),
    substantial_contribution_notes TEXT,
    checklist_answers JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluations_asset ON dnsh_evaluations(asset_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON dnsh_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON dnsh_evaluations(overall_status);

-- ============================================
-- EVIDENCE DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    version VARCHAR(50) DEFAULT '1.0',
    document_date DATE,
    author VARCHAR(255),
    language VARCHAR(10),
    related_objective VARCHAR(50),
    related_question_id VARCHAR(255),
    tags TEXT[],
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_operation ON evidence_documents(operation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_asset ON evidence_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_documents(type);
CREATE INDEX IF NOT EXISTS idx_evidence_objective ON evidence_documents(related_objective);

CREATE TABLE IF NOT EXISTS evidence_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES evidence_documents(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_versions_document ON evidence_versions(document_id);

-- ============================================
-- COLLABORATION & WORKFLOW
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    question_id VARCHAR(255),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions TEXT[],
    attachments TEXT[],
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_operation ON comments(operation_id);
CREATE INDEX IF NOT EXISTS idx_comments_asset ON comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_operation ON tasks(operation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    changes JSONB,
    comment TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_operation ON audit_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_audit_asset ON audit_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS user_operation_permissions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_review BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, operation_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_user ON user_operation_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_operation ON user_operation_permissions(operation_id);

CREATE TABLE IF NOT EXISTS evaluation_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'DRAFT',
    current_step INTEGER DEFAULT 0,
    assigned_to TEXT[],
    reviewers TEXT[],
    approvers TEXT[],
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflows_operation ON evaluation_workflows(operation_id);
CREATE INDEX IF NOT EXISTS idx_workflows_asset ON evaluation_workflows(asset_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON evaluation_workflows(status);

CREATE TABLE IF NOT EXISTS adaptation_measures (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    pathway_type VARCHAR(100),
    cost DECIMAL(15, 2),
    risk_reduction_percentage DECIMAL(5, 2),
    implementation_time JSONB,
    maintenance_required BOOLEAN DEFAULT false,
    applicable_hazards TEXT[],
    mitigates_hazards TEXT[],
    hazard_mitigation JSONB,
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'approved',
    version VARCHAR(50) DEFAULT '1.0.0',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_measures_category ON adaptation_measures(category);
CREATE INDEX IF NOT EXISTS idx_measures_status ON adaptation_measures(status);
