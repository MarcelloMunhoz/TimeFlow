-- Migration to add phases and project_phases tables
-- This migration adds support for project phases/stages system

-- Create phases table
CREATE TABLE IF NOT EXISTS phases (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create project_phases junction table
CREATE TABLE IF NOT EXISTS project_phases (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  deadline TEXT, -- YYYY-MM-DD format
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, phase_id) -- Prevent duplicate phase assignments to same project
);

-- Add phase_id column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES phases(id);

-- Insert some default phases
INSERT INTO phases (name, description, color) VALUES
  ('Understanding Phase', 'Initial analysis and requirement gathering', '#3B82F6'),
  ('Solution Phase', 'Design and planning of the solution', '#10B981'),
  ('Implementation Phase', 'Development and coding work', '#F59E0B'),
  ('Testing Phase', 'Quality assurance and testing', '#EF4444'),
  ('Deployment Phase', 'Release and deployment activities', '#8B5CF6'),
  ('Maintenance Phase', 'Ongoing support and maintenance', '#6B7280')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_phase_id ON project_phases(phase_id);
CREATE INDEX IF NOT EXISTS idx_appointments_phase_id ON appointments(phase_id);
