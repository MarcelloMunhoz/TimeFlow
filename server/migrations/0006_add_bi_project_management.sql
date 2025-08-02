-- Migration to add Business Intelligence Project Management System
-- This migration adds comprehensive BI project structure with hierarchical tasks and roadmaps

-- Create BI Stages table (top level of hierarchy)
CREATE TABLE IF NOT EXISTS bi_stages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  order_index INTEGER NOT NULL,
  estimated_duration_days INTEGER,
  is_required BOOLEAN DEFAULT true,
  best_practices TEXT, -- JSON array of best practice tips
  deliverables TEXT, -- JSON array of expected deliverables
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create BI Main Tasks table (middle level of hierarchy)
CREATE TABLE IF NOT EXISTS bi_main_tasks (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES bi_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  estimated_hours INTEGER,
  is_required BOOLEAN DEFAULT true,
  prerequisites TEXT, -- JSON array of prerequisite task IDs
  best_practices TEXT, -- JSON array of best practice tips
  deliverables TEXT, -- JSON array of expected deliverables
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create BI Subtasks table (bottom level of hierarchy)
CREATE TABLE IF NOT EXISTS bi_subtasks (
  id SERIAL PRIMARY KEY,
  main_task_id INTEGER NOT NULL REFERENCES bi_main_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  estimated_minutes INTEGER,
  is_required BOOLEAN DEFAULT true,
  skill_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
  tools TEXT, -- JSON array of recommended tools/technologies
  best_practices TEXT, -- JSON array of specific tips
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create BI Project Templates table
CREATE TABLE IF NOT EXISTS bi_project_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- "data_warehouse", "reporting", "analytics", "ml", "etl"
  complexity TEXT NOT NULL DEFAULT 'medium', -- simple, medium, complex
  estimated_duration_weeks INTEGER,
  required_skills TEXT, -- JSON array of required skills
  recommended_team_size INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create BI Template Stages junction table
CREATE TABLE IF NOT EXISTS bi_template_stages (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES bi_project_templates(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL REFERENCES bi_stages(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  custom_duration_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(template_id, stage_id)
);

-- Add new columns to existing projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES bi_project_templates(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bi_category TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_stage_id INTEGER REFERENCES bi_stages(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_start_date TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_end_date TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stakeholders TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_value TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_requirements TEXT;

-- Create Project Roadmap table
CREATE TABLE IF NOT EXISTS project_roadmap (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL REFERENCES bi_stages(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed, skipped
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  progress_percentage INTEGER DEFAULT 0,
  blockers TEXT, -- JSON array of current blockers/issues
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, stage_id)
);

-- Create Project Tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  roadmap_id INTEGER NOT NULL REFERENCES project_roadmap(id) ON DELETE CASCADE,
  main_task_id INTEGER NOT NULL REFERENCES bi_main_tasks(id) ON DELETE CASCADE,
  assigned_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'not_started',
  priority TEXT NOT NULL DEFAULT 'medium',
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  estimated_hours INTEGER,
  actual_hours INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  quality_score INTEGER,
  review_status TEXT DEFAULT 'pending',
  deliverables TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create Project Subtasks table
CREATE TABLE IF NOT EXISTS project_subtasks (
  id SERIAL PRIMARY KEY,
  project_task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  subtask_id INTEGER NOT NULL REFERENCES bi_subtasks(id) ON DELETE CASCADE,
  assigned_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'not_started',
  planned_duration_minutes INTEGER,
  actual_duration_minutes INTEGER DEFAULT 0,
  completed_at TEXT,
  quality_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bi_main_tasks_stage_id ON bi_main_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_bi_subtasks_main_task_id ON bi_subtasks(main_task_id);
CREATE INDEX IF NOT EXISTS idx_bi_template_stages_template_id ON bi_template_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_bi_template_stages_stage_id ON bi_template_stages(stage_id);
CREATE INDEX IF NOT EXISTS idx_project_roadmap_project_id ON project_roadmap(project_id);
CREATE INDEX IF NOT EXISTS idx_project_roadmap_stage_id ON project_roadmap(stage_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_roadmap_id ON project_tasks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_main_task_id ON project_tasks(main_task_id);
CREATE INDEX IF NOT EXISTS idx_project_subtasks_project_task_id ON project_subtasks(project_task_id);
CREATE INDEX IF NOT EXISTS idx_project_subtasks_subtask_id ON project_subtasks(subtask_id);
