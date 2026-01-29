-- ============================================
-- DNSH Evaluator Database Schema
-- PostgreSQL Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth users
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    auth_provider VARCHAR(50) DEFAULT 'local', -- 'local', 'google', 'microsoft'
    provider_id VARCHAR(255), -- External provider user ID
    role VARCHAR(50) DEFAULT 'Evaluator', -- 'Admin', 'Evaluator', 'Reviewer', 'Viewer'
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Teams/Organizations
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Team relationships
CREATE TABLE user_teams (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Member', -- 'Owner', 'Admin', 'Member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, team_id)
);

-- Refresh tokens for JWT
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================
-- CLIENTS & OPERATIONS
-- ============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    sector VARCHAR(100),
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_name ON clients(name);

-- Operations/Deals
CREATE TABLE operations (
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
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Review', 'Compliant', 'Non-Compliant'
    substantial_contribution_id VARCHAR(50), -- DnshObjective enum
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operations_client ON operations(client_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_created_by ON operations(created_by);

-- Operation evaluation configuration
CREATE TABLE operation_evaluation_config (
    operation_id UUID PRIMARY KEY REFERENCES operations(id) ON DELETE CASCADE,
    grouping_strategy VARCHAR(50), -- 'ByAssetType', 'ByLocation', 'ByRiskProfile', 'Auto'
    evaluation_approach VARCHAR(50), -- 'Aggregated', 'Granular', 'Hybrid'
    require_evidence BOOLEAN DEFAULT true,
    include_scenario_comparison BOOLEAN DEFAULT true,
    scenario_comparison_objectives TEXT[], -- Array of DnshObjective
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ASSETS
-- ============================================

CREATE TABLE assets (
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

CREATE INDEX idx_assets_operation ON assets(operation_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_location ON assets(lat, lng);

-- Asset attributes (flexible JSON storage for various attributes)
CREATE TABLE asset_attributes (
    asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    elevation_meters DECIMAL(10, 2),
    distance_to_coast_km DECIMAL(10, 2),
    year_built INTEGER,
    flood_protection_level INTEGER,
    water_dependency VARCHAR(50), -- 'Low', 'Medium', 'High'
    temperature_tolerance_c DECIMAL(5, 2),
    nace_code VARCHAR(50),
    taxonomy_activity VARCHAR(50),
    substantial_contribution VARCHAR(50), -- DnshObjective
    site_type VARCHAR(50), -- 'Brownfield', 'Greenfield'
    materials TEXT[], -- Array of materials
    construction_year INTEGER,
    operational_year INTEGER,
    capacity DECIMAL(15, 2),
    capacity_unit VARCHAR(50),
    -- Adaptation-specific: Hazard scope (stored as JSON)
    adaptation_hazard_scope JSONB, -- { hazardId: 'In Scope' | 'Out of Scope' }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DNSH EVALUATIONS
-- ============================================

CREATE TABLE dnsh_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluator_id UUID REFERENCES users(id),
    
    -- Objective 1: Climate Change Mitigation
    mitigation_status VARCHAR(50), -- 'Compliant', 'Non-Compliant', 'Conditional', 'Not Assessed'
    mitigation_evidence TEXT[],
    mitigation_notes TEXT,
    
    -- Objective 2: Climate Change Adaptation
    adaptation_status VARCHAR(50),
    adaptation_status_pre_measures VARCHAR(50),
    adaptation_status_post_measures VARCHAR(50),
    adaptation_risk_band VARCHAR(50), -- 'Very High', 'High', 'Moderate', 'Low'
    adaptation_risk_band_pre_measures VARCHAR(50),
    adaptation_risk_band_post_measures VARCHAR(50),
    adaptation_aal DECIMAL(15, 2),
    adaptation_measures TEXT[], -- Array of measure IDs
    adaptation_notes TEXT,
    
    -- Objective 3: Water & Marine Resources
    water_status VARCHAR(50),
    water_evidence TEXT[],
    water_notes TEXT,
    
    -- Objective 4: Circular Economy
    circular_status VARCHAR(50),
    circular_evidence TEXT[],
    circular_notes TEXT,
    
    -- Objective 5: Pollution Prevention
    pollution_status VARCHAR(50),
    pollution_evidence TEXT[],
    pollution_notes TEXT,
    
    -- Objective 6: Biodiversity & Ecosystems
    biodiversity_status VARCHAR(50),
    biodiversity_evidence TEXT[],
    biodiversity_notes TEXT,
    
    -- Overall DNSH Status
    overall_status VARCHAR(50),
    overall_notes TEXT,
    
    -- Extended fields
    substantial_contribution VARCHAR(50),
    substantial_contribution_notes TEXT,
    
    -- Checklist answers (stored as JSONB for flexibility)
    checklist_answers JSONB, -- { [objective]: { [questionId]: { response, evidence, ... } } }
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_asset ON dnsh_evaluations(asset_id);
CREATE INDEX idx_evaluations_evaluator ON dnsh_evaluations(evaluator_id);
CREATE INDEX idx_evaluations_status ON dnsh_evaluations(overall_status);

-- ============================================
-- EVIDENCE DOCUMENTS
-- ============================================

CREATE TABLE evidence_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL, -- NULL for operation-level evidence
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- EvidenceType enum
    description TEXT,
    file_url TEXT NOT NULL, -- S3/Cloud Storage URL
    file_size BIGINT, -- in bytes
    mime_type VARCHAR(100),
    version VARCHAR(50) DEFAULT '1.0',
    document_date DATE,
    author VARCHAR(255),
    language VARCHAR(10),
    related_objective VARCHAR(50), -- DnshObjective
    related_question_id VARCHAR(255), -- Question ID if linked to specific question
    tags TEXT[],
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_operation ON evidence_documents(operation_id);
CREATE INDEX idx_evidence_asset ON evidence_documents(asset_id);
CREATE INDEX idx_evidence_type ON evidence_documents(type);
CREATE INDEX idx_evidence_objective ON evidence_documents(related_objective);

-- Evidence document versions (for versioning)
CREATE TABLE evidence_versions (
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

CREATE INDEX idx_evidence_versions_document ON evidence_versions(document_id);

-- ============================================
-- COLLABORATION & WORKFLOW
-- ============================================

-- Comments and discussions
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    question_id VARCHAR(255), -- For comments on specific checklist questions
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions TEXT[], -- Array of user IDs mentioned (@user)
    attachments TEXT[], -- Array of evidence document IDs
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_operation ON comments(operation_id);
CREATE INDEX idx_comments_asset ON comments(asset_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- Tasks/Assignments
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'EVALUATE', 'REVIEW', 'UPLOAD_EVIDENCE', 'COMPLETE_CHECKLIST'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'
    priority VARCHAR(50) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_operation ON tasks(operation_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'ASSIGNMENT', 'COMMENT', 'APPROVAL', 'CHANGE', 'DEADLINE'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL to related entity
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Audit log for tracking all changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
    entity_type VARCHAR(50) NOT NULL, -- 'EVALUATION', 'CHECKLIST', 'EVIDENCE', 'MEASURE', 'ASSET', 'OPERATION'
    entity_id VARCHAR(255) NOT NULL,
    changes JSONB, -- { field: { old: value, new: value } }
    comment TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_operation ON audit_logs(operation_id);
CREATE INDEX idx_audit_asset ON audit_logs(asset_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- PERMISSIONS & ACCESS CONTROL
-- ============================================

-- User permissions per operation
CREATE TABLE user_operation_permissions (
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

CREATE INDEX idx_permissions_user ON user_operation_permissions(user_id);
CREATE INDEX idx_permissions_operation ON user_operation_permissions(operation_id);

-- ============================================
-- WORKFLOW & APPROVALS
-- ============================================

-- Evaluation workflow states
CREATE TABLE evaluation_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'IN_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'ARCHIVED'
    current_step INTEGER DEFAULT 0,
    assigned_to TEXT[], -- Array of user IDs
    reviewers TEXT[], -- Array of user IDs
    approvers TEXT[], -- Array of user IDs
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

CREATE INDEX idx_workflows_operation ON evaluation_workflows(operation_id);
CREATE INDEX idx_workflows_asset ON evaluation_workflows(asset_id);
CREATE INDEX idx_workflows_status ON evaluation_workflows(status);

-- ============================================
-- CATALOGS (Measures, Hazards, etc.)
-- ============================================

-- Adaptation measures catalog
CREATE TABLE adaptation_measures (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    pathway_type VARCHAR(100),
    cost DECIMAL(15, 2),
    risk_reduction_percentage DECIMAL(5, 2),
    implementation_time JSONB, -- { planning: number, execution: number, total: number }
    maintenance_required BOOLEAN DEFAULT false,
    applicable_hazards TEXT[],
    mitigates_hazards TEXT[],
    hazard_mitigation JSONB, -- Array of { hazardId, effectiveness: { ... } }
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'approved', -- 'draft', 'approved', 'archived'
    version VARCHAR(50) DEFAULT '1.0.0',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_measures_category ON adaptation_measures(category);
CREATE INDEX idx_measures_status ON adaptation_measures(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asset_attributes_updated_at BEFORE UPDATE ON asset_attributes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON dnsh_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON evaluation_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_measures_updated_at BEFORE UPDATE ON adaptation_measures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA / SEED DATA
-- ============================================

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash is bcrypt hash of 'admin123'
INSERT INTO users (id, email, password_hash, name, role, auth_provider) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@ecoinvest.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', 'Admin User', 'Admin', 'local')
ON CONFLICT (email) DO NOTHING;
