-- Migration: Add updated_by columns and triggers
-- Adds tracking of who last updated each record

-- Add updated_by to operations
ALTER TABLE operations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add updated_by to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add updated_by to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add updated_by to dnsh_evaluations
ALTER TABLE dnsh_evaluations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_operations_updated_by ON operations(updated_by);
CREATE INDEX IF NOT EXISTS idx_clients_updated_by ON clients(updated_by);
CREATE INDEX IF NOT EXISTS idx_assets_updated_by ON assets(updated_by);
CREATE INDEX IF NOT EXISTS idx_evaluations_updated_by ON dnsh_evaluations(updated_by);

-- Note: updated_by is set manually in application code via middleware
-- The trigger for updated_at already exists and is sufficient
